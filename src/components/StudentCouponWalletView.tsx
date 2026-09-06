"use client";

import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { useDb } from "@/lib/db/use-db";
import { useStudentId } from "@/lib/auth/use-student-id";
import { formatPrice } from "@/lib/db/schema";
import { matchesStudentScope } from "@/lib/student-utils";

function formatClaimedAt(iso: string) {
  const d = new Date(iso);
  return `${d.getFullYear()}.${d.getMonth() + 1}.${d.getDate()}`;
}

export function StudentCouponWalletView() {
  const db = useDb();
  const studentId = useStudentId();

  const items = db.studentCouponClaims
    .filter((c) => matchesStudentScope(studentId, c.studentId))
    .map((claim) => {
      const coupon = db.masterCoupons.find((c) => c.id === claim.couponId);
      const master = coupon
        ? db.masters.find((m) => m.id === coupon.masterId)
        : undefined;
      return { claim, coupon, master };
    })
    .filter((row) => row.coupon)
    .sort(
      (a, b) =>
        new Date(b.claim.claimedAt).getTime() - new Date(a.claim.claimedAt).getTime(),
    );

  const available = items.filter((row) => !row.claim.usedAt);
  const used = items.filter((row) => row.claim.usedAt);

  return (
    <>
      <PageHeader title="쿠폰함" backHref="/mypage" />
      <main className="flex flex-col gap-6 p-5 pb-28">
        <section>
          <h2 className="mb-3 text-[15px] font-bold text-gray-900">
            사용 가능
            <span className="ml-1.5 text-[13px] font-medium text-gray-400">
              {available.length}
            </span>
          </h2>
          {available.length === 0 ? (
            <div className="rounded-[20px] border border-dashed border-gray-200 bg-white p-8 text-center">
              <p className="text-[14px] text-gray-400">아직 받은 쿠폰이 없어요</p>
              <Link
                href="/search"
                className="mt-3 inline-block text-[13px] font-bold text-brand-500"
              >
                마스터 찾아 쿠폰 받기
              </Link>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {available.map(({ claim, coupon, master }) => (
                <div
                  key={claim.id}
                  className="rounded-[20px] border border-gray-100 bg-white p-4 shadow-soft"
                >
                  <p className="text-[12px] font-medium text-gray-400">
                    {master?.title ?? "마스터"}
                  </p>
                  <p className="mt-1 text-[15px] font-bold text-gray-900">
                    {coupon!.title}
                  </p>
                  <p className="mt-1 text-[20px] font-extrabold text-gray-900">
                    {formatPrice(coupon!.discountAmount)}원 할인
                  </p>
                  <p className="mt-2 text-[11px] text-gray-400">
                    {formatClaimedAt(claim.claimedAt)} 받음 · 결제 시 적용 가능
                  </p>
                  <Link
                    href={`/masters/${coupon!.masterId}`}
                    className="mt-3 flex w-full items-center justify-center rounded-xl bg-gray-900 py-2.5 text-[13px] font-bold text-white"
                  >
                    이 마스터에서 쓰기
                  </Link>
                </div>
              ))}
            </div>
          )}
        </section>

        {used.length > 0 && (
          <section>
            <h2 className="mb-3 text-[15px] font-bold text-gray-900">
              사용 완료
              <span className="ml-1.5 text-[13px] font-medium text-gray-400">
                {used.length}
              </span>
            </h2>
            <div className="flex flex-col gap-3">
              {used.map(({ claim, coupon, master }) => (
                <div
                  key={claim.id}
                  className="rounded-[20px] border border-gray-100 bg-gray-50 p-4 opacity-70"
                >
                  <p className="text-[12px] font-medium text-gray-400">
                    {master?.title ?? "마스터"}
                  </p>
                  <p className="mt-1 text-[14px] font-bold text-gray-600">
                    {coupon!.title}
                  </p>
                  <p className="mt-0.5 text-[13px] font-medium text-gray-400">
                    {formatPrice(coupon!.discountAmount)}원 · 사용 완료
                  </p>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>
    </>
  );
}
