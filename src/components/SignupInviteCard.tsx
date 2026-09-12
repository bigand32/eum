"use client";

import { useMemo, useState } from "react";
import { BRAND_NAME } from "@/lib/brand";
import {
  copySignupInviteLink,
  getSignupInviteMessage,
  getSignupInviteUrl,
} from "@/lib/invite";

export function SignupInviteCard() {
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState<string | null>(null);

  const inviteUrl = useMemo(() => {
    if (typeof window === "undefined") return "/signup";
    return getSignupInviteUrl(window.location.origin);
  }, []);

  const inviteMessage = useMemo(() => {
    if (typeof window === "undefined") return `[${BRAND_NAME}] 보컬 코칭 회원가입\n/signup`;
    return getSignupInviteMessage(window.location.origin);
  }, []);

  const messageTitle =
    inviteMessage.split("\n")[0] ?? `[${BRAND_NAME}] 보컬 코칭 회원가입`;

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
    <section className="overflow-hidden rounded-[24px] border border-brand-100 bg-gradient-to-br from-brand-50 via-white to-brand-50/40 p-5 shadow-[0_8px_24px_rgba(49,130,246,0.06)]">
      <div className="mb-4 flex items-start gap-3.5">
        <div className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-brand-500 text-white shadow-[0_8px_16px_rgba(49,130,246,0.28)]">
          <i className="fa-solid fa-link text-[15px]" />
        </div>
        <div className="min-w-0 pt-0.5">
          <h3 className="text-[16px] font-extrabold tracking-tight text-gray-900">
            업체 단톡방 · 회원가입 링크
          </h3>
          <p className="mt-1 text-[13px] leading-relaxed text-gray-500">
            카카오톡 단톡방에 아래 메시지를 붙여 넣어 수강생을 초대하세요.
          </p>
        </div>
      </div>

      <div className="rounded-[18px] border border-gray-100 bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-[11px] font-bold tracking-wide text-brand-500">초대 메시지</p>
          <span className="rounded-full bg-surface px-2 py-0.5 text-[10px] font-bold text-gray-400">
            미리보기
          </span>
        </div>
        <p className="text-[15px] font-bold tracking-tight text-gray-900">{messageTitle}</p>
        <p className="mt-2 break-all rounded-[12px] bg-surface px-3 py-2.5 font-mono text-[12px] leading-relaxed text-gray-600">
          {inviteUrl}
        </p>
      </div>

      {copyError && (
        <p className="mt-3 text-[12px] font-medium text-red-500">{copyError}</p>
      )}

      <button
        type="button"
        onClick={() => void handleCopy()}
        className={`mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-full text-[14px] font-bold text-white transition-all active:scale-[0.99] ${
          copied
            ? "bg-green-600 shadow-[0_8px_20px_rgba(22,163,74,0.25)]"
            : "bg-gray-900 shadow-[0_8px_20px_rgba(17,24,39,0.18)] hover:bg-gray-800"
        }`}
      >
        <i className={`fa-solid ${copied ? "fa-check" : "fa-copy"} text-[13px]`} />
        {copied ? "복사 완료!" : "단톡방용 링크 복사"}
      </button>
    </section>
  );
}
