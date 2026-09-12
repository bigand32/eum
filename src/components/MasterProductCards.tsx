"use client";

import { useEffect, useState } from "react";
import { useDb } from "@/lib/db/use-db";
import { formatPrice } from "@/lib/db/schema";
import { PremiumPriceDisplay } from "@/components/PremiumPromoBadge";
import { PREMIUM_FEEDBACK_LABEL } from "@/lib/pricing/premium";

const SERVICE_GUIDE = [
  {
    key: "feedback",
    label: PREMIUM_FEEDBACK_LABEL,
    desc: "연습 영상·음성을 올리면, 마스터가 타임스탬프 코멘트로 짚어주는 비대면 피드백이에요.",
  },
  {
    key: "feedback-additional",
    label: "추가 피드백",
    desc: "이미 받은 뒤 한 번 더 보낼 때 적용되는 금액이에요.",
  },
  {
    key: "phone-15",
    label: "전화 상담 (15분)",
    desc: "짧은 전화로 고민을 바로 물어보는 1:1 실시간 상담이에요. 발성·곡 선택 같은 빠른 체크에 좋아요.",
  },
  {
    key: "phone-30",
    label: "전화 상담 (30분)",
    desc: "조금 더 길게 연습 방향·레퍼토리·입시 전략까지 깊게 이야기하는 전화 코칭이에요.",
  },
] as const;

export function MasterProductCards({ masterId }: { masterId: string }) {
  const db = useDb();
  const [guideOpen, setGuideOpen] = useState(false);
  const master = db.masters.find((m) => m.id === masterId);

  useEffect(() => {
    if (!guideOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setGuideOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [guideOpen]);

  if (!master) return null;

  const { pricing } = master;
  const guideItems = [
    ...SERVICE_GUIDE,
    {
      key: "visit",
      label: `방문 상담 (${pricing.visitDurationMin}분)`,
      desc: "마스터를 직접 만나 자세·발성·호흡을 현장에서 교정받는 대면 레슨이에요.",
    },
  ];

  const additionalPrice = pricing.feedbackAdditionalPrice || pricing.feedbackPrice;

  const rows = [
    {
      key: "feedback",
      label: PREMIUM_FEEDBACK_LABEL,
      isPremium: true,
    },
    {
      key: "feedback-additional",
      label: "추가 피드백",
      price: `${formatPrice(additionalPrice)}원`,
    },
    {
      key: "phone-15",
      label: "전화 상담 (15분)",
      price: `${formatPrice(pricing.phonePrice15Min)}원`,
    },
    {
      key: "phone-30",
      label: "전화 상담 (30분)",
      price: `${formatPrice(pricing.phonePrice30Min)}원`,
    },
    {
      key: "visit",
      label: `방문 상담 (${pricing.visitDurationMin}분)`,
      price: `${formatPrice(pricing.visitPrice)}원`,
    },
  ] as const;

  return (
    <>
      <div className="mb-4 flex items-center gap-1.5 pr-6">
        <h3 className="text-[17px] font-bold tracking-tight text-gray-900">서비스</h3>
        <button
          type="button"
          onClick={() => setGuideOpen(true)}
          aria-label="서비스 설명 보기"
          className="flex h-6 w-6 items-center justify-center rounded-full text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
        >
          <i className="fa-solid fa-circle-info text-[14px]" />
        </button>
      </div>

      <div className="mr-6 overflow-hidden rounded-[16px] border border-gray-100 bg-white">
        {rows.map((row, i) => (
          <div
            key={row.key}
            className={`flex items-center justify-between gap-4 px-4 py-3.5 ${
              i > 0 ? "border-t border-gray-50" : ""
            }`}
          >
            <p className="min-w-0 text-[14px] font-bold text-gray-900">{row.label}</p>
            <div className="shrink-0 text-right">
              {"isPremium" in row && row.isPremium ? (
                <PremiumPriceDisplay price={pricing.feedbackPrice} size="sm" />
              ) : (
                "price" in row && (
                  <p className="text-[14px] font-bold tracking-tight text-gray-900">{row.price}</p>
                )
              )}
            </div>
          </div>
        ))}
      </div>

      {guideOpen && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center">
          <button
            type="button"
            aria-label="닫기"
            className="absolute inset-0 bg-black/40"
            onClick={() => setGuideOpen(false)}
          />
          <div className="relative z-10 w-full max-w-[400px] rounded-t-[24px] bg-white px-5 pb-10 pt-5 shadow-xl">
            <div className="mb-5 flex items-center justify-between">
              <h4 className="text-[17px] font-bold text-gray-900">서비스 안내</h4>
              <button
                type="button"
                onClick={() => setGuideOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-surface text-gray-500"
              >
                <i className="fa-solid fa-xmark" />
              </button>
            </div>
            <div className="flex flex-col gap-4">
              {guideItems.map((item) => (
                <div key={item.key}>
                  <p className="text-[14px] font-bold text-gray-900">{item.label}</p>
                  <p className="mt-1 text-[13px] leading-relaxed text-gray-500">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
