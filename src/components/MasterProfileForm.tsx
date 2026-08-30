"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { useMasterId } from "@/lib/auth/use-master-id";
import { saveMasterProfile } from "@/lib/db/api";
import { useDb } from "@/lib/db/use-db";

export function MasterProfileForm() {
  const router = useRouter();
  const db = useDb();
  const masterId = useMasterId();
  const master = db.masters.find((m) => m.id === masterId);

  const [title, setTitle] = useState(master?.title ?? "");
  const [bio, setBio] = useState(master?.bio ?? "");
  const [phoneNumber, setPhoneNumber] = useState(master?.phoneNumber ?? "");
  const [responseTimeLabel, setResponseTimeLabel] = useState(master?.responseTimeLabel ?? "1시간");
  const [tagsText, setTagsText] = useState(master?.tags.join(", ") ?? "");
  const [careerText, setCareerText] = useState(master?.career.join("\n") ?? "");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  if (!master) {
    return (
      <main className="p-6 text-center text-gray-400">
        마스터 프로필을 불러올 수 없어요.
        <Link href="/master/settings" className="mt-3 block text-brand-500">
          설정으로
        </Link>
      </main>
    );
  }

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);
    try {
      await saveMasterProfile(masterId, {
        title: title.trim(),
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
      });
      setMessage("저장되었어요.");
      router.push("/master/settings");
    } catch {
      setMessage("저장에 실패했어요.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <PageHeader title="프로필 수정" backHref="/master/settings" />
      <main className="flex flex-col gap-4 p-5 pb-28">
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
