"use client";

import {
  getPremiumFeedbackPricing,
  getPremiumPromoBannerText,
  PREMIUM_FEEDBACK_LABEL,
} from "@/lib/pricing/premium";
import { formatPrice } from "@/lib/db/schema";

export function PremiumPromoBadge({ className = "" }: { className?: string }) {
  const pricing = getPremiumFeedbackPricing();
  const banner = getPremiumPromoBannerText(pricing);
  if (!banner) return null;

  return (
    <div
      className={`inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1 text-[11px] font-bold text-amber-800 ${className}`}
    >
      <i className="fa-solid fa-bolt text-[10px]" />
      {banner}
    </div>
  );
}

export function PremiumPriceDisplay({
  showStrike = true,
  size = "md",
}: {
  showStrike?: boolean;
  size?: "sm" | "md" | "lg";
}) {
  const pricing = getPremiumFeedbackPricing();
  const sizeClass =
    size === "lg" ? "text-[22px]" : size === "sm" ? "text-[15px]" : "text-[18px]";

  return (
    <div className="flex flex-wrap items-baseline gap-2">
      <span className={`${sizeClass} font-extrabold text-brand-500`}>
        {formatPrice(pricing.price)}원
      </span>
      {pricing.isPromoActive && showStrike && (
        <span className="text-[13px] font-semibold text-gray-400 line-through">
          {formatPrice(pricing.regularPrice)}원
        </span>
      )}
      {pricing.isPromoActive && (
        <span className="rounded-md bg-red-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
          얼리버드
        </span>
      )}
    </div>
  );
}

export function PremiumPriceCaption() {
  const pricing = getPremiumFeedbackPricing();

  if (pricing.isPromoActive) {
    return (
      <p className="text-[12px] font-medium text-gray-500">
        {PREMIUM_FEEDBACK_LABEL} · 10월 30일 이후 {formatPrice(pricing.regularPrice)}원으로
        자동 변경
      </p>
    );
  }

  if (pricing.isPromoUpcoming) {
    return (
      <p className="text-[12px] font-medium text-gray-500">
        9월 15일부터 {formatPrice(pricing.promoPrice)}원 얼리버드 (10/30까지)
      </p>
    );
  }

  return (
    <p className="text-[12px] font-medium text-gray-500">
      {PREMIUM_FEEDBACK_LABEL} · {formatPrice(pricing.regularPrice)}원
    </p>
  );
}
