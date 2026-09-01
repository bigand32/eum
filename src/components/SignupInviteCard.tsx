"use client";

import { useMemo, useState } from "react";
import { copySignupInviteLink, getSignupInviteMessage, getSignupInviteUrl } from "@/lib/invite";

export function SignupInviteCard() {
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState<string | null>(null);

  const inviteUrl = useMemo(() => {
    if (typeof window === "undefined") return "/signup";
    return getSignupInviteUrl(window.location.origin);
  }, []);

  const inviteMessage = useMemo(() => {
    if (typeof window === "undefined") return "[eum] 보컬 코칭 회원가입\n/signup";
    return getSignupInviteMessage(window.location.origin);
  }, []);

  const handleCopy = async () => {
    setCopyError(null);
    try {
      await copySignupInviteLink(window.location.origin);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      setCopyError("복사에 실패했어요. 링크를 길게 눌러 복사해 주세요.");
    }
  };

  return (
    <section className="rounded-[20px] border border-brand-100 bg-brand-50/50 p-5">
      <div className="mb-3 flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-500 text-white">
          <i className="fa-solid fa-link text-[14px]" />
        </div>
        <div>
          <h3 className="text-[16px] font-bold text-gray-900">업체 단톡방 · 회원가입 링크</h3>
          <p className="mt-1 text-[12px] leading-relaxed font-medium text-gray-600">
            카카오톡 단톡방에 아래 링크를 붙여 넣어 수강생을 초대하세요.
          </p>
        </div>
      </div>

      <div className="rounded-[14px] border border-brand-100 bg-white p-4">
        <p className="mb-2 text-[11px] font-bold tracking-wide text-brand-500 uppercase">
          초대 메시지
        </p>
        <p className="whitespace-pre-wrap text-[13px] leading-relaxed font-medium text-gray-800">
          {inviteMessage}
        </p>
        <p className="mt-3 break-all text-[12px] font-semibold text-gray-500">{inviteUrl}</p>
      </div>

      {copyError && (
        <p className="mt-3 text-[12px] font-medium text-red-500">{copyError}</p>
      )}

      <button
        type="button"
        onClick={() => void handleCopy()}
        className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-[14px] bg-gray-900 text-[14px] font-bold text-white hover:bg-gray-800"
      >
        <i className={`fa-solid ${copied ? "fa-check" : "fa-copy"} text-[13px]`} />
        {copied ? "복사 완료!" : "단톡방용 링크 복사"}
      </button>
    </section>
  );
}
