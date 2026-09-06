"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { useMasterId } from "@/lib/auth/use-master-id";
import { useSession } from "@/lib/auth/use-session";
import { getSession, setSession } from "@/lib/auth/session";
import { uploadMasterAvatar } from "@/lib/auth/supabase-auth";
import { ensureMasterProfile, saveMasterProfile, checkNicknameAvailable } from "@/lib/db/api";
import type { Master } from "@/lib/db/schema";
import { useDb } from "@/lib/db/use-db";
import { useDbReady } from "@/lib/db/db-provider";
import { isSupabaseConfigured } from "@/lib/supabase/config";

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("FILE_READ_FAILED"));
    reader.readAsDataURL(file);
  });
}

export function MasterProfileForm() {
  const router = useRouter();
  const db = useDb();
  const dbReady = useDbReady();
  const { session, loading: sessionLoading } = useSession();
  const masterId = useMasterId();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const heroInputRef = useRef<HTMLInputElement>(null);

  const linkedMaster = useMemo(() => {
    const byId = masterId ? db.masters.find((m) => m.id === masterId) : undefined;
    const byUser = session?.id ? db.masters.find((m) => m.userId === session.id) : undefined;
    return byId ?? byUser;
  }, [db.masters, masterId, session?.id]);

  const [master, setMaster] = useState<Master | undefined>();
  const [bootstrapping, setBootstrapping] = useState(false);
  const [bootstrapError, setBootstrapError] = useState<string | null>(null);
  const [bootstrapAttempt, setBootstrapAttempt] = useState(0);

  const [title, setTitle] = useState("");
  const [bio, setBio] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [responseTimeLabel, setResponseTimeLabel] = useState("1시간");
  const [tagsText, setTagsText] = useState("");
  const [careerText, setCareerText] = useState("");
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarDataUrl, setAvatarDataUrl] = useState<string | null>(null);
  const [heroPreview, setHeroPreview] = useState<string | null>(null);
  const [heroDataUrl, setHeroDataUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!linkedMaster) return;
    setMaster(linkedMaster);
    setBootstrapError(null);
    setTitle(linkedMaster.title);
    setBio(linkedMaster.bio);
    setPhoneNumber(linkedMaster.phoneNumber);
    setResponseTimeLabel(linkedMaster.responseTimeLabel);
    setTagsText(linkedMaster.tags.join(", "));
    setCareerText(linkedMaster.career.join("\n"));
    if (!avatarDataUrl) {
      setAvatarPreview(linkedMaster.avatarUrl);
    }
    if (!heroDataUrl) {
      setHeroPreview(linkedMaster.heroImageUrl);
    }
  }, [linkedMaster, avatarDataUrl, heroDataUrl]);

  const sessionId = session?.id;
  const sessionRole = session?.role;
  const sessionName = session?.name ?? "";
  const sessionPhone = session?.phone;

  useEffect(() => {
    if (linkedMaster || master) return;
    if (sessionLoading || !dbReady || !sessionId || sessionRole !== "master") return;

    let cancelled = false;
    setBootstrapping(true);
    setBootstrapError(null);

    void ensureMasterProfile({
      name: sessionName,
      phone: sessionPhone,
    })
      .then((next) => {
        if (cancelled) return;
        if (!next) {
          setBootstrapError("마스터 프로필을 만들지 못했어요. 다시 시도해 주세요.");
          return;
        }
        setMaster(next);
        setTitle(next.title);
        setBio(next.bio);
        setPhoneNumber(next.phoneNumber);
        setResponseTimeLabel(next.responseTimeLabel);
        setTagsText(next.tags.join(", "));
        setCareerText(next.career.join("\n"));
        setAvatarPreview(next.avatarUrl);
        setHeroPreview(next.heroImageUrl);

        const current = getSession();
        if (current && current.masterId !== next.id) {
          setSession({ ...current, masterId: next.id });
        }
      })
      .catch(() => {
        if (!cancelled) {
          setBootstrapError("마스터 프로필을 만들지 못했어요. 다시 시도해 주세요.");
        }
      })
      .finally(() => {
        if (!cancelled) setBootstrapping(false);
      });

    return () => {
      cancelled = true;
    };
  }, [
    bootstrapAttempt,
    dbReady,
    linkedMaster,
    master,
    sessionId,
    sessionLoading,
    sessionName,
    sessionPhone,
    sessionRole,
  ]);

  const activeMaster = master ?? linkedMaster;
  const isPreparing = !activeMaster && (bootstrapping || sessionLoading || !dbReady);

  if (isPreparing) {
    return (
      <>
        <PageHeader title="프로필 수정" backHref="/master/settings" />
        <main className="p-6 text-center text-gray-400">프로필을 준비하는 중...</main>
      </>
    );
  }

  if (!activeMaster) {
    return (
      <>
        <PageHeader title="프로필 수정" backHref="/master/settings" />
        <main className="p-6 text-center text-gray-400">
          {bootstrapError ?? "마스터 프로필을 불러올 수 없어요."}
          <button
            type="button"
            onClick={() => setBootstrapAttempt((n) => n + 1)}
            className="mt-3 block w-full text-[14px] font-bold text-brand-500"
          >
            다시 시도
          </button>
          <Link href="/master/settings" className="mt-3 block text-brand-500">
            설정으로
          </Link>
        </main>
      </>
    );
  }

  const handleImageChange = async (
    file: File | null | undefined,
    kind: "avatar" | "hero",
  ) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setMessage("이미지 파일만 선택할 수 있어요.");
      return;
    }
    const maxMb = kind === "hero" ? 8 : 5;
    if (file.size > maxMb * 1024 * 1024) {
      setMessage(`${kind === "hero" ? "배경" : "사진"}은 ${maxMb}MB 이하로 올려 주세요.`);
      return;
    }
    try {
      const dataUrl = await readFileAsDataUrl(file);
      if (kind === "avatar") {
        setAvatarDataUrl(dataUrl);
        setAvatarPreview(dataUrl);
      } else {
        setHeroDataUrl(dataUrl);
        setHeroPreview(dataUrl);
      }
      setMessage(null);
    } catch {
      setMessage("이미지를 불러오지 못했어요.");
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const nextTitle = title.trim();
      if (!nextTitle) {
        setMessage("활동명을 입력해 주세요.");
        setSaving(false);
        return;
      }
      const available = await checkNicknameAvailable(
        nextTitle,
        "master_title",
        activeMaster.id,
      );
      if (!available) {
        setMessage("이미 사용 중인 활동명이에요.");
        setSaving(false);
        return;
      }

      let avatarUrl: string | undefined;
      let heroImageUrl: string | undefined;

      if (avatarDataUrl) {
        avatarUrl = isSupabaseConfigured()
          ? await uploadMasterAvatar(avatarDataUrl)
          : avatarDataUrl;
      }
      if (heroDataUrl) {
        heroImageUrl = isSupabaseConfigured()
          ? await uploadMasterAvatar(heroDataUrl)
          : heroDataUrl;
      }

      await saveMasterProfile(activeMaster.id, {
        title: nextTitle,
        bio: bio.trim(),
        phoneNumber: phoneNumber.trim(),
        responseTimeLabel: responseTimeLabel.trim(),
        tags: tagsText
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean),
        career: careerText
          .split("\n")
          .map((c) => c.trim())
          .filter(Boolean),
        ...(avatarUrl ? { avatarUrl } : {}),
        ...(heroImageUrl ? { heroImageUrl } : {}),
      });
      setMessage("저장되었어요.");
      router.push("/master/settings");
    } catch {
      setMessage("저장에 실패했어요. 사진 용량이나 네트워크를 확인해 주세요.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <PageHeader title="프로필 수정" backHref="/master/settings" />
      <main className="flex flex-col gap-4 p-5 pb-28">
        <div className="overflow-hidden rounded-[20px] border border-gray-100 bg-white shadow-soft">
          <button
            type="button"
            onClick={() => heroInputRef.current?.click()}
            className="relative block h-36 w-full bg-gray-100"
          >
            {heroPreview ? (
              <img src={heroPreview} alt="" className="h-full w-full object-cover" />
            ) : (
              <span className="flex h-full w-full items-center justify-center text-gray-300">
                <i className="fa-solid fa-image text-[28px]" />
              </span>
            )}
            <span className="absolute inset-x-0 bottom-0 bg-black/45 py-1.5 text-center text-[11px] font-bold text-white">
              배경 사진 변경
            </span>
          </button>
          <input
            ref={heroInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              void handleImageChange(e.target.files?.[0], "hero");
              e.target.value = "";
            }}
          />

          <div className="flex items-center gap-4 p-4">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="relative h-20 w-20 shrink-0 overflow-hidden rounded-full border border-gray-200 bg-surface"
            >
              {avatarPreview ? (
                <img src={avatarPreview} alt="" className="h-full w-full object-cover" />
              ) : (
                <span className="flex h-full w-full items-center justify-center text-gray-300">
                  <i className="fa-solid fa-user text-[22px]" />
                </span>
              )}
              <span className="absolute inset-x-0 bottom-0 bg-black/45 py-1 text-center text-[10px] font-bold text-white">
                변경
              </span>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                void handleImageChange(e.target.files?.[0], "avatar");
                e.target.value = "";
              }}
            />
            <div>
              <p className="text-[14px] font-bold text-gray-900">프로필 · 배경 사진</p>
              <p className="mt-1 text-[12px] leading-relaxed text-gray-500">
                위는 상세 페이지 배경, 아래는 프로필 사진이에요.
                <br />
                각각 따로 바꿀 수 있어요.
              </p>
            </div>
          </div>
        </div>

        <label className="block">
          <span className="mb-1.5 block text-[13px] font-bold text-gray-600">표시 이름</span>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full rounded-xl border border-gray-200 px-4 py-3 text-[14px] outline-none focus:border-brand-500"
          />
        </label>

        <label className="block">
          <span className="mb-1.5 block text-[13px] font-bold text-gray-600">전화번호</span>
          <input
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
            className="w-full rounded-xl border border-gray-200 px-4 py-3 text-[14px] outline-none focus:border-brand-500"
          />
        </label>

        <label className="block">
          <span className="mb-1.5 block text-[13px] font-bold text-gray-600">응답 시간 라벨</span>
          <input
            value={responseTimeLabel}
            onChange={(e) => setResponseTimeLabel(e.target.value)}
            placeholder="예: 30분"
            className="w-full rounded-xl border border-gray-200 px-4 py-3 text-[14px] outline-none focus:border-brand-500"
          />
        </label>

        <label className="block">
          <span className="mb-1.5 block text-[13px] font-bold text-gray-600">태그 (쉼표 구분)</span>
          <input
            value={tagsText}
            onChange={(e) => setTagsText(e.target.value)}
            className="w-full rounded-xl border border-gray-200 px-4 py-3 text-[14px] outline-none focus:border-brand-500"
          />
        </label>

        <label className="block">
          <span className="mb-1.5 block text-[13px] font-bold text-gray-600">소개</span>
          <textarea
            rows={4}
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            className="w-full resize-none rounded-xl border border-gray-200 px-4 py-3 text-[14px] outline-none focus:border-brand-500"
          />
        </label>

        <label className="block">
          <span className="mb-1.5 block text-[13px] font-bold text-gray-600">경력 (줄바꿈)</span>
          <textarea
            rows={4}
            value={careerText}
            onChange={(e) => setCareerText(e.target.value)}
            className="w-full resize-none rounded-xl border border-gray-200 px-4 py-3 text-[14px] outline-none focus:border-brand-500"
          />
        </label>

        {message && <p className="text-center text-[13px] text-brand-500">{message}</p>}

        <button
          type="button"
          disabled={saving}
          onClick={() => void handleSave()}
          className="h-14 rounded-[16px] bg-gray-900 text-[16px] font-bold text-white disabled:opacity-50"
        >
          {saving ? "저장 중..." : "저장하기"}
        </button>
      </main>
    </>
  );
}
