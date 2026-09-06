"use client";

import { useState } from "react";
import Link from "next/link";
import { claimMasterCoupon } from "@/lib/db/api";
import { formatPrice } from "@/lib/db/schema";
import { useDb } from "@/lib/db/use-db";
import { useStudentId } from "@/lib/auth/use-student-id";
import { useSession } from "@/lib/auth/use-session";

export function MasterCouponDownloadSection({ masterId }: { masterId: string }) {
  const db = useDb();
  const studentId = useStudentId();
  const { session } = useSession();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  // 수량 소진 · 종료된 쿠폰은 목록에서 제외 → 섹션 자체도 사라짐
  const coupons = db.masterCoupons.filter(
    (c) => c.masterId === masterId && c.isActive && c.remainingQuantity > 0,
  );

  const claimedIds = new Set(
    db.studentCouponClaims
      .filter((c) => !studentId || c.studentId === studentId)
      .map((c) => c.couponId),
  );

  if (coupons.length === 0) return null;

  const handleClaim = async (couponId: string) => {
    if (session?.role !== "student") {
      setToast("수강생 계정으로 로그인하면 받을 수 있어요.");
      return;
    }
    if (claimedIds.has(couponId)) {
      setToast("이미 받은 쿠폰이에요.");
      return;
    }

    setBusyId(couponId);
    setToast(null);
    try {
      await claimMasterCoupon(couponId);
      setToast("쿠폰을 받았어요!");
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      if (message.includes("ALREADY_CLAIMED")) setToast("이미 받은 쿠폰이에요.");
      else if (message.includes("SOLD_OUT")) setToast("방금 소진됐어요.");
      else setToast("쿠폰 받기에 실패했어요.");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <section className="border-b border-gray-50 py-8 pl-6">
      <div className="mb-4 pr-6">
        <h3 className="text-[17px] font-bold tracking-tight text-gray-900">받을 수 있는 쿠폰</h3>
      </div>

      <div className="mr-6 flex flex-col gap-3">
        {coupons.map((coupon) => {
          const claimed = claimedIds.has(coupon.id);
          return (
            <div
              key={coupon.id}
              className="flex items-center justify-between gap-3 rounded-[18px] border border-gray-100 bg-white px-4 py-3.5 shadow-soft"
            >
              <div className="min-w-0">
                <p className="truncate text-[14px] font-bold text-gray-900">{coupon.title}</p>
                <p className="mt-0.5 text-[16px] font-extrabold text-gray-900">
                  {formatPrice(coupon.discountAmount)}원 할인
                </p>
                <p className="mt-0.5 text-[11px] font-medium text-gray-400">
                  남은 수량 {coupon.remainingQuantity}장
                </p>
              </div>
                {claimed ? (
                  <Link
                    href="/mypage/coupons"
                    className="shrink-0 rounded-xl bg-gray-100 px-4 py-2.5 text-[13px] font-bold text-gray-700"
                  >
                    내 쿠폰
                  </Link>
                ) : (
                  <button
                    type="button"
                    disabled={busyId === coupon.id}
                    onClick={() => void handleClaim(coupon.id)}
                    className="shrink-0 rounded-xl bg-gray-900 px-4 py-2.5 text-[13px] font-bold text-white disabled:bg-gray-200 disabled:text-gray-400"
                  >
                    {busyId === coupon.id ? "받는 중" : "받기"}
                  </button>
                )}
            </div>
          );
        })}
      </div>

      {toast && (
        <p className="mt-3 pr-6 text-center text-[13px] font-medium text-gray-500">{toast}</p>
      )}
    </section>
  );
}
