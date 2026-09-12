"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { useSession } from "@/lib/auth/use-session";
import { useStudentId } from "@/lib/auth/use-student-id";
import { getMonthsContestSong } from "@/lib/contest/songs";
import {
  getContestProfile,
  getMyContestEntry,
  submitContestEntry,
} from "@/lib/contest/storage";
import { isVideoFile } from "@/lib/feedback-pricing";
import { uploadFeedbackMedia } from "@/lib/feedback-media";
import { isSupabaseConfigured } from "@/lib/supabase/config";

function readAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function ContestSubmitForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const typeParam = searchParams.get("type");
  const preferredKind: "audio" | "video" | null =
    typeParam === "video" || typeParam === "audio" ? typeParam : null;

  const studentId = useStudentId();
  const { session } = useSession();
  const month = getMonthsContestSong();

  const [nickname, setNickname] = useState("");
  const [instagram, setInstagram] = useState("");
  const [intro, setIntro] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewKind, setPreviewKind] = useState<"audio" | "video">(preferredKind ?? "audio");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const saved = getContestProfile();
    if (saved) {
      setNickname(saved.nickname);
      setInstagram(saved.instagram);
      setIntro(saved.intro);
    } else if (session?.name) {
      setNickname(session.name);
    }
    if (studentId) {
      const mine = getMyContestEntry(studentId, month.monthKey);
      if (mine) {
        setNickname(mine.nickname);
        setInstagram(mine.instagram ?? "");
        setIntro(mine.intro);
        setPreviewUrl(mine.mediaUrl);
        setPreviewKind(mine.mediaType);
      } else if (preferredKind) {
        setPreviewKind(preferredKind);
      }
    } else if (preferredKind) {
      setPreviewKind(preferredKind);
    }
  }, [session?.name, studentId, month.monthKey, preferredKind]);

  useEffect(() => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    setPreviewKind(isVideoFile(file) ? "video" : "audio");
    return () => URL.revokeObjectURL(url);
  }, [file]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!studentId) {
      setError("로그인이 필요해요.");
      return;
    }
    if (!nickname.trim()) {
      setError("닉네임을 입력해 주세요.");
      return;
    }
    if (!intro.trim()) {
      setError("자기소개를 입력해 주세요.");
      return;
    }
    if (!file && !previewUrl) {
      setError(
        preferredKind === "video"
          ? "영상을 선택해 주세요."
          : preferredKind === "audio"
            ? "음원을 선택해 주세요."
            : "영상 또는 음원을 선택해 주세요.",
      );
      return;
    }

    setBusy(true);
    setProgress(0);
    try {
      let mediaUrl = previewUrl ?? "";
      let mediaType: "audio" | "video" = "audio";

      if (file) {
        mediaType = isVideoFile(file) ? "video" : "audio";
        if (preferredKind && mediaType !== preferredKind) {
          setError(
            preferredKind === "video"
              ? "영상 파일을 선택해 주세요."
              : "음원 파일을 선택해 주세요.",
          );
          setBusy(false);
          return;
        }
        if (isSupabaseConfigured() && session?.id) {
          const uploaded = await uploadFeedbackMedia(session.id, file, setProgress);
          mediaUrl = uploaded.publicUrl;
        } else {
          mediaUrl = await readAsDataUrl(file);
          setProgress(100);
        }
      } else {
        const mine = getMyContestEntry(studentId, month.monthKey);
        mediaType = mine?.mediaType ?? preferredKind ?? "audio";
      }

      submitContestEntry({
        studentId,
        dateKey: month.monthKey,
        songTitle: month.songTitle,
        artist: month.artist,
        mediaUrl,
        mediaType,
        nickname,
        instagram,
        intro,
      });
      router.replace("/contest");
    } catch {
      setError("업로드에 실패했어요. 다시 시도해 주세요.");
    } finally {
      setBusy(false);
    }
  }

  const accept =
    preferredKind === "video"
      ? "video/*,.mp4,.mov,.webm"
      : preferredKind === "audio"
        ? "audio/*,.mp3,.m4a,.wav"
        : "audio/*,video/*,.mp3,.m4a,.mp4,.mov,.webm";

  const mediaLabel =
    preferredKind === "video" ? "영상" : preferredKind === "audio" ? "음원" : "영상 또는 음원";

  return (
    <div className="flex min-h-dvh flex-col bg-[#F5F6F8]">
      <header className="safe-top flex items-center justify-between px-5 pt-4 pb-2">
        <Link
          href="/contest"
          className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-gray-700 shadow-soft"
          aria-label="뒤로"
        >
          <i className="fa-solid fa-chevron-left text-[14px]" />
        </Link>
        <p className="text-[15px] font-bold text-gray-900">대회 출품</p>
        <div className="w-10" />
      </header>

      <form onSubmit={onSubmit} className="flex flex-1 flex-col px-5 pb-28 pt-3">
        <section className="rounded-[24px] bg-white p-5 shadow-soft">
          <p className="text-[12px] font-bold text-brand-500">이달의 출품 곡</p>
          <p className="mt-1 text-[18px] font-extrabold text-gray-900">{month.songTitle}</p>
          <p className="text-[13px] font-semibold text-gray-500">{month.artist}</p>
        </section>

        <section className="mt-3 space-y-3 rounded-[24px] bg-white p-5 shadow-soft">
          <label className="block">
            <span className="mb-1.5 block text-[13px] font-bold text-gray-600">닉네임</span>
            <input
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              maxLength={20}
              placeholder="대회에 표시될 이름"
              className="h-12 w-full rounded-[14px] border border-gray-200 bg-gray-50 px-4 text-[15px] outline-none focus:border-brand-500"
            />
          </label>

          <label className="block">
            <span className="mb-1.5 block text-[13px] font-bold text-gray-600">
              인스타 아이디 <span className="font-medium text-gray-400">(선택)</span>
            </span>
            <div className="flex h-12 items-center rounded-[14px] border border-gray-200 bg-gray-50 px-4">
              <span className="text-[15px] font-bold text-gray-400">@</span>
              <input
                value={instagram}
                onChange={(e) => setInstagram(e.target.value.replace(/^@/, ""))}
                maxLength={30}
                placeholder="instagram"
                className="ml-1 h-full flex-1 bg-transparent text-[15px] outline-none"
              />
            </div>
          </label>

          <label className="block">
            <span className="mb-1.5 block text-[13px] font-bold text-gray-600">자기소개</span>
            <textarea
              value={intro}
              onChange={(e) => setIntro(e.target.value)}
              maxLength={120}
              rows={3}
              placeholder="한 줄로 나를 소개해 주세요"
              className="w-full resize-none rounded-[14px] border border-gray-200 bg-gray-50 px-4 py-3 text-[15px] outline-none focus:border-brand-500"
            />
            <span className="mt-1 block text-right text-[11px] text-gray-400">
              {intro.length}/120
            </span>
          </label>
        </section>

        <section className="mt-3 rounded-[24px] bg-white p-5 shadow-soft">
          <p className="text-[13px] font-bold text-gray-600">{mediaLabel}</p>
          <label className="mt-3 flex cursor-pointer flex-col items-center justify-center rounded-[16px] border border-dashed border-gray-200 bg-gray-50 px-4 py-8">
            <i
              className={`fa-solid ${preferredKind === "video" ? "fa-video" : preferredKind === "audio" ? "fa-music" : "fa-cloud-arrow-up"} text-[22px] text-brand-500`}
            />
            <p className="mt-2 text-[14px] font-bold text-gray-800">{mediaLabel} 선택</p>
            <p className="mt-1 text-[12px] text-gray-400">
              {preferredKind === "video"
                ? "mp4 · mov"
                : preferredKind === "audio"
                  ? "mp3 · m4a"
                  : "mp4 · mov · m4a · mp3"}
            </p>
            <input
              type="file"
              accept={accept}
              className="hidden"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
          </label>

          {previewUrl ? (
            <div className="mt-3 overflow-hidden rounded-[16px] bg-gray-50">
              {previewKind === "video" ? (
                <video src={previewUrl} controls playsInline className="max-h-[220px] w-full" />
              ) : (
                <div className="px-3 py-4">
                  <audio src={previewUrl} controls className="w-full" />
                </div>
              )}
            </div>
          ) : null}

          {busy && progress > 0 ? (
            <div className="mt-3">
              <div className="h-1.5 overflow-hidden rounded-full bg-gray-100">
                <div
                  className="h-full rounded-full bg-brand-500 transition-[width]"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="mt-1 text-center text-[11px] text-gray-400">업로드 {progress}%</p>
            </div>
          ) : null}
        </section>

        {error ? (
          <p className="mt-3 text-center text-[13px] font-medium text-rose-500">{error}</p>
        ) : null}

        <button
          type="submit"
          disabled={busy}
          className="mt-4 flex h-14 w-full items-center justify-center rounded-full bg-brand-500 text-[16px] font-bold text-white transition active:opacity-90 disabled:opacity-50"
        >
          {busy ? "올리는 중…" : "출품하기"}
        </button>
      </form>
    </div>
  );
}

export function ContestSubmitView() {
  return (
    <Suspense fallback={<div className="min-h-dvh bg-[#F5F6F8]" />}>
      <ContestSubmitForm />
    </Suspense>
  );
}
