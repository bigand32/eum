"use client";

import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";

const CHANNELS = [
  {
    icon: "fa-comment-dots",
    label: "채팅 문의",
    desc: "평일 10:00 – 18:00",
    href: "mailto:help@eum.app?subject=eum%20문의",
  },
  {
    icon: "fa-envelope",
    label: "이메일",
    desc: "help@eum.app",
    href: "mailto:help@eum.app",
  },
] as const;

export function CustomerCenterView() {
  return (
    <>
      <PageHeader title="고객센터" backHref="/mypage" />
      <main className="flex flex-col gap-5 p-5 pb-28">
        <section className="rounded-[20px] border border-gray-100 bg-white p-5 shadow-soft">
          <p className="text-[15px] font-bold text-gray-900">무엇을 도와드릴까요?</p>
          <p className="mt-1 text-[13px] leading-relaxed text-gray-500">
            결제·예약·피드백 관련 문의는 아래 채널로 남겨 주세요.
          </p>
        </section>

        <section className="overflow-hidden rounded-[20px] border border-gray-100 bg-white shadow-soft">
          {CHANNELS.map((item, i) => (
            <a
              key={item.label}
              href={item.href}
              className={`flex items-center gap-4 p-5 ${
                i < CHANNELS.length - 1 ? "border-b border-gray-50" : ""
              }`}
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-50 text-brand-500">
                <i className={`fa-solid ${item.icon}`} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[15px] font-bold text-gray-900">{item.label}</p>
                <p className="text-[12px] text-gray-400">{item.desc}</p>
              </div>
              <i className="fa-solid fa-chevron-right text-[12px] text-gray-300" />
            </a>
          ))}
        </section>

        <Link
          href="/mypage/faq"
          className="rounded-[16px] border border-gray-100 bg-surface px-4 py-3.5 text-center text-[13px] font-bold text-gray-700"
        >
          자주 묻는 질문 보기
        </Link>
      </main>
    </>
  );
}
