export const PREMIUM_FEEDBACK_LABEL = "프리미엄 피드백";
export const PREMIUM_FEEDBACK_REGULAR_PRICE = 69000;
export const PREMIUM_FEEDBACK_PROMO_PRICE = 39000;

/** @deprecated use getPremiumFeedbackPricing().price */
export const PREMIUM_FEEDBACK_PRICE = PREMIUM_FEEDBACK_REGULAR_PRICE;

/** KST 2026-09-15 00:00 */
export const PREMIUM_PROMO_START = new Date("2026-09-15T00:00:00+09:00");
/** KST 2026-10-30 23:59:59.999 */
export const PREMIUM_PROMO_END = new Date("2026-10-30T23:59:59.999+09:00");

export type PremiumFeedbackPricing = {
  price: number;
  regularPrice: number;
  promoPrice: number;
  isPromoActive: boolean;
  isPromoUpcoming: boolean;
  isPromoEnded: boolean;
};

export function getPremiumFeedbackPricing(at: Date = new Date()): PremiumFeedbackPricing {
  const isPromoActive = at >= PREMIUM_PROMO_START && at <= PREMIUM_PROMO_END;
  const isPromoUpcoming = at < PREMIUM_PROMO_START;
  const isPromoEnded = at > PREMIUM_PROMO_END;

  return {
    price: isPromoActive ? PREMIUM_FEEDBACK_PROMO_PRICE : PREMIUM_FEEDBACK_REGULAR_PRICE,
    regularPrice: PREMIUM_FEEDBACK_REGULAR_PRICE,
    promoPrice: PREMIUM_FEEDBACK_PROMO_PRICE,
    isPromoActive,
    isPromoUpcoming,
    isPromoEnded,
  };
}

export function getPremiumPromoBannerText(pricing = getPremiumFeedbackPricing()): string | null {
  if (pricing.isPromoActive) {
    return `얼리버드 ${pricing.promoPrice.toLocaleString("ko-KR")}원 · 10월 30일까지 · 이후 ${pricing.regularPrice.toLocaleString("ko-KR")}원`;
  }
  if (pricing.isPromoUpcoming) {
    return `9월 15일부터 얼리버드 ${pricing.promoPrice.toLocaleString("ko-KR")}원 (10/30까지)`;
  }
  return null;
}

export function getPremiumPriceNote(pricing = getPremiumFeedbackPricing()): string {
  if (pricing.isPromoActive) {
    return "10월 30일 이후 자동으로 69,000원";
  }
  if (pricing.isPromoUpcoming) {
    return "9/15 ~ 10/30 얼리버드 39,000원";
  }
  return "프리미엄 피드백";
}
