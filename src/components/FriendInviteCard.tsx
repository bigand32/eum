"use client";

import { useEffect, useState, type ReactNode } from "react";
import {
  copyFriendInviteCode,
  copyFriendInviteLink,
  getFriendInviteCode,
  getFriendInviteMessage,
  getFriendInviteUrl,
} from "@/lib/invite";

const REWARD_POINTS = 1000;

type Props = {
  studentId: string;
};

export function FriendInviteCard({ studentId }: Props) {
  const code = getFriendInviteCode(studentId);
  const [origin, setOrigin] = useState("");
  const [copied, setCopied] = useState<"code" | "link" | null>(null);

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  async function flash(kind: "code" | "link") {
    setCopied(kind);
    window.setTimeout(() => setCopied(null), 1600);
  }

  async function handleCopyCode() {
    await copyFriendInviteCode(code);
    await flash("code");
  }

  async function handleCopyLink() {
    if (!origin) return;
    await copyFriendInviteLink(origin, code);
    await flash("link");
  }

  async function handleKakao() {
    if (!origin) return;
    const message = getFriendInviteMessage(origin, code);
    await copyTextFallback(message);
    await flash("link");
    window.open(
      `https://story.kakao.com/share?url=${encodeURIComponent(getFriendInviteUrl(origin, code))}`,
      "_blank",
      "noopener,noreferrer",
    );
  }

  async function handleFacebook() {
    if (!origin) return;
    const url = getFriendInviteUrl(origin, code);
    window.open(
      `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
      "_blank",
      "noopener,noreferrer",
    );
  }

  async function handleInstagram() {
    if (!origin) return;
    await copyFriendInviteLink(origin, code);
    await flash("link");
  }

  async function handleMore() {
    if (!origin) return;
    const message = getFriendInviteMessage(origin, code);
    const url = getFriendInviteUrl(origin, code);
    if (navigator.share) {
      try {
        await navigator.share({ title: "eum 친구 초대", text: message, url });
        return;
      } catch {
        /* cancelled */
      }
    }
    await copyFriendInviteLink(origin, code);
    await flash("link");
  }

  return (
    <section className="shadow-soft rounded-[20px] border border-gray-100 bg-white px-5 py-5">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-[16px] font-bold tracking-tight text-gray-800">친구 초대하기</h3>
        <button
          type="button"
          onClick={() => void handleCopyCode()}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-brand-500 px-3.5 py-1.5 text-[13px] font-bold tracking-wider text-white transition hover:bg-brand-600 active:scale-[0.98]"
          aria-label="추천인 코드 복사"
        >
          {code}
          <i className="fa-regular fa-copy text-[11px] opacity-90" aria-hidden />
        </button>
      </div>

      <div className="mt-5 flex items-center justify-center gap-3.5 sm:gap-4">
        <ShareIconButton
          label="카카오톡"
          onClick={() => void handleKakao()}
          className="bg-[#FEE500] text-[#3C1E1E]"
        >
          <i className="fa-solid fa-comment text-[18px]" aria-hidden />
        </ShareIconButton>
        <ShareIconButton
          label="페이스북"
          onClick={() => void handleFacebook()}
          className="bg-[#1877F2] text-white"
        >
          <i className="fa-brands fa-facebook-f text-[17px]" aria-hidden />
        </ShareIconButton>
        <ShareIconButton
          label="인스타그램"
          onClick={() => void handleInstagram()}
          className="bg-gradient-to-br from-[#f58529] via-[#dd2a7b] to-[#8134af] text-white"
        >
          <i className="fa-brands fa-instagram text-[18px]" aria-hidden />
        </ShareIconButton>
        <ShareIconButton
          label="링크 복사"
          onClick={() => void handleCopyLink()}
          className="bg-gray-100 text-gray-500"
        >
          <i className="fa-solid fa-link text-[15px]" aria-hidden />
        </ShareIconButton>
        <ShareIconButton
          label="더보기"
          onClick={() => void handleMore()}
          className="bg-gray-100 text-gray-500"
        >
          <i className="fa-solid fa-ellipsis text-[16px]" aria-hidden />
        </ShareIconButton>
      </div>

      <p className="mt-4 text-center text-[12px] font-medium leading-relaxed text-gray-400">
        {copied === "code"
          ? "추천인 코드를 복사했어요"
          : copied === "link"
            ? "초대 링크를 복사했어요"
            : `친구가 내 추천인 코드로 가입하면 ${REWARD_POINTS.toLocaleString()}P GET!`}
      </p>
    </section>
  );
}

function ShareIconButton({
  label,
  onClick,
  className,
  children,
}: {
  label: string;
  onClick: () => void;
  className: string;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={`flex h-11 w-11 items-center justify-center rounded-full transition active:scale-95 ${className}`}
    >
      {children}
    </button>
  );
}

async function copyTextFallback(text: string) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }
  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand("copy");
  document.body.removeChild(textarea);
}
