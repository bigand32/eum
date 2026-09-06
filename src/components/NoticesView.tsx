"use client";

import { PageHeader } from "@/components/PageHeader";

const NOTICES = [
  {
    id: "1",
    title: "eum 서비스 이용 안내",
    date: "2026.09.01",
    body: "피드백·전화·방문 상담과 온라인 강의를 한곳에서 이용할 수 있어요. 결제 전 마스터 요금을 확인해 주세요.",
  },
  {
    id: "2",
    title: "쿠폰 다운로드 및 사용 안내",
    date: "2026.08.20",
    body: "마스터 프로필에서 쿠폰을 받은 뒤, 결제 시 적용할 수 있습니다. 사용한 쿠폰은 내 쿠폰함에서 확인할 수 있어요.",
  },
  {
    id: "3",
    title: "개인정보 처리 관련 안내",
    date: "2026.08.01",
    body: "연습 영상과 상담 내용은 서비스 제공 목적으로만 사용되며, 관련 법령에 따라 안전하게 관리됩니다.",
  },
] as const;

export function NoticesView() {
  return (
    <>
      <PageHeader title="공지사항" backHref="/mypage" />
      <main className="flex flex-col gap-3 p-5 pb-28">
        {NOTICES.map((notice) => (
          <article
            key={notice.id}
            className="rounded-[16px] border border-gray-100 bg-white p-4 shadow-soft"
          >
            <div className="mb-2 flex items-center justify-between gap-3">
              <h2 className="text-[14px] font-bold text-gray-900">{notice.title}</h2>
              <time className="shrink-0 text-[11px] text-gray-400">{notice.date}</time>
            </div>
            <p className="text-[13px] leading-relaxed text-gray-600">{notice.body}</p>
          </article>
        ))}
      </main>
    </>
  );
}
