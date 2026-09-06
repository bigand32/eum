"use client";

import { useMemo, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { createMasterCoupon, deactivateMasterCoupon } from "@/lib/db/api";
import { formatPrice, type MasterCoupon, type StudentCouponClaim } from "@/lib/db/schema";
import { useMasterId } from "@/lib/auth/use-master-id";
import { useDb } from "@/lib/db/use-db";
import { getStudentName } from "@/lib/master-utils";

function formatClaimDate(iso: string) {
  const d = new Date(iso);
  return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export function MasterCouponForm() {
  const db = useDb();
  const masterId = useMasterId();
  const coupons = db.masterCoupons
    .filter((c) => c.masterId === masterId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const claimsByCoupon = useMemo(() => {
    const map = new Map<string, StudentCouponClaim[]>();
    for (const claim of db.studentCouponClaims) {
      const list = map.get(claim.couponId) ?? [];
      list.push(claim);
      map.set(claim.couponId, list);
    }
    for (const [id, list] of map) {
      list.sort(
        (a, b) => new Date(b.claimedAt).getTime() - new Date(a.claimedAt).getTime(),
      );
      map.set(id, list);
    }
    return map;
  }, [db.studentCouponClaims]);

  const [title, setTitle] = useState("첫 피드백 할인");
  const [discountAmount, setDiscountAmount] = useState(5000);
  const [totalQuantity, setTotalQuantity] = useState(20);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const handleCreate = async () => {
    if (!masterId) {
      setMessage("마스터 프로필이 연결되지 않았어요.");
      return;
    }
    if (discountAmount < 1000 || totalQuantity < 1) {
      setMessage("할인 금액과 발급 수량을 확인해 주세요.");
      return;
    }

    setSaving(true);
    setMessage(null);
    try {
      await createMasterCoupon({
        masterId,
        title,
        discountAmount,
        totalQuantity,
      });
      setMessage("쿠폰을 발급했어요. 프로필에 바로 노출됩니다.");
    } catch {
      setMessage("쿠폰 발급에 실패했어요.");
    } finally {
      setSaving(false);
    }
  };

  const handleDeactivate = async (couponId: string) => {
    try {
      await deactivateMasterCoupon(couponId);
    } catch {
      setMessage("쿠폰 종료에 실패했어요.");
    }
  };

  return (
    <>
      <PageHeader title="쿠폰 발급" backHref="/master/settings" />
      <main className="flex flex-col gap-6 p-5 pb-28">
        <section className="rounded-[20px] border border-gray-100 bg-white p-5 shadow-soft">
          <h2 className="mb-1 text-[16px] font-extrabold text-gray-900">새 쿠폰 만들기</h2>
          <p className="mb-4 text-[13px] text-gray-500">
            할인 금액과 수량을 정하면 상세 프로필에 다운로드 쿠폰으로 보여요.
          </p>

          <label className="mb-3 block">
            <span className="mb-1.5 block text-[13px] font-bold text-gray-600">쿠폰 이름</span>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-xl border border-gray-200 px-4 py-3 text-[14px] outline-none focus:border-gray-400"
              placeholder="예: 첫 피드백 5,000원 할인"
            />
          </label>

          <label className="mb-3 block">
            <span className="mb-1.5 block text-[13px] font-bold text-gray-600">할인 금액 (원)</span>
            <input
              type="number"
              min={1000}
              step={1000}
              value={discountAmount}
              onChange={(e) => setDiscountAmount(Number(e.target.value) || 0)}
              className="w-full rounded-xl border border-gray-200 px-4 py-3 text-[14px] outline-none focus:border-gray-400"
            />
          </label>

          <label className="mb-4 block">
            <span className="mb-1.5 block text-[13px] font-bold text-gray-600">발급 수량</span>
            <input
              type="number"
              min={1}
              value={totalQuantity}
              onChange={(e) => setTotalQuantity(Number(e.target.value) || 0)}
              className="w-full rounded-xl border border-gray-200 px-4 py-3 text-[14px] outline-none focus:border-gray-400"
            />
            <p className="mt-1.5 text-[12px] text-gray-400">
              수량이 소진되면 프로필에서 자동으로 사라집니다.
            </p>
          </label>

          {message && <p className="mb-3 text-center text-[13px] text-gray-500">{message}</p>}

          <button
            type="button"
            disabled={saving || !masterId}
            onClick={() => void handleCreate()}
            className="h-12 w-full rounded-[14px] bg-gray-900 text-[15px] font-bold text-white disabled:opacity-50"
          >
            {saving ? "발급 중..." : "쿠폰 발급하기"}
          </button>
        </section>

        <section>
          <h2 className="mb-3 text-[16px] font-extrabold text-gray-900">내 쿠폰</h2>
          {coupons.length === 0 ? (
            <div className="rounded-[20px] border border-gray-100 bg-white p-6 text-center text-[13px] text-gray-400">
              아직 발급한 쿠폰이 없어요
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {coupons.map((coupon) => (
                <CouponCard
                  key={coupon.id}
                  coupon={coupon}
                  claims={claimsByCoupon.get(coupon.id) ?? []}
                  expanded={expandedId === coupon.id}
                  onToggle={() =>
                    setExpandedId((cur) => (cur === coupon.id ? null : coupon.id))
                  }
                  onDeactivate={() => void handleDeactivate(coupon.id)}
                  getName={(studentId) => getStudentName(db, studentId)}
                />
              ))}
            </div>
          )}
        </section>
      </main>
    </>
  );
}

function CouponCard({
  coupon,
  claims,
  expanded,
  onToggle,
  onDeactivate,
  getName,
}: {
  coupon: MasterCoupon;
  claims: StudentCouponClaim[];
  expanded: boolean;
  onToggle: () => void;
  onDeactivate: () => void;
  getName: (studentId: string) => string;
}) {
  const soldOut = coupon.remainingQuantity <= 0;
  const hidden = !coupon.isActive || soldOut;
  const downloaded = coupon.totalQuantity - coupon.remainingQuantity;

  return (
    <div className="overflow-hidden rounded-[18px] border border-gray-100 bg-white shadow-soft">
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <button type="button" onClick={onToggle} className="min-w-0 flex-1 text-left">
            <p className="text-[15px] font-bold text-gray-900">{coupon.title}</p>
            <p className="mt-1 text-[18px] font-extrabold text-gray-900">
              {formatPrice(coupon.discountAmount)}원 할인
            </p>
            <p className="mt-1 text-[12px] text-gray-500">
              남은 수량 {coupon.remainingQuantity}/{coupon.totalQuantity}
              {hidden ? " · 비노출" : " · 노출 중"}
            </p>
            <p className="mt-1 flex items-center gap-1 text-[12px] font-medium text-gray-400">
              다운로드 {downloaded}명
              <i
                className={`fa-solid fa-chevron-down text-[9px] transition-transform ${
                  expanded ? "rotate-180" : ""
                }`}
              />
            </p>
          </button>
          {coupon.isActive && !soldOut && (
            <button
              type="button"
              onClick={onDeactivate}
              className="shrink-0 rounded-lg border border-gray-200 px-3 py-1.5 text-[12px] font-bold text-gray-600"
            >
              종료
            </button>
          )}
        </div>
      </div>

      {expanded && (
        <div className="border-t border-gray-50 px-4 py-3">
          <p className="mb-2 text-[12px] font-bold text-gray-500">다운로드한 수강생</p>
          {claims.length === 0 ? (
            <p className="py-4 text-center text-[13px] text-gray-400">아직 받은 사람이 없어요</p>
          ) : (
            <div className="flex flex-col gap-2">
              {claims.map((claim) => (
                <div
                  key={claim.id}
                  className="flex items-center justify-between rounded-xl bg-surface px-3 py-2.5"
                >
                  <span className="text-[13px] font-bold text-gray-800">
                    {getName(claim.studentId)}
                  </span>
                  <span className="text-[11px] font-medium tabular-nums text-gray-400">
                    {formatClaimDate(claim.claimedAt)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
