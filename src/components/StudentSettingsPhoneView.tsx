"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/PageHeader";
import { useSession } from "@/lib/auth/use-session";
import { normalizePhone } from "@/lib/auth/phone";
import { updateStudentPhone } from "@/lib/auth/student-settings";

export function StudentSettingsPhoneView() {
  const router = useRouter();
  const { session } = useSession();
  const [phone, setPhone] = useState(session?.phone ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const result = await updateStudentPhone(phone);
    setBusy(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    setPhone(normalizePhone(phone));
    setDone(true);
    window.setTimeout(() => router.back(), 700);
  }

  return (
    <>
      <PageHeader title="휴대폰 번호" backHref="/mypage/settings" />
      <main className="px-5 py-6 pb-28">
        <p className="mb-5 text-[13px] leading-relaxed text-gray-500">
          예약·연락에 쓰이는 번호예요. 가입 때 받은 번호를 수정할 수 있어요.
        </p>
        <form onSubmit={(e) => void onSave(e)} className="space-y-4">
          <label className="block">
            <span className="mb-1.5 block text-[13px] font-bold text-gray-600">휴대폰 번호</span>
            <input
              value={phone}
              onChange={(e) => {
                setPhone(e.target.value);
                setDone(false);
              }}
              inputMode="tel"
              placeholder="010-0000-0000"
              className="h-12 w-full rounded-[14px] border border-gray-200 bg-white px-4 text-[15px] outline-none focus:border-brand-500"
            />
          </label>
          {error ? <p className="text-[13px] font-medium text-rose-500">{error}</p> : null}
          {done ? <p className="text-[13px] font-medium text-emerald-600">저장했어요</p> : null}
          <button
            type="submit"
            disabled={busy}
            className="flex h-14 w-full items-center justify-center rounded-full bg-brand-500 text-[16px] font-bold text-white disabled:opacity-50"
          >
            {busy ? "저장 중…" : "저장하기"}
          </button>
        </form>
      </main>
    </>
  );
}
