"use client";

import Link from "next/link";
import { useDb } from "@/lib/db/use-db";
import { useMasterId } from "@/lib/auth/use-master-id";
import { formatPrice } from "@/lib/db/schema";
import { formatTimeLabel, getStudentName } from "@/lib/master-utils";

export function MasterScheduleView() {
  const db = useDb();
  const masterId = useMasterId();

  const reservations = db.reservations
    .filter((r) => r.masterId === masterId && r.status === "scheduled")
    .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime());

  const feedbackOrders = db.feedbackOrders
    .filter((o) => o.masterId === masterId && (o.status === "paid" || o.status === "in_review"))
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  return (
    <div className="flex min-h-dvh flex-col bg-[#f8fafc]">
      <header className="sticky top-0 z-50 border-b border-gray-100 bg-white/90 px-6 py-4 backdrop-blur-md">
        <h1 className="text-[20px] font-extrabold tracking-tight text-gray-900">일정</h1>
        <p className="mt-1 text-[13px] font-medium text-gray-500">예약 · 피드백 마감 일정</p>
      </header>

      <main className="flex flex-col gap-6 px-6 py-5 pb-28">
        <section>
          <h2 className="mb-3 text-[14px] font-bold text-gray-800">전화 · 방문 예약</h2>
          {reservations.length === 0 ? (
            <p className="rounded-[16px] border border-gray-100 bg-white p-5 text-center text-[13px] text-gray-400 shadow-soft">
              예약된 일정이 없어요
            </p>
          ) : (
            <div className="flex flex-col gap-3">
              {reservations.map((r) => {
                const d = new Date(r.scheduledAt);
                return (
                  <div
                    key={r.id}
                    className="rounded-[16px] border border-gray-100 bg-white p-4 shadow-soft"
                  >
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-[14px] font-bold text-gray-900">
                        {getStudentName(db, r.studentId)} 수강생
                      </span>
                      <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-[11px] font-bold text-[#4f46e5]">
                        {r.type === "phone" ? "전화" : "방문"}
                      </span>
                    </div>
                    <p className="text-[13px] text-gray-500">
                      {d.getMonth() + 1}월 {d.getDate()}일 {formatTimeLabel(r.scheduledAt)}
                      {r.durationMin ? ` · ${r.durationMin}분` : ""}
                    </p>
                    {r.preQuestion && (
                      <p className="mt-2 text-[12px] text-gray-400">{r.preQuestion}</p>
                    )}
                    <p className="mt-2 text-[12px] font-semibold text-gray-600">
                      {formatPrice(r.priceAtPurchase)}원
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <section>
          <h2 className="mb-3 text-[14px] font-bold text-gray-800">피드백 대기</h2>
          {feedbackOrders.length === 0 ? (
            <p className="rounded-[16px] border border-gray-100 bg-white p-5 text-center text-[13px] text-gray-400 shadow-soft">
              대기 중인 피드백이 없어요
            </p>
          ) : (
            <div className="flex flex-col gap-3">
              {feedbackOrders.map((o) => (
                <Link
                  key={o.id}
                  href={`/master/feedback/${o.id}`}
                  className="rounded-[16px] border border-gray-100 bg-white p-4 shadow-soft transition hover:border-gray-200"
                >
                  <div className="mb-1 flex items-center justify-between">
                    <span className="text-[14px] font-bold text-gray-900">
                      {getStudentName(db, o.studentId)} · {o.mediaLabel}
                    </span>
                    <i className="fa-solid fa-chevron-right text-[12px] text-gray-300" />
                  </div>
                  <p className="line-clamp-2 text-[13px] text-gray-500">{o.studentMessage}</p>
                </Link>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
