"use client";

import { formatPrice } from "@/lib/db/schema";

export function MvpPaymentNotice() {
  return (
    <p className="rounded-xl border border-amber-100 bg-amber-50 px-3 py-2 text-[12px] leading-relaxed text-amber-800">
      <i className="fa-solid fa-flask mr-1" />
      MVP 테스트 모드 — 실제 결제는 진행되지 않아요.
    </p>
  );
}

export function FakePaymentSheet({
  open,
  productLabel,
  amount,
  processing,
  onClose,
  onConfirm,
}: {
  open: boolean;
  productLabel: string;
  amount: number;
  processing?: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center">
      <button
        type="button"
        aria-label="닫기"
        className="absolute inset-0 bg-black/40"
        onClick={() => !processing && onClose()}
      />
      <div className="relative w-full max-w-[400px] rounded-t-[24px] bg-white px-5 pt-5 pb-8 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-[17px] font-bold text-gray-900">결제 확인</h3>
          <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-bold text-amber-700">
            테스트 결제
          </span>
        </div>

        <div className="mb-4 rounded-[16px] border border-gray-100 bg-surface p-4">
          <p className="mb-1 text-[13px] font-medium text-gray-500">{productLabel}</p>
          <p className="text-[24px] font-extrabold tracking-tight text-gray-900">
            {formatPrice(amount)}
            <span className="ml-0.5 text-[16px] font-bold">원</span>
          </p>
        </div>

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
            onClick={onConfirm}
            className="flex-1 rounded-[14px] bg-gray-900 py-3.5 text-[15px] font-bold text-white disabled:opacity-50"
          >
            {processing ? "처리 중..." : "테스트 결제하기"}
          </button>
        </div>
      </div>
    </div>
  );
}
