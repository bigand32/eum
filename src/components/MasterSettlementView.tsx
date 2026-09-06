"use client";

import { useMemo, useState } from "react";
import { useDb } from "@/lib/db/use-db";
import { useMasterId } from "@/lib/auth/use-master-id";
import { formatPrice } from "@/lib/db/schema";
import { getStudentName, matchesMasterScope } from "@/lib/master-utils";

type StatusFilter = "all" | "pending" | "settled";
type PeriodGrain = "day" | "month" | "year";

type SettlementItem = {
  id: string;
  label: string;
  amount: number;
  date: string;
  status: "pending" | "settled";
};

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function inPeriod(iso: string, grain: PeriodGrain, cursor: Date) {
  const d = new Date(iso);
  if (grain === "year") return d.getFullYear() === cursor.getFullYear();
  if (grain === "month") {
    return d.getFullYear() === cursor.getFullYear() && d.getMonth() === cursor.getMonth();
  }
  return isSameDay(d, cursor);
}

function shiftCursor(cursor: Date, grain: PeriodGrain, delta: number) {
  const next = new Date(cursor);
  if (grain === "year") next.setFullYear(next.getFullYear() + delta);
  else if (grain === "month") next.setMonth(next.getMonth() + delta);
  else next.setDate(next.getDate() + delta);
  return next;
}

function periodLabel(grain: PeriodGrain, cursor: Date) {
  if (grain === "year") return `${cursor.getFullYear()}년`;
  if (grain === "month") return `${cursor.getFullYear()}년 ${cursor.getMonth() + 1}월`;
  return `${cursor.getFullYear()}년 ${cursor.getMonth() + 1}월 ${cursor.getDate()}일`;
}

type ChartBar = { key: string; label: string; amount: number };

function buildChartBars(
  items: SettlementItem[],
  grain: PeriodGrain,
  cursor: Date,
): ChartBar[] {
  if (grain === "year") {
    return Array.from({ length: 12 }, (_, month) => {
      const amount = items
        .filter((item) => {
          const d = new Date(item.date);
          return d.getFullYear() === cursor.getFullYear() && d.getMonth() === month;
        })
        .reduce((s, item) => s + item.amount, 0);
      return { key: `m-${month}`, label: `${month + 1}`, amount };
    });
  }

  if (grain === "month") {
    const daysInMonth = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate();
    return Array.from({ length: daysInMonth }, (_, i) => {
      const day = i + 1;
      const amount = items
        .filter((item) => {
          const d = new Date(item.date);
          return (
            d.getFullYear() === cursor.getFullYear() &&
            d.getMonth() === cursor.getMonth() &&
            d.getDate() === day
          );
        })
        .reduce((s, item) => s + item.amount, 0);
      return {
        key: `d-${day}`,
        label: day === 1 || day % 5 === 0 || day === daysInMonth ? String(day) : "",
        amount,
      };
    });
  }

  // 일: 해당 주(월~일) 매출
  const base = startOfDay(cursor);
  const mondayOffset = (base.getDay() + 6) % 7;
  const monday = new Date(base);
  monday.setDate(base.getDate() - mondayOffset);
  const days = ["월", "화", "수", "목", "금", "토", "일"];
  return days.map((label, i) => {
    const day = new Date(monday);
    day.setDate(monday.getDate() + i);
    const amount = items
      .filter((item) => isSameDay(new Date(item.date), day))
      .reduce((s, item) => s + item.amount, 0);
    return { key: `w-${i}`, label, amount };
  });
}

function SettlementBarChart({ bars }: { bars: ChartBar[] }) {
  const max = Math.max(...bars.map((b) => b.amount), 1);
  const hasAny = bars.some((b) => b.amount > 0);

  return (
    <div className="pt-2">
      <div className="flex h-36 items-end gap-1">
        {bars.map((bar) => {
          const height = hasAny ? Math.max((bar.amount / max) * 100, bar.amount > 0 ? 6 : 0) : 0;
          return (
            <div key={bar.key} className="flex min-w-0 flex-1 flex-col items-center justify-end gap-1">
              <div className="flex h-28 w-full items-end justify-center">
                <div
                  className={`w-full max-w-[18px] rounded-t-md transition-all ${
                    bar.amount > 0 ? "bg-master-500" : "bg-gray-100"
                  }`}
                  style={{ height: `${Math.max(height, bar.amount > 0 ? 6 : 2)}%` }}
                  title={`${bar.label}: ${formatPrice(bar.amount)}원`}
                />
              </div>
            </div>
          );
        })}
      </div>
      <div className="mt-1.5 flex gap-1">
        {bars.map((bar) => (
          <div
            key={`l-${bar.key}`}
            className="min-w-0 flex-1 text-center text-[10px] font-medium text-gray-400"
          >
            {bar.label}
          </div>
        ))}
      </div>
      {!hasAny && (
        <p className="mt-3 text-center text-[12px] text-gray-400">이 기간 매출이 없어요</p>
      )}
    </div>
  );
}

export function MasterSettlementView() {
  const db = useDb();
  const masterId = useMasterId();
  const now = new Date();

  const [filter, setFilter] = useState<StatusFilter>("all");
  const [grain, setGrain] = useState<PeriodGrain>("month");
  const [cursor, setCursor] = useState(() => startOfDay(now));

  const platformFeeRate = 0.1;

  const allItems = useMemo<SettlementItem[]>(() => {
    const completedFeedback = db.feedbackOrders.filter(
      (o) => matchesMasterScope(masterId, o.masterId) && o.status === "completed",
    );
    const completedReservations = db.reservations.filter(
      (r) => matchesMasterScope(masterId, r.masterId) && r.status === "completed",
    );

    return [
      ...completedFeedback.map((o) => ({
        id: o.id,
        label: `피드백 · ${getStudentName(db, o.studentId)}`,
        amount: o.priceAtPurchase,
        date: o.completedAt ?? o.paidAt ?? o.createdAt,
        status: "settled" as const,
      })),
      ...db.feedbackOrders
        .filter((o) => matchesMasterScope(masterId, o.masterId) && o.status === "paid")
        .map((o) => ({
          id: o.id,
          label: `피드백 · ${getStudentName(db, o.studentId)}`,
          amount: o.priceAtPurchase,
          date: o.paidAt ?? o.createdAt,
          status: "pending" as const,
        })),
      ...db.reservations
        .filter((r) => matchesMasterScope(masterId, r.masterId) && r.status === "scheduled")
        .map((r) => ({
          id: r.id,
          label: `${r.type === "phone" ? "전화" : "방문"} · ${getStudentName(db, r.studentId)}`,
          amount: r.priceAtPurchase,
          date: r.scheduledAt,
          status: "pending" as const,
        })),
      ...completedReservations.map((r) => ({
        id: `done-${r.id}`,
        label: `${r.type === "phone" ? "전화" : "방문"} · ${getStudentName(db, r.studentId)}`,
        amount: r.priceAtPurchase,
        date: r.scheduledAt,
        status: "settled" as const,
      })),
    ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [db, masterId]);

  const periodItems = useMemo(
    () => allItems.filter((item) => inPeriod(item.date, grain, cursor)),
    [allItems, grain, cursor],
  );

  const periodSales = periodItems.reduce((s, item) => s + item.amount, 0);
  const periodFee = Math.round(periodSales * platformFeeRate);
  const periodNet = Math.max(0, periodSales - periodFee);
  const periodSettled = periodItems
    .filter((item) => item.status === "settled")
    .reduce((s, item) => s + item.amount, 0);
  const periodPending = periodItems
    .filter((item) => item.status === "pending")
    .reduce((s, item) => s + item.amount, 0);

  const chartBars = useMemo(
    () => buildChartBars(periodItems, grain, cursor),
    [periodItems, grain, cursor],
  );

  const nextPayoutDate = useMemo(() => {
    const d = new Date();
    const day = d.getDay();
    const daysUntilWed = (3 - day + 7) % 7 || 7;
    d.setDate(d.getDate() + daysUntilWed);
    return `${d.getMonth() + 1}월 ${d.getDate()}일 (수)`;
  }, []);

  const filteredItems = (
    filter === "all" ? periodItems : periodItems.filter((item) => item.status === filter)
  ).slice(0, 30);

  const pendingNet = Math.max(0, Math.round(periodPending * (1 - platformFeeRate)));

  return (
    <div className="flex min-h-dvh flex-col bg-white">
      <header className="sticky top-0 z-50 bg-white/95 px-6 pt-4 pb-3 backdrop-blur-md">
        <h1 className="text-[22px] font-extrabold tracking-tight text-gray-900">정산</h1>
      </header>

      <main className="flex flex-col pb-4">
        {/* 기간 필터 */}
        <section className="px-5 pt-1">
          <div className="flex rounded-full bg-surface p-1">
            {(
              [
                { id: "day" as const, label: "일" },
                { id: "month" as const, label: "월" },
                { id: "year" as const, label: "년" },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setGrain(tab.id)}
                className={`flex-1 rounded-full py-2 text-[13px] font-bold transition ${
                  grain === tab.id ? "bg-white text-gray-900 shadow-sm" : "text-gray-400"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="mt-3 flex items-center justify-between px-1">
            <button
              type="button"
              onClick={() => setCursor((c) => shiftCursor(c, grain, -1))}
              className="flex h-8 w-8 items-center justify-center rounded-full text-gray-400 hover:bg-gray-50"
              aria-label="이전 기간"
            >
              <i className="fa-solid fa-chevron-left text-[12px]" />
            </button>
            <button
              type="button"
              onClick={() => setCursor(startOfDay(now))}
              className="text-[15px] font-bold text-gray-900"
            >
              {periodLabel(grain, cursor)}
            </button>
            <button
              type="button"
              onClick={() => setCursor((c) => shiftCursor(c, grain, 1))}
              className="flex h-8 w-8 items-center justify-center rounded-full text-gray-400 hover:bg-gray-50"
              aria-label="다음 기간"
            >
              <i className="fa-solid fa-chevron-right text-[12px]" />
            </button>
          </div>
        </section>

        {/* 기간 매출 + 그래프 */}
        <section className="px-6 pt-4 pb-2">
          <p className="text-[13px] font-medium text-gray-500">기간 매출</p>
          <p className="mt-1 text-[32px] font-extrabold tracking-tight text-gray-900 tabular-nums">
            {formatPrice(periodSales)}
            <span className="ml-0.5 text-[16px] font-bold text-gray-500">원</span>
          </p>
          <p className="mt-1 text-[12px] text-gray-400">
            실입금 예상 {formatPrice(periodNet)}원 · 다음 입금 {nextPayoutDate}
          </p>
          <SettlementBarChart bars={chartBars} />
        </section>

        <section className="mx-5 mt-2 rounded-2xl bg-surface px-4 py-1">
          <div className="flex items-center justify-between border-b border-gray-200/60 py-3.5">
            <span className="text-[14px] text-gray-500">매출</span>
            <span className="text-[14px] font-semibold tabular-nums text-gray-900">
              {formatPrice(periodSales)}원
            </span>
          </div>
          <div className="flex items-center justify-between border-b border-gray-200/60 py-3.5">
            <span className="text-[14px] text-gray-500">수수료 10%</span>
            <span className="text-[14px] font-semibold tabular-nums text-gray-900">
              -{formatPrice(periodFee)}원
            </span>
          </div>
          <div className="flex items-center justify-between py-3.5">
            <span className="text-[14px] font-bold text-gray-900">실입금액</span>
            <span className="text-[15px] font-extrabold tabular-nums text-master-500">
              {formatPrice(periodNet)}원
            </span>
          </div>
        </section>

        <section className="mt-6 flex items-center gap-0 border-y border-gray-100 px-6 py-4">
          <div className="flex-1">
            <p className="text-[12px] text-gray-400">정산완료</p>
            <p className="mt-0.5 text-[16px] font-bold tabular-nums text-gray-900">
              {formatPrice(periodSettled)}원
            </p>
          </div>
          <div className="h-8 w-px bg-gray-100" />
          <div className="flex-1 pl-6">
            <p className="text-[12px] text-gray-400">입금예정</p>
            <p className="mt-0.5 text-[16px] font-bold tabular-nums text-gray-900">
              {formatPrice(pendingNet)}원
            </p>
          </div>
        </section>

        <section className="mt-2 px-5 pt-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-[15px] font-bold text-gray-900">내역</h2>
            <div className="flex gap-1">
              {(
                [
                  { id: "all" as const, label: "전체" },
                  { id: "pending" as const, label: "예정" },
                  { id: "settled" as const, label: "완료" },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setFilter(tab.id)}
                  className={`rounded-full px-3 py-1 text-[12px] font-bold transition ${
                    filter === tab.id
                      ? "bg-gray-900 text-white"
                      : "bg-transparent text-gray-400"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {filteredItems.length === 0 ? (
            <p className="py-12 text-center text-[13px] text-gray-400">이 기간 내역이 없어요</p>
          ) : (
            <ul className="divide-y divide-gray-50">
              {filteredItems.map((item) => (
                <li key={item.id} className="flex items-center justify-between py-4">
                  <div className="min-w-0 pr-3">
                    <p className="truncate text-[14px] font-semibold text-gray-900">{item.label}</p>
                    <p className="mt-0.5 text-[12px] text-gray-400">
                      {new Date(item.date).toLocaleDateString("ko-KR", {
                        month: "long",
                        day: "numeric",
                      })}
                      <span className="mx-1.5 text-gray-200">·</span>
                      <span
                        className={
                          item.status === "pending" ? "text-master-500" : "text-gray-400"
                        }
                      >
                        {item.status === "pending" ? "입금예정" : "정산완료"}
                      </span>
                    </p>
                  </div>
                  <p className="shrink-0 text-[15px] font-bold tabular-nums text-gray-900">
                    {formatPrice(item.amount)}원
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </div>
  );
}
