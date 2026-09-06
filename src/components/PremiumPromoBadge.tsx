"use client";

import { PREMIUM_FEEDBACK_LABEL } from "@/lib/pricing/premium";
import { formatPrice } from "@/lib/db/schema";

export function PremiumPromoBadge(_props?: { className?: string }) {
  return null;
}

export function PremiumPriceDisplay({
  price,
  size = "md",
}: {
  price: number;
  showStrike?: boolean;
  size?: "sm" | "md" | "lg";
}) {
  const sizeClass =
    size === "lg" ? "text-[22px]" : size === "sm" ? "text-[15px]" : "text-[18px]";

  return (
    <div className="flex flex-wrap items-baseline gap-2">
      <span className={`${sizeClass} font-extrabold text-brand-500`}>
        {formatPrice(price)}원
      </span>
    </div>
  );
}

export function PremiumPriceCaption({
  price,
  note,
}: {
  price: number;
  note?: string;
}) {
  return (
    <p className="text-[12px] font-medium text-gray-500">
      {note ?? `${PREMIUM_FEEDBACK_LABEL} · ${formatPrice(price)}원`}
    </p>
  );
}
