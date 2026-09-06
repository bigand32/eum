import type { MasterCoupon, StudentCouponClaim } from "@/lib/db/schema";

export type UsableCoupon = {
  claimId: string;
  couponId: string;
  masterId: string;
  title: string;
  discountAmount: number;
  masterTitle: string;
};

export function listUsableCoupons(input: {
  studentId: string;
  masterId?: string;
  claims: StudentCouponClaim[];
  coupons: MasterCoupon[];
  masters: { id: string; title: string }[];
}): UsableCoupon[] {
  const { studentId, masterId, claims, coupons, masters } = input;
  const couponById = new Map(coupons.map((c) => [c.id, c]));
  const masterById = new Map(masters.map((m) => [m.id, m]));

  return claims
    .filter((claim) => {
      if (studentId && claim.studentId !== studentId) return false;
      if (claim.usedAt) return false;
      const coupon = couponById.get(claim.couponId);
      if (!coupon) return false;
      if (masterId && coupon.masterId !== masterId) return false;
      return true;
    })
    .map((claim) => {
      const coupon = couponById.get(claim.couponId)!;
      return {
        claimId: claim.id,
        couponId: coupon.id,
        masterId: coupon.masterId,
        title: coupon.title,
        discountAmount: coupon.discountAmount,
        masterTitle: masterById.get(coupon.masterId)?.title ?? "마스터",
      };
    })
    .sort((a, b) => b.discountAmount - a.discountAmount);
}

export function applyCouponDiscount(amount: number, discountAmount: number) {
  return Math.max(0, amount - discountAmount);
}
