"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/PageHeader";
import { useSession } from "@/lib/auth/use-session";
import { canChangePassword, updateStudentPassword } from "@/lib/auth/student-settings";

export function StudentSettingsPasswordView() {
  const router = useRouter();
  const { session } = useSession();
  const [currentPassword, setCurrentPassword] = useState("");
  const [nextPassword, setNextPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  if (!canChangePassword(session)) {
    return (
      <>
        <PageHeader title="비밀번호 변경" backHref="/mypage/settings" />
        <main className="px-5 py-10 text-center text-[14px] text-gray-500">
          이메일 가입 계정만 비밀번호를 변경할 수 있어요.
        </main>
      </>
    );
  }

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (nextPassword !== confirmPassword) {
      setError("새 비밀번호 확인이 같지 않아요.");
      return;
    }
    setBusy(true);
    const result = await updateStudentPassword({ currentPassword, nextPassword });
    setBusy(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    setDone(true);
    setCurrentPassword("");
    setNextPassword("");
    setConfirmPassword("");
    window.setTimeout(() => router.back(), 700);
  }

  const fieldClass =
    "h-12 w-full rounded-[14px] border border-gray-200 bg-white px-4 text-[15px] outline-none focus:border-brand-500";

  return (
    <>
      <PageHeader title="비밀번호 변경" backHref="/mypage/settings" />
      <main className="px-5 py-6 pb-28">
        <p className="mb-5 text-[13px] leading-relaxed text-gray-500">
          이메일({session?.email})로 가입한 계정의 비밀번호를 바꿔요.
        </p>
        <form onSubmit={(e) => void onSave(e)} className="space-y-4">
          <label className="block">
            <span className="mb-1.5 block text-[13px] font-bold text-gray-600">현재 비밀번호</span>
            <input
              type="password"
              autoComplete="current-password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className={fieldClass}
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-[13px] font-bold text-gray-600">새 비밀번호</span>
            <input
              type="password"
              autoComplete="new-password"
              value={nextPassword}
              onChange={(e) => setNextPassword(e.target.value)}
              placeholder="8자 이상"
              className={fieldClass}
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-[13px] font-bold text-gray-600">새 비밀번호 확인</span>
            <input
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className={fieldClass}
            />
          </label>
          {error ? <p className="text-[13px] font-medium text-rose-500">{error}</p> : null}
          {done ? <p className="text-[13px] font-medium text-emerald-600">변경했어요</p> : null}
          <button
            type="submit"
            disabled={busy}
            className="flex h-14 w-full items-center justify-center rounded-full bg-brand-500 text-[16px] font-bold text-white disabled:opacity-50"
          >
            {busy ? "변경 중…" : "비밀번호 변경"}
          </button>
        </form>
      </main>
    </>
  );
}
