"use client";

import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { useDb } from "@/lib/db/use-db";
import { useStudentId } from "@/lib/auth/use-student-id";
import { formatPrice } from "@/lib/db/schema";
import { getPhoneDurationLabel } from "@/lib/phone-pricing";

type PaymentItem = {
  id: string;
  date: string;
  label: string;
  masterName: string;
  amount: number;
  status: string;
  href?: string;
};

function formatPaidAt(iso: string) {
  const d = new Date(iso);
  return `${d.getFullYear()}.${d.getMonth() + 1}.${d.getDate()}`;
}

export function PaymentHistoryView() {
  const db = useDb();
  const studentId = useStudentId();

  const items: PaymentItem[] = [
    ...db.feedbackOrders
      .filter((o) => o.studentId === studentId)
      .map((o) => {
        const master = db.masters.find((m) => m.id === o.masterId);
        const extra = o.extraDurationFee ?? 0;
        return {
          id: o.id,
          date: o.paidAt ?? o.createdAt,
          label: "음성/영상 피드백",
          masterName: master?.title ?? "마스터",
          amount: o.priceAtPurchase + extra,
          status:
            o.status === "completed"
              ? "완료"
              : o.status === "paid" || o.status === "in_review"
                ? "진행중"
                : "취소",
          href: o.status === "completed" ? `/feedback/${o.id}` : undefined,
        };
      }),
    ...db.reservations
      .filter((r) => r.studentId === studentId)
      .map((r) => {
        const master = db.masters.find((m) => m.id === r.masterId);
        const label =
          r.type === "phone"
            ? getPhoneDurationLabel((r.durationMin ?? 30) as 15 | 30)
            : `방문 상담 (${r.durationMin ?? master?.pricing.visitDurationMin ?? 60}분)`;
        return {
          id: r.id,
          date: r.createdAt,
          label,
          masterName: master?.title ?? "마스터",
          amount: r.priceAtPurchase,
          status: r.status === "scheduled" ? "예약됨" : r.status === "completed" ? "완료" : "취소",
          href: "/reservation",
        };
      }),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <>
      <PageHeader title="결제 내역" backHref="/mypage" />
      <main className="flex flex-col gap-3 p-5 pb-28">
        {items.length === 0 ? (
          <div className="rounded-[20px] border border-gray-100 bg-white p-8 text-center">
            <p className="text-[14px] font-medium text-gray-400">결제 내역이 없어요</p>
            <Link href="/search" className="mt-3 inline-block text-[13px] font-bold text-brand-500">
              마스터 찾아보기
            </Link>
          </div>
        ) : (
          items.map((item) => {
            const inner = (
              <div className="shadow-soft flex items-center justify-between gap-4 rounded-[20px] border border-gray-100 bg-white p-4">
                <div className="min-w-0 flex-1">
                  <p className="mb-1 text-[12px] font-medium text-gray-400">
                    {formatPaidAt(item.date)}
                  </p>
                  <h3 className="mb-0.5 truncate text-[15px] font-bold text-gray-900">
                    {item.label}
                  </h3>
                  <p className="truncate text-[13px] text-gray-500">{item.masterName}</p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-[16px] font-extrabold text-gray-900">
                    {formatPrice(item.amount)}원
                  </p>
                  <span
                    className={`mt-1 inline-block rounded-md px-2 py-0.5 text-[11px] font-bold ${
                      item.status === "완료"
                        ? "bg-surface text-gray-600"
                        : item.status === "진행중" || item.status === "예약됨"
                          ? "bg-brand-50 text-brand-500"
                          : "bg-red-50 text-red-500"
                    }`}
                  >
                    {item.status}
                  </span>
                </div>
              </div>
            );

            return item.href ? (
              <Link key={item.id} href={item.href}>
                {inner}
              </Link>
            ) : (
              <div key={item.id}>{inner}</div>
            );
          })
        )}
      </main>
    </>
  );
}
