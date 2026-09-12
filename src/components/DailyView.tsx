"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { RecordModal } from "@/components/RecordModal";
import { useStudentId } from "@/lib/auth/use-student-id";
import { useDb } from "@/lib/db/use-db";
import { matchesStudentScope } from "@/lib/student-utils";
import { formatTime } from "@/lib/timestamp-comments";
import type { PracticeRecord, FeedbackOrder, TimestampComment } from "@/lib/db/schema";

/* ── helpers ───────────────────────────────────── */

function toDateKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function formatRecordDate(iso: string) {
  const d = new Date(iso);
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일`;
}

/** 예전 자동 제목은 날짜라서, 그룹 헤더와 겹친다 */
function practiceTitle(title: string) {
  const trimmed = title.trim();
  if (!trimmed || /^\d{1,2}월\s*\d{1,2}일(\s*연습)?$/.test(trimmed)) return "연습";
  return trimmed;
}

/* ── heatmap helpers ───────────────────────────── */

function getMonthGrid(year: number, month: number) {
  const first = new Date(year, month, 1);
  const lastDate = new Date(year, month + 1, 0).getDate();
  const startDay = (first.getDay() + 6) % 7; // 월=0

  const cells: (number | null)[] = [];
  for (let i = 0; i < startDay; i++) cells.push(null);
  for (let d = 1; d <= lastDate; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

function getStreak(practiceDates: Set<string>, today: Date): number {
  let count = 0;
  const d = new Date(today);
  // 오늘 안 했으면 어제부터
  if (!practiceDates.has(toDateKey(d))) {
    d.setDate(d.getDate() - 1);
  }
  while (practiceDates.has(toDateKey(d))) {
    count++;
    d.setDate(d.getDate() - 1);
  }
  return count;
}

/* ── timeline: practice + linked feedback ──────── */

type PracticeTimelineItem = {
  record: PracticeRecord;
  feedback?: { order: FeedbackOrder; masterTitle: string };
};

type DateGroup = {
  dateLabel: string;
  dateKey: string;
  items: PracticeTimelineItem[];
};

function normalizeMediaUrl(url?: string) {
  if (!url) return "";
  try {
    const parsed = new URL(url);
    return `${parsed.origin}${parsed.pathname}`;
  } catch {
    return url.split("?")[0] ?? "";
  }
}

function orderMatchesPractice(order: FeedbackOrder, record: PracticeRecord) {
  if (order.practiceRecordId && order.practiceRecordId === record.id) return true;
  const orderUrl = normalizeMediaUrl(order.mediaUrl);
  const recordUrl = normalizeMediaUrl(record.mediaUrl);
  if (orderUrl && recordUrl && orderUrl === recordUrl) return true;
  return false;
}

/** 기존 데이터용: 일지 선택 후 media_url이 바뀐 경우 추정 연결 */
function softMatchPractice(
  order: FeedbackOrder,
  records: PracticeRecord[],
  usedRecordIds: Set<string>,
) {
  const requestedAt = new Date(order.paidAt ?? order.createdAt).getTime();
  const candidates = records.filter((record) => {
    if (usedRecordIds.has(record.id)) return false;
    if (!record.mediaUrl) return false;
    if (new Date(record.createdAt).getTime() > requestedAt) return false;
    if (
      order.mediaDurationSec != null &&
      Math.abs(record.durationSec - order.mediaDurationSec) > 2
    ) {
      return false;
    }
    return true;
  });
  if (candidates.length === 0) return undefined;
  return candidates.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  )[0];
}

function commentPreviewTime(order: FeedbackOrder) {
  const first = order.timestampComments[0] as
    | (TimestampComment & { timeSec?: number })
    | undefined;
  if (!first) return 0;
  const raw = typeof first.time === "number" ? first.time : Number(first.timeSec ?? 0);
  return Number.isFinite(raw) ? raw : 0;
}

/* ── component ─────────────────────────────────── */

export function DailyView() {
  const db = useDb();
  const studentId = useStudentId();
  const now = new Date();

  const [viewYear, setViewYear] = useState(now.getFullYear());
  const [viewMonth, setViewMonth] = useState(now.getMonth());
  /** 달력에서 고른 날. null이면 전체 기록 */
  const [selectedKey, setSelectedKey] = useState<string | null>(null);

  /* practice records for this student */
  const practiceRecords = useMemo(
    () =>
      db.practiceRecords
        .filter((r) => matchesStudentScope(studentId, r.studentId))
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [db.practiceRecords, studentId],
  );

  /* set of dates practiced */
  const practiceDates = useMemo(() => {
    const s = new Set<string>();
    for (const r of practiceRecords) s.add(toDateKey(new Date(r.createdAt)));
    return s;
  }, [practiceRecords]);

  /* stats */
  const streak = useMemo(() => getStreak(practiceDates, now), [practiceDates]);

  const weekStats = useMemo(() => {
    const startOfWeek = new Date(now);
    const day = startOfWeek.getDay();
    startOfWeek.setDate(startOfWeek.getDate() - ((day + 6) % 7));
    startOfWeek.setHours(0, 0, 0, 0);

    let daySet = new Set<string>();
    for (const r of practiceRecords) {
      const d = new Date(r.createdAt);
      if (d >= startOfWeek) {
        daySet.add(toDateKey(d));
      }
    }
    return { days: daySet.size };
  }, [practiceRecords]);

  const totalFeedbackCount = useMemo(
    () =>
      db.feedbackOrders.filter(
        (o) =>
          matchesStudentScope(studentId, o.studentId) &&
          o.status !== "cancelled" &&
          o.status !== "pending_payment",
      ).length,
    [db.feedbackOrders, studentId],
  );

  /* heatmap grid */
  const monthGrid = useMemo(() => getMonthGrid(viewYear, viewMonth), [viewYear, viewMonth]);

  /* heatmap intensity: count per day this month */
  const dayCountMap = useMemo(() => {
    const map = new Map<number, number>();
    for (const r of practiceRecords) {
      const d = new Date(r.createdAt);
      if (d.getFullYear() === viewYear && d.getMonth() === viewMonth) {
        map.set(d.getDate(), (map.get(d.getDate()) ?? 0) + 1);
      }
    }
    return map;
  }, [practiceRecords, viewYear, viewMonth]);

  /* practice-first timeline; journal-linked feedback nests under that practice date */
  const groupedTimeline = useMemo(() => {
    const completed = db.feedbackOrders.filter(
      (o) => matchesStudentScope(studentId, o.studentId) && o.status === "completed",
    );
    const usedOrderIds = new Set<string>();
    const usedRecordIds = new Set<string>();

    const feedbackByRecordId = new Map<string, FeedbackOrder>();

    for (const order of completed) {
      const direct = practiceRecords.find(
        (record) => !usedRecordIds.has(record.id) && orderMatchesPractice(order, record),
      );
      const matched = direct ?? softMatchPractice(order, practiceRecords, usedRecordIds);
      if (!matched) continue;
      usedOrderIds.add(order.id);
      usedRecordIds.add(matched.id);
      feedbackByRecordId.set(matched.id, order);
    }

    const items: PracticeTimelineItem[] = practiceRecords.map((record) => {
      const matched = feedbackByRecordId.get(record.id);
      const master = matched
        ? db.masters.find((m) => m.id === matched.masterId)
        : undefined;
      return {
        record,
        feedback: matched
          ? { order: matched, masterTitle: master?.title ?? "마스터" }
          : undefined,
      };
    });

    // 일지 없이 신청한 피드백 → 완료일이 아니라 신청(결제)일로 표시
    for (const o of completed) {
      if (usedOrderIds.has(o.id)) continue;
      const master = db.masters.find((m) => m.id === o.masterId);
      items.push({
        record: {
          id: `feedback-only-${o.id}`,
          studentId: o.studentId,
          title: o.mediaLabel,
          durationSec: o.mediaDurationSec ?? 0,
          mediaUrl: o.mediaUrl,
          createdAt: o.paidAt ?? o.createdAt,
        },
        feedback: { order: o, masterTitle: master?.title ?? "마스터" },
      });
    }

    items.sort(
      (a, b) =>
        new Date(b.record.createdAt).getTime() - new Date(a.record.createdAt).getTime(),
    );

    const todayKey = toDateKey(now);
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayKey = toDateKey(yesterday);

    const visible = selectedKey
      ? items.filter((item) => toDateKey(new Date(item.record.createdAt)) === selectedKey)
      : items;

    const groups: DateGroup[] = [];
    for (const item of visible) {
      const iso = item.record.createdAt;
      const dateKey = toDateKey(new Date(iso));
      const dateLabel =
        dateKey === todayKey
          ? "오늘"
          : dateKey === yesterdayKey
            ? "어제"
            : formatRecordDate(iso);

      const last = groups[groups.length - 1];
      if (last && last.dateKey === dateKey) last.items.push(item);
      else groups.push({ dateLabel, dateKey, items: [item] });
    }
    return groups;
  }, [practiceRecords, db.feedbackOrders, db.masters, studentId, selectedKey]);

  /* month nav */
  const prevMonth = () => {
    if (viewMonth === 0) {
      setViewYear(viewYear - 1);
      setViewMonth(11);
    } else {
      setViewMonth(viewMonth - 1);
    }
  };
  const nextMonth = () => {
    const isCurrentMonth = viewYear === now.getFullYear() && viewMonth === now.getMonth();
    if (isCurrentMonth) return;
    if (viewMonth === 11) {
      setViewYear(viewYear + 1);
      setViewMonth(0);
    } else {
      setViewMonth(viewMonth + 1);
    }
  };
  const isCurrentMonth = viewYear === now.getFullYear() && viewMonth === now.getMonth();

  /* force re-render on db change */
  const [, setTick] = useState(0);
  useEffect(() => {
    const refresh = () => setTick((t) => t + 1);
    window.addEventListener("eum-db-updated", refresh);
    return () => window.removeEventListener("eum-db-updated", refresh);
  }, []);

  return (
    <>
      {/* header */}
      <header className="safe-top sticky top-0 z-50 border-b border-gray-50 bg-white/90 px-6 pb-4 backdrop-blur-xl">
        <div className="text-xl font-extrabold tracking-tight text-gray-900">연습일지</div>
      </header>

      <main className="flex flex-col px-5 pt-5 pb-28">
        {/* ── 월간 히트맵 ── */}
        <section className="mb-6">
          <div className="shadow-float rounded-[24px] border border-gray-100 bg-white p-5">
            {/* month nav */}
            <div className="mb-4 flex items-center justify-between">
              <button type="button" onClick={prevMonth} className="flex h-8 w-8 items-center justify-center rounded-full text-gray-400 hover:bg-gray-50">
                <i className="fa-solid fa-chevron-left text-[12px]" />
              </button>
              <span className="text-[15px] font-bold text-gray-900">
                {viewYear}년 {viewMonth + 1}월
              </span>
              <button
                type="button"
                onClick={nextMonth}
                disabled={isCurrentMonth}
                className="flex h-8 w-8 items-center justify-center rounded-full text-gray-400 hover:bg-gray-50 disabled:opacity-30"
              >
                <i className="fa-solid fa-chevron-right text-[12px]" />
              </button>
            </div>

            {/* day headers */}
            <div className="mb-2 grid grid-cols-7 text-center text-[11px] font-medium text-gray-400">
              {["월", "화", "수", "목", "금", "토", "일"].map((d) => (
                <span key={d}>{d}</span>
              ))}
            </div>

            {/* grid */}
            <div className="grid grid-cols-7 gap-1">
              {monthGrid.map((day, i) => {
                if (day === null) return <div key={`e-${i}`} />;
                const dateKey = toDateKey(new Date(viewYear, viewMonth, day));
                const todayKey = toDateKey(now);
                const isFuture = dateKey > todayKey;
                const isSelected = selectedKey === dateKey;
                const isToday = dateKey === todayKey;
                const count = dayCountMap.get(day) ?? 0;
                const intensity =
                  count === 0
                    ? "bg-gray-50"
                    : count === 1
                      ? "bg-brand-100"
                      : count === 2
                        ? "bg-brand-300"
                        : "bg-brand-500";

                return (
                  <button
                    key={day}
                    type="button"
                    disabled={isFuture}
                    aria-pressed={isSelected}
                    aria-label={`${viewMonth + 1}월 ${day}일`}
                    onClick={() => setSelectedKey((prev) => (prev === dateKey ? null : dateKey))}
                    className={`flex aspect-square items-center justify-center rounded-lg text-[12px] font-medium transition-colors ${intensity} ${
                      isSelected
                        ? "ring-2 ring-brand-500 ring-offset-1"
                        : isToday
                          ? "ring-1 ring-brand-300"
                          : ""
                    } ${
                      count > 0 ? (count >= 3 ? "text-white" : "text-brand-700") : "text-gray-400"
                    } ${isFuture ? "cursor-default opacity-40" : "active:scale-95"}`}
                  >
                    {day}
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        {/* ── 주간 요약 ── */}
        <section className="mb-6 grid grid-cols-3 gap-3">
          <div className="shadow-soft rounded-[20px] border border-gray-100 bg-white p-4 text-center">
            <div className="mb-1 text-[20px] font-extrabold text-brand-500">
              {streak}
            </div>
            <div className="text-[11px] font-medium text-gray-400">연속일</div>
          </div>
          <div className="shadow-soft rounded-[20px] border border-gray-100 bg-white p-4 text-center">
            <div className="mb-1 text-[20px] font-extrabold text-gray-900">
              {weekStats.days}
              <span className="text-[13px] font-bold text-gray-400">일</span>
            </div>
            <div className="text-[11px] font-medium text-gray-400">이번 주</div>
          </div>
          <Link
            href="/daily/feedback"
            className="shadow-soft rounded-[20px] border border-gray-100 bg-white p-4 text-center transition active:bg-brand-50"
          >
            <div className="mb-1 text-[20px] font-extrabold text-gray-900">
              {totalFeedbackCount}
            </div>
            <div className="text-[11px] font-medium text-gray-400">총 피드백 수</div>
          </Link>
        </section>

        {/* ── 오늘 연습 올리기 ── */}
        <section className="mb-8">
          <div className="shadow-soft flex flex-col items-center rounded-[24px] border border-gray-100 bg-white p-6 text-center">
            <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-brand-50 text-[22px] text-brand-500">
              <i className="fa-solid fa-video" />
            </div>
            <h4 className="mb-1 text-[15px] font-bold text-gray-900">오늘 연습 기록하기</h4>
            <p className="mb-4 text-[12px] text-gray-500">영상을 올리고 메모를 남겨보세요</p>
            <RecordModal />
          </div>
        </section>

        {/* ── 기록 ── */}
        <section>
          <div className="mb-4 flex items-center justify-between gap-3">
            <h3 className="text-[17px] font-bold tracking-tight text-gray-900">
              {selectedKey
                ? `${new Date(`${selectedKey}T12:00:00`).getMonth() + 1}월 ${new Date(`${selectedKey}T12:00:00`).getDate()}일 기록`
                : "기록"}
            </h3>
            {selectedKey && (
              <button
                type="button"
                onClick={() => setSelectedKey(null)}
                className="text-[12px] font-medium text-gray-400"
              >
                전체보기
              </button>
            )}
          </div>

          {groupedTimeline.length === 0 ? (
            <div className="rounded-[20px] border border-gray-100 bg-white p-8 text-center text-[13px] text-gray-400">
              {selectedKey ? "이 날 기록이 없어요" : "아직 기록이 없어요"}
            </div>
          ) : (
            <div className="flex flex-col gap-8">
              {groupedTimeline.map((group) => (
                <div key={group.dateKey}>
                  {!selectedKey && (
                    <p className="mb-3 text-[12px] font-bold tracking-wide text-gray-400">
                      {group.dateLabel}
                    </p>
                  )}

                  <div className="flex flex-col gap-3">
                    {group.items.map(({ record: r, feedback }) => {
                      const isFeedbackOnly = r.id.startsWith("feedback-only-");
                      return (
                        <article
                          key={r.id}
                          className="overflow-hidden rounded-[20px] border border-gray-100 bg-white"
                        >
                          {!isFeedbackOnly && (
                            <details className="group">
                              <summary className="flex cursor-pointer list-none items-start justify-between gap-3 px-4 py-4 [&::-webkit-details-marker]:hidden">
                                <div className="min-w-0 flex-1">
                                  <p className="text-[14px] font-bold text-gray-900">{practiceTitle(r.title)}</p>
                                  {r.memo && (
                                    <p className="mt-1 line-clamp-2 text-[12px] leading-relaxed text-gray-500">
                                      {r.memo}
                                    </p>
                                  )}
                                  <p className="mt-1.5 text-[11px] font-medium tabular-nums text-gray-400">
                                    {formatTime(r.durationSec)}
                                  </p>
                                </div>
                                <i className="fa-solid fa-chevron-down mt-1 shrink-0 text-[10px] text-gray-300 transition-transform group-open:rotate-180" />
                              </summary>
                              <div className="space-y-3 px-4 pb-4">
                                {r.memo && (
                                  <p className="whitespace-pre-wrap text-[13px] leading-relaxed text-gray-600">
                                    {r.memo}
                                  </p>
                                )}
                                {r.mediaUrl && (
                                  <video
                                    src={r.mediaUrl}
                                    controls
                                    playsInline
                                    className="w-full rounded-xl bg-black"
                                  />
                                )}
                              </div>
                            </details>
                          )}

                          {isFeedbackOnly && (
                            <div className="px-4 py-4">
                              <p className="text-[14px] font-bold text-gray-900">{r.title}</p>
                              {r.durationSec > 0 && (
                                <p className="mt-1 text-[11px] font-medium tabular-nums text-gray-400">
                                  {formatTime(r.durationSec)}
                                </p>
                              )}
                            </div>
                          )}

                          {feedback && (
                            <div
                              className={`flex items-center justify-between gap-3 border-t border-gray-50 bg-gray-50/80 px-4 py-3 ${
                                isFeedbackOnly ? "border-t-0 pt-0" : ""
                              }`}
                            >
                              <div className="min-w-0">
                                <p className="text-[12px] font-bold text-gray-800">
                                  {feedback.masterTitle} 피드백
                                </p>
                                {feedback.order.timestampComments[0] && (
                                  <p className="mt-0.5 line-clamp-1 text-[11px] text-gray-500">
                                    {formatTime(commentPreviewTime(feedback.order))} ·{" "}
                                    {feedback.order.timestampComments[0].text}
                                  </p>
                                )}
                              </div>
                              <Link
                                href={`/feedback/${feedback.order.id}`}
                                className="shrink-0 rounded-lg bg-gray-900 px-3 py-1.5 text-[11px] font-bold text-white"
                              >
                                보기
                              </Link>
                            </div>
                          )}
                        </article>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </>
  );
}
