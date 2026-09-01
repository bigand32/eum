"use client";

import { useDb } from "@/lib/db/use-db";
import { formatPrice } from "@/lib/db/schema";
import { PremiumPriceDisplay, PremiumPromoBadge } from "@/components/PremiumPromoBadge";
import { PREMIUM_FEEDBACK_LABEL } from "@/lib/pricing/premium";

export function MasterProductCards({ masterId }: { masterId: string }) {
  const db = useDb();
  const master = db.masters.find((m) => m.id === masterId);
  if (!master) return null;

  const { pricing } = master;

  const rows = [
    {
      key: "feedback",
      label: PREMIUM_FEEDBACK_LABEL,
      note: "9/15~10/30 얼리버드 · 이후 자동 69,000원",
      isPremium: true,
      primary: true,
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
    <div className="mr-6 overflow-hidden rounded-[20px] border border-gray-100 bg-white">
      {rows.map((row, i) => (
        <div
          key={row.key}
          className={`flex items-start justify-between gap-4 px-5 py-4 ${
            i > 0 ? "border-t border-gray-50" : ""
          } ${"primary" in row && row.primary ? "bg-brand-50/40" : ""}`}
        >
          <div className="min-w-0 flex-1">
            <p className="text-[14px] font-bold text-gray-900">{row.label}</p>
            {"note" in row && row.note && (
              <p className="mt-1 text-[12px] font-medium text-gray-500">{row.note}</p>
            )}
            {"isPremium" in row && row.isPremium && (
              <div className="mt-2">
                <PremiumPromoBadge />
              </div>
            )}
          </div>
          {"isPremium" in row && row.isPremium ? (
            <PremiumPriceDisplay size="sm" />
          ) : (
            "price" in row && (
              <p className="shrink-0 text-[15px] font-extrabold tracking-tight text-gray-900">
                {row.price}
              </p>
            )
          )}
        </div>
      ))}
    </div>
  );
}
