"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useDb } from "@/lib/db/use-db";
import { useMasterId } from "@/lib/auth/use-master-id";
import { useSession } from "@/lib/auth/use-session";
import { formatPrice } from "@/lib/db/schema";
import type { FeedbackOrder, Reservation } from "@/lib/db/schema";
import {
  formatDeadlineLabel,
  formatTimeLabel,
  getStudentName,
  matchesMasterScope,
} from "@/lib/master-utils";

function toDateKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function getMonthGrid(year: number, month: number) {
  const first = new Date(year, month, 1);
  const lastDate = new Date(year, month + 1, 0).getDate();
  const startDay = (first.getDay() + 6) % 7;
  const cells: (number | null)[] = [];
  for (let i = 0; i < startDay; i++) cells.push(null);
  for (let d = 1; d <= lastDate; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

function formatDayLabel(dateKey: string) {
  const [y, m, d] = dateKey.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  const days = ["일", "월", "화", "수", "목", "금", "토"];
  return `${m}월 ${d}일 (${days[date.getDay()]})`;
}

function feedbackDayKey(order: FeedbackOrder) {
  if (order.status === "completed" && order.completedAt) {
    return toDateKey(new Date(order.completedAt));
  }
  // 대기: 마감일(요청 + 24시간) 기준으로 표시
  return toDateKey(new Date(new Date(order.createdAt).getTime() + 24 * 60 * 60 * 1000));
}

type DayMarks = {
  phone: number;
  visit: number;
  feedback: number;
};

type Category = "feedback" | "phone" | "visit";
type StatusTab = "pending" | "done";

export function MasterScheduleView() {
  const db = useDb();
  const masterId = useMasterId();
  const { session } = useSession();
  const now = new Date();

  const [viewYear, setViewYear] = useState(now.getFullYear());
  const [viewMonth, setViewMonth] = useState(now.getMonth());
  const [selectedKey, setSelectedKey] = useState(toDateKey(now));
  const [openCategory, setOpenCategory] = useState<Category | null>(null);
  const [statusTab, setStatusTab] = useState<StatusTab>("pending");

  const activeMasterId =
    db.masters.find((m) => m.id === masterId)?.id ||
    (session?.id ? db.masters.find((m) => m.userId === session.id)?.id : undefined) ||
    masterId;

  const allReservations = useMemo(
    () =>
      db.reservations.filter(
        (r) =>
          matchesMasterScope(activeMasterId, r.masterId) &&
          (r.status === "scheduled" || r.status === "completed"),
      ),
    [db.reservations, activeMasterId],
  );

  const allFeedback = useMemo(
    () =>
      db.feedbackOrders.filter(
        (o) =>
          matchesMasterScope(activeMasterId, o.masterId) &&
          (o.status === "paid" || o.status === "in_review" || o.status === "completed"),
      ),
    [db.feedbackOrders, activeMasterId],
  );

  const marksByDay = useMemo(() => {
    const map = new Map<string, DayMarks>();
    const bump = (key: string, field: keyof DayMarks) => {
      const cur = map.get(key) ?? { phone: 0, visit: 0, feedback: 0 };
      cur[field] += 1;
      map.set(key, cur);
    };

    for (const r of allReservations) {
      bump(toDateKey(new Date(r.scheduledAt)), r.type === "phone" ? "phone" : "visit");
    }
    for (const o of allFeedback) {
      bump(feedbackDayKey(o), "feedback");
    }
    return map;
  }, [allReservations, allFeedback]);

  const monthGrid = useMemo(() => getMonthGrid(viewYear, viewMonth), [viewYear, viewMonth]);
  const isCurrentMonth = viewYear === now.getFullYear() && viewMonth === now.getMonth();
  const todayKey = toDateKey(now);

  const dayFeedback = useMemo(
    () => allFeedback.filter((o) => feedbackDayKey(o) === selectedKey),
    [allFeedback, selectedKey],
  );
  const dayPhones = useMemo(
    () =>
      allReservations.filter(
        (r) => r.type === "phone" && toDateKey(new Date(r.scheduledAt)) === selectedKey,
      ),
    [allReservations, selectedKey],
  );
  const dayVisits = useMemo(
    () =>
      allReservations.filter(
        (r) => r.type === "visit" && toDateKey(new Date(r.scheduledAt)) === selectedKey,
      ),
    [allReservations, selectedKey],
  );

  const categories = [
    {
      id: "feedback" as const,
      label: "피드백",
      desc: "음원 · 영상 첨삭",
      count: dayFeedback.length,
      pending: dayFeedback.filter((o) => o.status === "paid" || o.status === "in_review").length,
      icon: "fa-sliders",
      iconFallback: "fa-headphones",
      accent: "#312e81",
      soft: "#eef2ff",
    },
    {
      id: "phone" as const,
      label: "전화",
      desc: "예약 통화 상담",
      count: dayPhones.length,
      pending: dayPhones.filter((r) => r.status === "scheduled").length,
      icon: "fa-phone-volume",
      iconFallback: "fa-clock",
      accent: "#0f766e",
      soft: "#f0fdfa",
    },
    {
      id: "visit" as const,
      label: "방문",
      desc: "대면 레슨",
      count: dayVisits.length,
      pending: dayVisits.filter((r) => r.status === "scheduled").length,
      icon: "fa-map-location-dot",
      iconFallback: "fa-user",
      accent: "#9a3412",
      soft: "#fff7ed",
    },
  ];

  const openItems = useMemo(() => {
    if (openCategory === "feedback") {
      return {
        pending: dayFeedback.filter((o) => o.status === "paid" || o.status === "in_review"),
        done: dayFeedback.filter((o) => o.status === "completed"),
      };
    }
    if (openCategory === "phone") {
      return {
        pending: dayPhones.filter((r) => r.status === "scheduled"),
        done: dayPhones.filter((r) => r.status === "completed"),
      };
    }
    if (openCategory === "visit") {
      return {
        pending: dayVisits.filter((r) => r.status === "scheduled"),
        done: dayVisits.filter((r) => r.status === "completed"),
      };
    }
    return { pending: [], done: [] };
  }, [openCategory, dayFeedback, dayPhones, dayVisits]);

  // 날짜 바꾸면 펼침 초기화
  useEffect(() => {
    setOpenCategory(null);
    setStatusTab("pending");
  }, [selectedKey]);

  // 펼친 카테고리에서 대기 없으면 완료 탭으로
  useEffect(() => {
    if (!openCategory) return;
    if (openItems.pending.length === 0 && openItems.done.length > 0) {
      setStatusTab("done");
    } else if (openItems.pending.length > 0 && statusTab === "done" && openItems.done.length === 0) {
      setStatusTab("pending");
    }
  }, [openCategory, openItems.pending.length, openItems.done.length, statusTab]);

  const prevMonth = () => {
    if (viewMonth === 0) {
      setViewYear((y) => y - 1);
      setViewMonth(11);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const nextMonth = () => {
    if (viewMonth === 11) {
      setViewYear((y) => y + 1);
      setViewMonth(0);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  const toggleCategory = (id: Category) => {
    setOpenCategory((prev) => (prev === id ? null : id));
    setStatusTab("pending");
  };

  const shownList = statusTab === "pending" ? openItems.pending : openItems.done;

  return (
    <div className="flex min-h-dvh flex-col bg-white">
      <header className="sticky top-0 z-50 border-b border-gray-50 bg-white/90 px-6 py-4 backdrop-blur-md">
        <h1 className="text-[20px] font-extrabold tracking-tight text-gray-900">일정</h1>
      </header>

      <main className="flex flex-col gap-5 px-5 py-4 pb-4">
        <section className="rounded-[24px] border border-gray-100 bg-white p-5 shadow-soft">
          <div className="mb-4 flex items-center justify-between">
            <button
              type="button"
              onClick={prevMonth}
              className="flex h-8 w-8 items-center justify-center rounded-full text-gray-400 hover:bg-gray-50"
              aria-label="이전 달"
            >
              <i className="fa-solid fa-chevron-left text-[12px]" />
            </button>
            <span className="text-[15px] font-bold text-gray-900">
              {viewYear}년 {viewMonth + 1}월
            </span>
            <button
              type="button"
              onClick={nextMonth}
              className="flex h-8 w-8 items-center justify-center rounded-full text-gray-400 hover:bg-gray-50"
              aria-label="다음 달"
            >
              <i className="fa-solid fa-chevron-right text-[12px]" />
            </button>
          </div>

          <div className="mb-2 grid grid-cols-7 text-center text-[11px] font-medium text-gray-400">
            {["월", "화", "수", "목", "금", "토", "일"].map((d) => (
              <span key={d}>{d}</span>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {monthGrid.map((day, i) => {
              if (day === null) return <div key={`e-${i}`} className="aspect-square" />;

              const key = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
              const marks = marksByDay.get(key);
              const selected = key === selectedKey;
              const isToday = key === todayKey;
              const hasAny = Boolean(marks && (marks.phone || marks.visit || marks.feedback));

              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setSelectedKey(key)}
                  className={`flex aspect-square flex-col items-center justify-center rounded-xl text-[13px] font-medium transition ${
                    selected
                      ? "bg-gray-900 text-white"
                      : isToday
                        ? "bg-brand-50 text-master-500"
                        : hasAny
                          ? "bg-surface text-gray-800"
                          : "text-gray-400 hover:bg-gray-50"
                  }`}
                >
                  <span>{day}</span>
                  {hasAny && (
                    <span className="mt-0.5 flex items-center gap-0.5">
                      {marks!.feedback > 0 && (
                        <span
                          className={`h-1 w-1 rounded-full ${selected ? "bg-brand-300" : "bg-master-500"}`}
                        />
                      )}
                      {marks!.phone > 0 && (
                        <span
                          className={`h-1 w-1 rounded-full ${selected ? "bg-emerald-300" : "bg-emerald-500"}`}
                        />
                      )}
                      {marks!.visit > 0 && (
                        <span
                          className={`h-1 w-1 rounded-full ${selected ? "bg-amber-300" : "bg-amber-500"}`}
                        />
                      )}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          <div className="mt-4 flex items-center justify-center gap-5 text-[11px] font-medium text-gray-400">
            <span className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-master-500" /> 피드백
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-teal-700" /> 전화
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-orange-800" /> 방문
            </span>
          </div>
        </section>

        <section>
          <div className="mb-3 flex items-center justify-between px-1">
            <h2 className="text-[15px] font-bold text-gray-900">{formatDayLabel(selectedKey)}</h2>
            {isCurrentMonth && selectedKey !== todayKey && (
              <button
                type="button"
                onClick={() => setSelectedKey(todayKey)}
                className="text-[12px] font-bold text-master-500"
              >
                오늘로
              </button>
            )}
          </div>

          <div className="flex flex-col gap-2.5">
            {categories.map((cat) => {
              const open = openCategory === cat.id;
              const hasWork = cat.count > 0;
              return (
                <div
                  key={cat.id}
                  className={`overflow-hidden rounded-[18px] border transition ${
                    open
                      ? "border-gray-200 bg-white shadow-soft"
                      : hasWork
                        ? "border-gray-100 bg-white"
                        : "border-transparent bg-surface/70"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => toggleCategory(cat.id)}
                    className="flex w-full items-center gap-3.5 px-3.5 py-3.5 text-left"
                  >
                    <span
                      className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl"
                      style={{ backgroundColor: cat.soft, color: cat.accent }}
                    >
                      <i className={`fa-solid ${cat.icon} text-[16px]`} />
                      <span
                        className="absolute -right-0.5 -bottom-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-white shadow-sm"
                        style={{ color: cat.accent }}
                      >
                        <i className={`fa-solid ${cat.iconFallback} text-[7px]`} />
                      </span>
                    </span>

                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2">
                        <span className="text-[15px] font-bold text-gray-900">{cat.label}</span>
                        {cat.pending > 0 && (
                          <span
                            className="rounded-full px-1.5 py-0.5 text-[10px] font-bold text-white"
                            style={{ backgroundColor: cat.accent }}
                          >
                            대기 {cat.pending}
                          </span>
                        )}
                      </span>
                      <span className="mt-0.5 block text-[12px] text-gray-400">{cat.desc}</span>
                    </span>

                    <span className="flex items-center gap-2">
                      <span
                        className={`rounded-full px-2.5 py-1 text-[13px] font-extrabold tabular-nums ${
                          hasWork ? "bg-gray-900 text-white" : "bg-white text-gray-300"
                        }`}
                      >
                        {cat.count}
                      </span>
                      <i
                        className={`fa-solid fa-chevron-down text-[11px] text-gray-300 transition duration-200 ${
                          open ? "rotate-180" : ""
                        }`}
                      />
                    </span>
                  </button>

                  {open && (
                    <div className="border-t border-gray-50 px-3 pb-3 pt-2">
                      <div className="mb-2 flex gap-1 rounded-xl bg-surface p-1">
                        {(
                          [
                            {
                              id: "pending" as const,
                              label: "대기",
                              count: openItems.pending.length,
                            },
                            {
                              id: "done" as const,
                              label: "완료",
                              count: openItems.done.length,
                            },
                          ] as const
                        ).map((tab) => (
                          <button
                            key={tab.id}
                            type="button"
                            onClick={() => setStatusTab(tab.id)}
                            className={`flex-1 rounded-lg py-2 text-[12px] font-bold transition ${
                              statusTab === tab.id
                                ? "bg-white text-gray-900 shadow-sm"
                                : "text-gray-400"
                            }`}
                          >
                            {tab.label}
                            <span className="ml-1 tabular-nums">{tab.count}</span>
                          </button>
                        ))}
                      </div>

                      {shownList.length === 0 ? (
                        <p className="py-6 text-center text-[13px] text-gray-400">
                          {statusTab === "pending" ? "대기 건이 없어요" : "완료 건이 없어요"}
                        </p>
                      ) : openCategory === "feedback" ? (
                        <div className="flex flex-col gap-2">
                          {(shownList as FeedbackOrder[]).map((o) => (
                            <FeedbackCard
                              key={o.id}
                              order={o}
                              studentName={getStudentName(db, o.studentId)}
                              done={statusTab === "done"}
                            />
                          ))}
                        </div>
                      ) : (
                        <div className="flex flex-col gap-2">
                          {(shownList as Reservation[]).map((r) => (
                            <ReservationCard
                              key={r.id}
                              reservation={r}
                              studentName={getStudentName(db, r.studentId)}
                              done={statusTab === "done"}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      </main>
    </div>
  );
}

function FeedbackCard({
  order,
  studentName,
  done,
}: {
  order: FeedbackOrder;
  studentName: string;
  done: boolean;
}) {
  return (
    <Link
      href={done ? `/feedback/${order.id}` : `/master/feedback/${order.id}`}
      className="block rounded-2xl border border-gray-100 bg-white p-3.5"
    >
      <div className="mb-1 flex items-center gap-2">
        <span className="text-[12px] font-medium text-gray-400">
          {done
            ? new Date(order.completedAt ?? order.createdAt).toLocaleDateString("ko-KR")
            : formatDeadlineLabel(order.createdAt)}
        </span>
      </div>
      <p className="text-[14px] font-bold text-gray-900">{studentName}</p>
      <p className="mt-0.5 line-clamp-2 text-[13px] text-gray-500">{order.studentMessage}</p>
    </Link>
  );
}

function ReservationCard({
  reservation,
  studentName,
  done,
}: {
  reservation: Reservation;
  studentName: string;
  done: boolean;
}) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-3.5">
      <div className="mb-1 flex items-center gap-2">
        <span className="text-[12px] font-bold text-master-500">
          {formatTimeLabel(reservation.scheduledAt)}
        </span>
        {reservation.durationMin ? (
          <span className="text-[12px] text-gray-400">{reservation.durationMin}분</span>
        ) : null}
        {done && (
          <span className="rounded-md bg-emerald-50 px-1.5 py-0.5 text-[10px] font-bold text-emerald-600">
            완료
          </span>
        )}
      </div>
      <p className="text-[14px] font-bold text-gray-900">{studentName}</p>
      {reservation.preQuestion && (
        <p className="mt-0.5 line-clamp-2 text-[13px] text-gray-500">{reservation.preQuestion}</p>
      )}
      <p className="mt-1.5 text-[12px] font-semibold text-gray-500">
        {formatPrice(reservation.priceAtPurchase)}원
      </p>
    </div>
  );
}
