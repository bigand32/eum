"use client";

import { useEffect, useMemo, useState } from "react";
import { formatPrice } from "@/lib/db/schema";
import { useDb } from "@/lib/db/use-db";
import { useStudentId } from "@/lib/auth/use-student-id";
import { applyCouponDiscount, listUsableCoupons } from "@/lib/coupon-utils";
import { getPaymentModeNotice, isLivePaymentEnabled } from "@/lib/payment/fake-payment";

export type FakePaymentResult = {
  amount: number;
  claimId?: string;
};

export function MvpPaymentNotice() {
  return (
    <p className="rounded-xl border border-amber-100 bg-amber-50 px-3 py-2 text-[12px] leading-relaxed text-amber-800">
      <i className="fa-solid fa-flask mr-1" />
      {getPaymentModeNotice()}
    </p>
  );
}

export function FakePaymentSheet({
  open,
  productLabel,
  amount,
  masterId,
  processing,
  onClose,
  onConfirm,
}: {
  open: boolean;
  productLabel: string;
  amount: number;
  masterId?: string;
  processing?: boolean;
  onClose: () => void;
  onConfirm: (result: FakePaymentResult) => void;
}) {
  const db = useDb();
  const studentId = useStudentId();
  const [claimId, setClaimId] = useState<string | null>(null);

  const coupons = useMemo(
    () =>
      masterId
        ? listUsableCoupons({
            studentId,
            masterId,
            claims: db.studentCouponClaims,
            coupons: db.masterCoupons,
            masters: db.masters,
          })
        : [],
    [masterId, studentId, db.studentCouponClaims, db.masterCoupons, db.masters],
  );

  useEffect(() => {
    if (!open) setClaimId(null);
  }, [open]);

  if (!open) return null;

  const selected = coupons.find((c) => c.claimId === claimId);
  const finalAmount = selected
    ? applyCouponDiscount(amount, selected.discountAmount)
    : amount;
  const discount = amount - finalAmount;

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center">
      <button
        type="button"
        aria-label="닫기"
        className="absolute inset-0 bg-black/40"
        onClick={() => !processing && onClose()}
      />
      <div className="relative max-h-[85dvh] w-full max-w-[400px] overflow-y-auto rounded-t-[24px] bg-white px-5 pt-5 pb-8 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-[17px] font-bold text-gray-900">결제 확인</h3>
          <span
            className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${
              isLivePaymentEnabled()
                ? "bg-green-100 text-green-700"
                : "bg-amber-100 text-amber-700"
            }`}
          >
            {isLivePaymentEnabled() ? "결제" : "테스트 결제"}
          </span>
        </div>

        <div className="mb-4 rounded-[16px] border border-gray-100 bg-surface p-4">
          <p className="mb-1 text-[13px] font-medium text-gray-500">{productLabel}</p>
          {discount > 0 && (
            <p className="text-[13px] font-medium text-gray-400 line-through">
              {formatPrice(amount)}원
            </p>
          )}
          <p className="text-[24px] font-extrabold tracking-tight text-gray-900">
            {formatPrice(finalAmount)}
            <span className="ml-0.5 text-[16px] font-bold">원</span>
          </p>
          {discount > 0 && (
            <p className="mt-1 text-[12px] font-bold text-brand-500">
              쿠폰 할인 -{formatPrice(discount)}원
            </p>
          )}
        </div>

        {masterId && (
          <div className="mb-4">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-[13px] font-bold text-gray-700">쿠폰 적용</p>
              {claimId && (
                <button
                  type="button"
                  disabled={processing}
                  onClick={() => setClaimId(null)}
                  className="text-[12px] font-medium text-gray-400"
                >
                  적용 취소
                </button>
              )}
            </div>
            {coupons.length === 0 ? (
              <p className="rounded-xl border border-dashed border-gray-200 px-3 py-3 text-[12px] text-gray-400">
                이 마스터에게 쓸 수 있는 쿠폰이 없어요
              </p>
            ) : (
              <div className="flex flex-col gap-2">
                {coupons.map((coupon) => {
                  const selectedCoupon = claimId === coupon.claimId;
                  return (
                    <button
                      key={coupon.claimId}
                      type="button"
                      disabled={processing}
                      onClick={() =>
                        setClaimId(selectedCoupon ? null : coupon.claimId)
                      }
                      className={`rounded-xl border px-3.5 py-3 text-left transition-colors ${
                        selectedCoupon
                          ? "border-gray-900 bg-gray-900 text-white"
                          : "border-gray-200 bg-white hover:border-gray-300"
                      }`}
                    >
                      <p
                        className={`text-[13px] font-bold ${
                          selectedCoupon ? "text-white" : "text-gray-900"
                        }`}
                      >
                        {coupon.title}
                      </p>
                      <p
                        className={`mt-0.5 text-[12px] font-medium ${
                          selectedCoupon ? "text-white/70" : "text-gray-500"
                        }`}
                      >
                        {formatPrice(coupon.discountAmount)}원 할인
                      </p>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        <MvpPaymentNotice />

        <div className="mt-5 flex gap-2">
          <button
            type="button"
            disabled={processing}
            onClick={onClose}
            className="flex-1 rounded-[14px] border border-gray-200 py-3.5 text-[15px] font-bold text-gray-600 disabled:opacity-50"
          >
            취소
          </button>
          <button
            type="button"
            disabled={processing}
            onClick={() =>
              onConfirm({
                amount: finalAmount,
                claimId: claimId ?? undefined,
              })
            }
            className="flex-1 rounded-[14px] bg-gray-900 py-3.5 text-[15px] font-bold text-white disabled:opacity-50"
          >
            {processing
              ? "처리 중..."
              : isLivePaymentEnabled()
                ? "결제하기"
                : "테스트 결제하기"}
          </button>
        </div>
      </div>
    </div>
  );
}
