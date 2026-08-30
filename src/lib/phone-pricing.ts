import type { MasterPricing } from "@/lib/db/schema";

export const PHONE_DURATIONS = [15, 30] as const;
export type PhoneDurationMin = (typeof PHONE_DURATIONS)[number];

export function getPhonePrice(pricing: MasterPricing, durationMin: PhoneDurationMin): number {
  return durationMin === 15 ? pricing.phonePrice15Min : pricing.phonePrice30Min;
}

export function getPhoneDurationLabel(durationMin: PhoneDurationMin) {
  return `전화 상담 (${durationMin}분)`;
}
