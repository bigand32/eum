"use client";

import { useDb } from "@/lib/db/use-db";
import { useMasterId } from "@/lib/auth/use-master-id";
import { formatPrice } from "@/lib/db/schema";
import { formatManWon, getMasterPendingAmount, getStudentName } from "@/lib/master-utils";

export function MasterSettlementView() {
  const db = useDb();
  const masterId = useMasterId();

  const completedFeedback = db.feedbackOrders.filter(
    (o) => o.masterId === masterId && o.status === "completed",
  );
  const completedReservations = db.reservations.filter(
    (r) => r.masterId === masterId && r.status === "completed",
  );
  const pendingAmount = getMasterPendingAmount(db, masterId);
  const settledAmount =
    completedFeedback.reduce((s, o) => s + o.priceAtPurchase, 0) +
    completedReservations.reduce((s, r) => s + r.priceAtPurchase, 0);

  const recentItems = [
    ...completedFeedback.map((o) => ({
      id: o.id,
      label: `피드백 · ${getStudentName(db, o.studentId)}`,
      amount: o.priceAtPurchase,
      date: o.completedAt ?? o.paidAt ?? o.createdAt,
      status: "정산완료" as const,
    })),
    ...db.feedbackOrders
      .filter((o) => o.masterId === masterId && o.status === "paid")
      .map((o) => ({
        id: o.id,
        label: `피드백 · ${getStudentName(db, o.studentId)}`,
        amount: o.priceAtPurchase,
        date: o.paidAt ?? o.createdAt,
        status: "입금예정" as const,
      })),
    ...db.reservations
      .filter((r) => r.masterId === masterId && r.status === "scheduled")
      .map((r) => ({
        id: r.id,
        label: `${r.type === "phone" ? "전화" : "방문"} · ${getStudentName(db, r.studentId)}`,
        amount: r.priceAtPurchase,
        date: r.scheduledAt,
        status: "입금예정" as const,
      })),
  ]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 10);

  return (
    <div className="flex min-h-dvh flex-col bg-[#f8fafc]">
      <header className="sticky top-0 z-50 border-b border-gray-100 bg-white/90 px-6 py-4 backdrop-blur-md">
        <h1 className="text-[20px] font-extrabold tracking-tight text-gray-900">정산</h1>
        <p className="mt-1 text-[13px] font-medium text-gray-500">수익 · 입금 예정 금액</p>
      </header>

      <main className="flex flex-col gap-6 px-6 py-5 pb-28">
        <div className="rounded-[20px] border border-gray-100 bg-white p-5 shadow-soft">
          <div className="mb-4 flex items-center justify-between">
            <span className="text-[13px] font-semibold text-gray-500">입금 예정</span>
            <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-[11px] font-bold text-[#4f46e5]">
              이번 달
            </span>
          </div>
          <div className="text-[32px] font-extrabold tracking-tight text-gray-900">
            {formatManWon(pendingAmount)}
            <span className="ml-1 text-[16px] font-bold text-gray-500">만원</span>
          </div>
          <p className="mt-2 text-[12px] text-gray-400">완료된 피드백 · 예정된 상담 기준</p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-[16px] border border-gray-100 bg-white p-4 shadow-soft">
            <div className="mb-1 text-[11px] font-bold text-gray-400">누적 정산</div>
            <div className="text-[18px] font-extrabold text-gray-900">
              {formatManWon(settledAmount)}
              <span className="text-[12px] font-semibold text-gray-500">만</span>
            </div>
          </div>
          <div className="rounded-[16px] border border-gray-100 bg-white p-4 shadow-soft">
            <div className="mb-1 text-[11px] font-bold text-gray-400">완료 피드백</div>
            <div className="text-[18px] font-extrabold text-gray-900">
              {completedFeedback.length}
              <span className="text-[12px] font-semibold text-gray-500">건</span>
            </div>
          </div>
        </div>

        <section>
          <h2 className="mb-3 text-[14px] font-bold text-gray-800">최근 내역</h2>
          {recentItems.length === 0 ? (
            <p className="rounded-[16px] border border-gray-100 bg-white p-5 text-center text-[13px] text-gray-400 shadow-soft">
              정산 내역이 없어요
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              {recentItems.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between rounded-[14px] border border-gray-100 bg-white px-4 py-3.5 shadow-soft"
                >
                  <div>
                    <p className="text-[14px] font-bold text-gray-900">{item.label}</p>
                    <p className="text-[11px] text-gray-400">
                      {new Date(item.date).toLocaleDateString("ko-KR")}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[14px] font-extrabold text-gray-900">
                      {formatPrice(item.amount)}원
                    </p>
                    <p
                      className={`text-[10px] font-bold ${
                        item.status === "입금예정" ? "text-[#4f46e5]" : "text-green-600"
                      }`}
                    >
                      {item.status}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
