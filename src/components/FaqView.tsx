"use client";

import { useState } from "react";
import { PageHeader } from "@/components/PageHeader";

const FAQ_ITEMS = [
  {
    q: "피드백은 얼마나 걸리나요?",
    a: "마스터마다 다르지만, 보통 24시간 이내에 타임스탬프 코멘트가 도착해요. 프로필의 응답 시간 라벨을 참고해 주세요.",
  },
  {
    q: "예약 취소·변경은 어떻게 하나요?",
    a: "예약 내역에서 해당 일정을 확인한 뒤 고객센터로 문의해 주세요. 시작 전까지 변경이 가능합니다.",
  },
  {
    q: "쿠폰은 어디서 쓰나요?",
    a: "피드백·전화·방문·온라인 강의 결제 화면에서 보유 쿠폰을 골라 적용할 수 있어요.",
  },
  {
    q: "연습 영상은 어디에 저장되나요?",
    a: "업로드한 영상은 안전하게 보관되며, 피드백 요청과 연습 일지에서 다시 확인할 수 있어요.",
  },
  {
    q: "온라인 강의는 환불이 되나요?",
    a: "수강 시작 전 고객센터로 문의해 주세요. 시청 이력이 있으면 환불 정책에 따라 안내드려요.",
  },
] as const;

export function FaqView() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <>
      <PageHeader title="FAQ" backHref="/mypage" />
      <main className="flex flex-col gap-3 p-5 pb-28">
        {FAQ_ITEMS.map((item, i) => {
          const open = openIndex === i;
          return (
            <div
              key={item.q}
              className="overflow-hidden rounded-[16px] border border-gray-100 bg-white shadow-soft"
            >
              <button
                type="button"
                onClick={() => setOpenIndex(open ? null : i)}
                className="flex w-full items-start gap-3 p-4 text-left"
              >
                <span className="mt-0.5 text-[13px] font-extrabold text-brand-500">Q</span>
                <span className="min-w-0 flex-1 text-[14px] font-bold text-gray-900">
                  {item.q}
                </span>
                <i
                  className={`fa-solid fa-chevron-down mt-1 text-[11px] text-gray-300 transition-transform ${
                    open ? "rotate-180" : ""
                  }`}
                />
              </button>
              {open && (
                <div className="border-t border-gray-50 px-4 pb-4 pt-3">
                  <p className="pl-6 text-[13px] leading-relaxed text-gray-600">{item.a}</p>
                </div>
              )}
            </div>
          );
        })}
      </main>
    </>
  );
}
