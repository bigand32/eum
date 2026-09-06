"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { cancelFeedbackOrder, cancelReservation } from "@/lib/db/api";
import { useStudentId } from "@/lib/auth/use-student-id";
import { matchesStudentScope } from "@/lib/student-utils";
import { useDb } from "@/lib/db/use-db";
import { toTelHref } from "@/lib/phone-call";
import {
  formatDateKo,
  formatFeedbackDeadlineLabel,
  formatTimeKo,
  listStudentPendingFeedback,
  listStudentUpcomingReservations,
} from "@/lib/reminders";

function CoachingStepBar({ timeLabel }: { timeLabel: string }) {
  return (
    <div className="mb-4 flex flex-col items-center rounded-[16px] bg-brand-50/50 p-4">
      <div className="mb-3 flex items-center gap-1 text-[12px] font-bold text-brand-500">
        <span className="relative mr-0.5 flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand-400 opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-brand-500" />
        </span>
        {timeLabel} 시작
      </div>

      <div className="relative flex w-full items-center justify-between px-2">
        <div className="absolute top-1/2 right-6 left-6 z-0 h-0.5 -translate-y-1/2 bg-gray-200" />
        <div className="absolute top-1/2 right-1/2 left-6 z-0 h-0.5 -translate-y-1/2 bg-brand-500" />

        <div className="z-10 flex flex-col items-center gap-1.5">
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-500 text-[10px] font-bold text-white shadow-sm">
            <i className="fa-solid fa-check" />
          </div>
          <span className="text-[10px] font-bold text-brand-500">확정</span>
        </div>
        <div className="z-10 flex flex-col items-center gap-1.5">
          <div className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-brand-500 bg-white text-[10px] font-bold text-brand-500 shadow-sm">
            2
          </div>
          <span className="text-[10px] font-bold text-brand-500">대기중</span>
        </div>
        <div className="z-10 flex flex-col items-center gap-1.5">
          <div className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-gray-200 bg-white text-[10px] font-bold text-gray-300">
            3
          </div>
          <span className="text-[10px] font-semibold text-gray-400">코칭완료</span>
        </div>
      </div>
    </div>
  );
}

export function ReservationListView() {
  const searchParams = useSearchParams();
  const [tab, setTab] = useState<"upcoming" | "past">("upcoming");
  const [showBookedBanner, setShowBookedBanner] = useState(false);
  const db = useDb();
  const studentId = useStudentId();

  useEffect(() => {
    if (searchParams.get("booked") === "1") {
      setShowBookedBanner(true);
      setTab("upcoming");
      const t = window.setTimeout(() => setShowBookedBanner(false), 6000);
      return () => window.clearTimeout(t);
    }
  }, [searchParams]);

  const upcomingReservations = useMemo(
    () => listStudentUpcomingReservations(db, studentId),
    [db, studentId],
  );
  const pendingFeedbacks = useMemo(
    () => listStudentPendingFeedback(db, studentId),
    [db, studentId],
  );
  const completedOrders = db.feedbackOrders.filter(
    (o) => matchesStudentScope(studentId, o.studentId) && o.status === "completed",
  );

  const handleCancelReservation = async (id: string) => {
    if (!window.confirm("예약을 취소할까요?")) return;
    await cancelReservation(id);
  };

  const handleCancelFeedback = async (id: string) => {
    if (!window.confirm("피드백 요청을 취소할까요?")) return;
    await cancelFeedbackOrder(id);
  };

  const hasUpcoming =
    upcomingReservations.length > 0 || pendingFeedbacks.length > 0;

  return (
    <div className="bg-surface min-h-screen">
      <header className="safe-top sticky top-0 z-50 border-b border-gray-100 bg-white/95 px-5 pb-0 backdrop-blur-md">
        <h1 className="mb-4 text-[22px] font-extrabold tracking-tight text-gray-900">예약 내역</h1>

        <div className="relative flex text-[15px] font-bold">
          <button
            type="button"
            onClick={() => setTab("upcoming")}
            className={`flex-1 pb-3 transition-colors ${
              tab === "upcoming" ? "text-brand-500" : "text-gray-400 hover:text-gray-600"
            }`}
          >
            다가오는 코칭
            {hasUpcoming && (
              <span className="ml-1.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-brand-500 px-1.5 text-[11px] font-bold text-white">
                {upcomingReservations.length + pendingFeedbacks.length}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => setTab("past")}
            className={`flex-1 pb-3 transition-colors ${
              tab === "past" ? "text-brand-500" : "text-gray-400 hover:text-gray-600"
            }`}
          >
            지난 코칭
            {completedOrders.length > 0 && (
              <span className="ml-1.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-gray-900 px-1.5 text-[11px] font-bold text-white">
                {completedOrders.length}
              </span>
            )}
          </button>
          <div
            className="tab-indicator absolute bottom-0 left-0 h-0.5 w-1/2 rounded-t-full bg-brand-500"
            style={{ transform: tab === "past" ? "translateX(100%)" : "translateX(0)" }}
          />
        </div>
      </header>

      <main className="p-5">
        {showBookedBanner && (
          <div className="mb-4 flex items-start gap-3 rounded-[16px] border border-green-100 bg-green-50 px-4 py-3">
            <i className="fa-solid fa-circle-check mt-0.5 text-[16px] text-green-600" />
            <div className="min-w-0 flex-1">
              <p className="text-[14px] font-bold text-green-800">예약이 확정됐어요</p>
              <p className="mt-0.5 text-[12px] text-green-700">
                일정 시간에 맞춰 알림을 확인해 주세요. 마스터에게도 일정이 전달됐어요.
              </p>
            </div>
            <button
              type="button"
              aria-label="닫기"
              onClick={() => setShowBookedBanner(false)}
              className="text-green-600/70 hover:text-green-800"
            >
              <i className="fa-solid fa-xmark" />
            </button>
          </div>
        )}

        <div className={`flex-col gap-4 ${tab === "upcoming" ? "flex" : "hidden"}`}>
          {upcomingReservations.map((reservation) => {
            const master = db.masters.find((m) => m.id === reservation.masterId);
            if (!master) return null;
            const isPhone = reservation.type === "phone";
            const duration =
              reservation.durationMin ??
              (isPhone ? 30 : master.pricing.visitDurationMin);

            return (
              <div
                key={reservation.id}
                className="shadow-float relative overflow-hidden rounded-[24px] border border-gray-100 bg-white p-5"
              >
                <div className="mb-4 flex items-start justify-between">
                  <span
                    className={`rounded-md px-2.5 py-1 text-[11px] font-bold tracking-wide ${
                      isPhone
                        ? "bg-brand-50 text-brand-500"
                        : "bg-gray-900 text-white"
                    }`}
                  >
                    {isPhone ? "전화 상담" : "방문 상담"}
                  </span>
                  <span className="text-[12px] font-bold text-gray-500">예약 확정</span>
                </div>

                <div className="mb-5 flex items-center gap-3.5">
                  <img
                    src={master.avatarUrl}
                    alt=""
                    className="h-12 w-12 rounded-full border border-gray-100 object-cover shadow-sm"
                  />
                  <div>
                    <div className="mb-0.5 text-[13px] font-medium text-gray-500">
                      {formatDateKo(reservation.scheduledAt)} · {formatTimeKo(reservation.scheduledAt)}
                    </div>
                    <h3 className="text-[16px] font-bold leading-tight tracking-tight text-gray-900">
                      {master.title} {isPhone ? "전화" : "방문"} ({duration}분)
                    </h3>
                  </div>
                </div>

                <CoachingStepBar timeLabel={formatTimeKo(reservation.scheduledAt)} />

                {reservation.preQuestion ? (
                  <p className="mb-4 rounded-[12px] bg-surface px-3 py-2.5 text-[12px] leading-relaxed text-gray-600">
                    사전 질문: {reservation.preQuestion}
                  </p>
                ) : null}

                {isPhone ? (
                  <a
                    href={toTelHref(master.phoneNumber)}
                    className="flex w-full items-center justify-center gap-2 rounded-[14px] bg-brand-500 py-3.5 text-[15px] font-bold text-white shadow-[0_4px_20px_rgba(49,130,246,0.3)] transition-colors hover:bg-brand-600"
                  >
                    <i className="fa-solid fa-phone text-[14px]" />
                    바로 전화하기
                  </a>
                ) : (
                  <Link
                    href={`/masters/${master.id}`}
                    className="flex w-full items-center justify-center gap-2 rounded-[14px] bg-gray-900 py-3.5 text-[15px] font-bold text-white transition-colors hover:bg-gray-800"
                  >
                    <i className="fa-solid fa-map-location-dot text-[14px]" />
                    마스터 상세 보기
                  </Link>
                )}
                <button
                  type="button"
                  onClick={() => void handleCancelReservation(reservation.id)}
                  className="mt-2 w-full py-2 text-[12px] font-medium text-gray-400 hover:text-gray-600"
                >
                  예약 취소
                </button>
              </div>
            );
          })}

          {pendingFeedbacks.map((order) => {
            const master = db.masters.find((m) => m.id === order.masterId);
            if (!master) return null;
            return (
              <div
                key={order.id}
                className="shadow-soft rounded-[24px] border border-gray-100 bg-white p-5"
              >
                <div className="mb-3 flex items-start justify-between">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded border border-gray-200 bg-surface px-2 py-0.5 text-[10px] font-bold text-gray-600">
                      음성 피드백
                    </span>
                    <span className="text-[13px] font-medium text-gray-500">
                      {formatFeedbackDeadlineLabel(order.createdAt)}
                    </span>
                  </div>
                  <span className="rounded-md bg-brand-50 px-2 py-1 text-[12px] font-bold text-brand-500">
                    {order.status === "in_review" ? "첨삭 중" : "답변 대기중"}
                  </span>
                </div>

                <div className="mb-5 flex items-center gap-3">
                  <img
                    src={master.avatarUrl}
                    alt=""
                    className="h-12 w-12 rounded-full border border-gray-100 object-cover"
                  />
                  <div>
                    <div className="mb-0.5 text-[13px] font-medium text-gray-500">
                      {master.title}
                    </div>
                    <h3 className="text-[16px] font-bold leading-tight text-gray-900">
                      {order.mediaLabel}
                    </h3>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Link
                    href={`/feedback/${order.id}`}
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-[12px] border border-gray-200 bg-surface py-3 text-[13px] font-bold text-gray-700 transition-colors hover:bg-gray-100"
                  >
                    <i className="fa-regular fa-comment-dots" />
                    내 질문 보기
                  </Link>
                  <button
                    type="button"
                    onClick={() => void handleCancelFeedback(order.id)}
                    className="flex-1 rounded-[12px] border border-gray-200 bg-white py-3 text-[13px] font-bold text-gray-500 transition-colors hover:text-gray-900"
                  >
                    요청 취소
                  </button>
                </div>
              </div>
            );
          })}

          {!hasUpcoming && (
            <div className="rounded-[24px] border border-gray-100 bg-white p-8 text-center text-[13px] text-gray-400">
              다가오는 코칭이 없어요
              <Link href="/search" className="mt-3 block text-[13px] font-bold text-brand-500">
                마스터 찾아보기
              </Link>
            </div>
          )}
        </div>

        <div className={`flex-col gap-4 ${tab === "past" ? "flex" : "hidden"}`}>
          {completedOrders.length === 0 ? (
            <div className="rounded-[24px] border border-gray-100 bg-white p-8 text-center text-[13px] text-gray-400">
              지난 코칭 내역이 없어요
            </div>
          ) : (
            completedOrders.map((order) => {
              const master = db.masters.find((m) => m.id === order.masterId);
              const doneDate = order.completedAt
                ? `${new Date(order.completedAt).getMonth() + 1}월 ${new Date(order.completedAt).getDate()}일 완료`
                : "완료";
              const hasReview = db.studentReviews.some(
                (r) =>
                  matchesStudentScope(studentId, r.studentId) &&
                  r.masterId === order.masterId &&
                  r.productLabel.includes("피드백"),
              );
              return (
                <div
                  key={order.id}
                  className="shadow-soft rounded-[24px] border border-gray-100 bg-white p-5"
                >
                  <div className="mb-3 flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <span className="rounded bg-gray-900 px-2 py-0.5 text-[10px] font-bold text-white">
                        피드백 완료
                      </span>
                      <span className="text-[13px] font-medium text-gray-500">{doneDate}</span>
                    </div>
                  </div>

                  <div className="mb-5 flex items-center gap-3">
                    <img
                      src={master?.avatarUrl}
                      alt=""
                      className="h-12 w-12 rounded-full border border-gray-100 object-cover"
                    />
                    <div>
                      <div className="mb-0.5 text-[13px] font-medium text-gray-500">
                        {master?.title}
                      </div>
                      <h3 className="text-[16px] font-bold leading-tight text-gray-900">
                        {order.mediaLabel}
                      </h3>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2">
                    <Link
                      href={`/feedback/${order.id}`}
                      className="flex w-full items-center justify-center rounded-[12px] bg-gray-900 py-3 text-[13px] font-bold text-white transition-colors hover:bg-gray-800"
                    >
                      피드백 보기
                    </Link>
                    {!hasReview && (
                      <Link
                        href={`/feedback/${order.id}`}
                        className="flex w-full items-center justify-center rounded-[12px] border border-gray-200 py-3 text-[13px] font-bold text-gray-600 transition-colors hover:bg-gray-50"
                      >
                        리뷰 남기기
                      </Link>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </main>
    </div>
  );
}
