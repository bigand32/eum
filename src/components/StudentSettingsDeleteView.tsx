"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/PageHeader";
import { deleteStudentAccount } from "@/lib/auth/student-settings";

export function StudentSettingsDeleteView() {
  const router = useRouter();
  const [confirmText, setConfirmText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onDelete() {
    if (confirmText.trim() !== "탈퇴") {
      setError("확인을 위해 '탈퇴'를 입력해 주세요.");
      return;
    }
    if (!window.confirm("정말 탈퇴할까요? 이 작업은 되돌릴 수 없어요.")) return;
    setBusy(true);
    setError(null);
    const result = await deleteStudentAccount();
    setBusy(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    router.replace("/login");
  }

  return (
    <>
      <PageHeader title="회원 탈퇴" backHref="/mypage/settings" />
      <main className="px-5 py-6 pb-28">
        <section className="rounded-[20px] border border-rose-100 bg-rose-50/60 p-5">
          <p className="text-[15px] font-extrabold text-rose-600">탈퇴 전에 확인해 주세요</p>
          <ul className="mt-3 list-disc space-y-1.5 pl-4 text-[13px] leading-relaxed text-rose-700/90">
            <li>계정 정보가 삭제되고 로그인할 수 없어요</li>
            <li>연습 기록·피드백 이용이 중단될 수 있어요</li>
            <li>진행 중 예약이 있다면 먼저 취소해 주세요</li>
          </ul>
        </section>

        <label className="mt-6 block">
          <span className="mb-1.5 block text-[13px] font-bold text-gray-600">
            확인 문구 <span className="font-medium text-gray-400">탈퇴</span> 입력
          </span>
          <input
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder="탈퇴"
            className="h-12 w-full rounded-[14px] border border-gray-200 bg-white px-4 text-[15px] outline-none focus:border-brand-500"
          />
        </label>

        {error ? <p className="mt-3 text-[13px] font-medium text-rose-500">{error}</p> : null}

        <button
          type="button"
          disabled={busy}
          onClick={() => void onDelete()}
          className="mt-6 flex h-14 w-full items-center justify-center rounded-full bg-rose-500 text-[16px] font-bold text-white disabled:opacity-50"
        >
          {busy ? "처리 중…" : "회원 탈퇴하기"}
        </button>
      </main>
    </>
  );
}
