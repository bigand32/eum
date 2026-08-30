"use client";

import Link from "next/link";
import { useState } from "react";
import { cancelFeedbackOrder, cancelReservation } from "@/lib/db/api";
import { useStudentId } from "@/lib/auth/use-student-id";
import { useDb } from "@/lib/db/use-db";
import { toTelHref } from "@/lib/phone-call";

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"] as const;

function formatDateKo(iso: string) {
  const d = new Date(iso);
  return `${d.getMonth() + 1}월 ${d.getDate()}일 (${WEEKDAYS[d.getDay()]})`;
}

function formatTimeStart(iso: string) {
  const d = new Date(iso);
  const h = d.getHours();
  const period = h < 12 ? "오전" : "오후";
  const hour12 = h % 12 || 12;
  return `${period} ${hour12}시 ${String(d.getMinutes()).padStart(2, "0")}분 시작`;
}

function CoachingStepBar({ timeLabel }: { timeLabel: string }) {
  return (
    <div className="mb-4 flex flex-col items-center rounded-[16px] bg-brand-50/50 p-4">
      <div className="mb-3 flex items-center gap-1 text-[12px] font-bold text-brand-500">
        <span className="relative mr-0.5 flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand-400 opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-brand-500" />
        </span>
        {timeLabel}
      </div>

      <div className="relative flex w-full items-center justify-between px-2">
        <div className="absolute top-1/2 right-6 left-6 z-0 h-0.5 -translate-y-1/2 bg-gray-200" />
        <div className="absolute top-1/2 right-1/2 left-6 z-0 h-0.5 -translate-y-1/2 bg-brand-500" />

        <div className="z-10 flex flex-col items-center gap-1.5">
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-500 text-[10px] font-bold text-white shadow-sm">
            <i className="fa-solid fa-check" />
          </div>
          <span className="text-[10px] font-bold text-brand-500">예약</span>
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
  const [tab, setTab] = useState<"upcoming" | "past">("upcoming");
  const db = useDb();
  const studentId = useStudentId();

  const phoneReservation = db.reservations.find(
    (r) => r.studentId === studentId && r.status === "scheduled" && r.type === "phone",
  );
  const pendingFeedback = db.feedbackOrders.find(
    (o) => o.studentId === studentId && o.status !== "completed",
  );
  const completedOrders = db.feedbackOrders.filter(
    (o) => o.studentId === studentId && o.status === "completed",
  );
  const visitReservation = db.reservations.find(
    (r) => r.studentId === studentId && r.status === "scheduled" && r.type === "visit",
  );

  const phoneMaster = phoneReservation
    ? db.masters.find((m) => m.id === phoneReservation.masterId)
    : null;
  const pendingMaster = pendingFeedback
    ? db.masters.find((m) => m.id === pendingFeedback.masterId)
    : null;
  const visitMaster = visitReservation
    ? db.masters.find((m) => m.id === visitReservation.masterId)
    : null;

  const handleCancelReservation = async (id: string) => {
    if (!window.confirm("예약을 취소할까요?")) return;
    await cancelReservation(id);
  };

  const handleCancelFeedback = async (id: string) => {
    if (!window.confirm("피드백 요청을 취소할까요?")) return;
    await cancelFeedbackOrder(id);
  };

  return (
    <div className="bg-surface min-h-screen">
      <header className="sticky top-0 z-50 border-b border-gray-100 bg-white/95 px-5 pt-12 pb-0 backdrop-blur-md">
        <h1 className="mb-4 text-[22px] font-extrabold tracking-tight text-gray-900">예약 내역</h1>

        <div className="relative flex text-[15px] font-bold">
          <button
            id="tab-upcoming"
            type="button"
            onClick={() => setTab("upcoming")}
            className={`flex-1 pb-3 transition-colors ${
              tab === "upcoming" ? "text-brand-500" : "text-gray-400 hover:text-gray-600"
            }`}
          >
            다가오는 코칭
          </button>
          <button
            id="tab-past"
            type="button"
            onClick={() => setTab("past")}
            className={`flex-1 pb-3 transition-colors ${
              tab === "past" ? "text-brand-500" : "text-gray-400 hover:text-gray-600"
            }`}
          >
            지난 코칭
          </button>
          <div
            id="res-tab-indicator"
            className="tab-indicator absolute bottom-0 left-0 h-0.5 w-1/2 rounded-t-full bg-brand-500"
            style={{ transform: tab === "past" ? "translateX(100%)" : "translateX(0)" }}
          />
        </div>
      </header>

      <main className="p-5">
        <div
          id="upcoming-list"
          className={`flex-col gap-4 ${tab === "upcoming" ? "flex" : "hidden"}`}
        >
          {phoneReservation && phoneMaster && (
            <div className="shadow-float relative overflow-hidden rounded-[24px] border border-gray-100 bg-white p-5">
              <div className="mb-4 flex items-start justify-between">
                <span className="rounded-md bg-brand-50 px-2.5 py-1 text-[11px] font-bold tracking-wide text-brand-500">
                  전화 상담
                </span>
                <Link
                  href={`/masters/${phoneMaster.id}`}
                  className="text-[12px] font-medium text-gray-400 hover:text-gray-600"
                >
                  상세정보
                </Link>
              </div>

              <div className="mb-5 flex items-center gap-3.5">
                <img
                  src={phoneMaster.avatarUrl}
                  alt=""
                  className="h-12 w-12 rounded-full border border-gray-100 object-cover shadow-sm"
                />
                <div>
                  <div className="mb-0.5 text-[13px] font-medium text-gray-500">
                    {formatDateKo(phoneReservation.scheduledAt)}
                  </div>
                  <h3 className="text-[16px] font-bold leading-tight tracking-tight text-gray-900">
                    {phoneMaster.title} 전화 상담 ({phoneReservation.durationMin ?? 30}분)
                  </h3>
                </div>
              </div>

              <CoachingStepBar timeLabel={formatTimeStart(phoneReservation.scheduledAt)} />

              <a
                href={toTelHref(phoneMaster.phoneNumber)}
                className="flex w-full items-center justify-center gap-2 rounded-[14px] bg-brand-500 py-3.5 text-[15px] font-bold text-white shadow-[0_4px_20px_rgba(49,130,246,0.3)] transition-colors hover:bg-brand-600"
              >
                <i className="fa-solid fa-phone text-[14px]" />
                바로 전화하기
              </a>
              <button
                type="button"
                onClick={() => void handleCancelReservation(phoneReservation.id)}
                className="mt-2 w-full py-2 text-[12px] font-medium text-gray-400 hover:text-gray-600"
              >
                예약 취소
              </button>
              <p className="mt-1 text-center text-[11px] font-medium text-gray-400">
                탭하면 마스터에게 바로 전화가 연결됩니다.
              </p>
            </div>
          )}

          {pendingFeedback && pendingMaster && (
            <div className="shadow-soft rounded-[24px] border border-gray-100 bg-white p-5">
              <div className="mb-3 flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <span className="rounded border border-gray-200 bg-surface px-2 py-0.5 text-[10px] font-bold text-gray-600">
                    음성 피드백
                  </span>
                  <span className="text-[13px] font-medium text-gray-500">8월 29일 (토) 마감</span>
                </div>
                <span className="rounded-md bg-brand-50 px-2 py-1 text-[12px] font-bold text-brand-500">
                  답변 대기중
                </span>
              </div>

              <div className="mb-5 flex items-center gap-3">
                <img
                  src={pendingMaster.avatarUrl}
                  alt=""
                  className="h-12 w-12 rounded-full border border-gray-100 object-cover"
                />
                <div>
                  <div className="mb-0.5 text-[13px] font-medium text-gray-500">{pendingMaster.title}</div>
                  <h3 className="text-[16px] font-bold leading-tight text-gray-900">
                    {pendingFeedback.mediaLabel}
                  </h3>
                </div>
              </div>

              <div className="flex gap-2">
                <Link
                  href={`/feedback/${pendingFeedback.id}`}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-[12px] border border-gray-200 bg-surface py-3 text-[13px] font-bold text-gray-700 transition-colors hover:bg-gray-100"
                >
                  <i className="fa-regular fa-comment-dots" />
                  내 질문 보기
                </Link>
                <button
                  type="button"
                  onClick={() => void handleCancelFeedback(pendingFeedback.id)}
                  className="flex-1 rounded-[12px] border border-gray-200 bg-white py-3 text-[13px] font-bold text-gray-500 transition-colors hover:text-gray-900"
                >
                  일정 취소
                </button>
              </div>
            </div>
          )}

          {visitReservation && visitMaster && (
            <div className="shadow-soft rounded-[24px] border border-gray-100 bg-white p-5">
              <div className="mb-3 flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <span className="rounded bg-gray-900 px-2 py-0.5 text-[10px] font-bold text-white">
                    방문 상담
                  </span>
                  <span className="text-[13px] font-medium text-gray-500">
                    {formatDateKo(visitReservation.scheduledAt)} {formatTimeStart(visitReservation.scheduledAt).replace(" 시작", "")}
                  </span>
                </div>
                <span className="text-[12px] font-bold text-gray-500">예약 확정</span>
              </div>

              <div className="mb-5 flex items-center gap-3">
                <img
                  src={visitMaster.avatarUrl}
                  alt=""
                  className="h-12 w-12 rounded-[12px] border border-gray-100 object-cover"
                />
                <div>
                  <div className="mb-0.5 text-[13px] font-bold text-brand-500">{visitMaster.title}</div>
                  <h3 className="text-[16px] font-bold leading-tight text-gray-900">
                    방문 상담 ({visitReservation.durationMin ?? visitMaster.pricing.visitDurationMin}분)
                  </h3>
                </div>
              </div>

              <div className="flex gap-2">
                <Link
                  href={`/masters/${visitMaster.id}`}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-[12px] border border-gray-200 bg-surface py-3 text-[13px] font-bold text-gray-700 transition-colors hover:bg-gray-100"
                >
                  <i className="fa-solid fa-map-location-dot" />
                  상세 보기
                </Link>
                <button
                  type="button"
                  onClick={() => void handleCancelReservation(visitReservation.id)}
                  className="flex-1 rounded-[12px] border border-gray-200 bg-white py-3 text-[13px] font-bold text-gray-500 transition-colors hover:text-gray-900"
                >
                  예약 취소
                </button>
              </div>
            </div>
          )}

          {!phoneReservation && !pendingFeedback && !visitReservation && (
            <div className="rounded-[24px] border border-gray-100 bg-white p-8 text-center text-[13px] text-gray-400">
              다가오는 코칭이 없어요
              <Link href="/search" className="mt-3 block text-[13px] font-bold text-brand-500">
                마스터 찾아보기
              </Link>
            </div>
          )}
        </div>

        <div id="past-list" className={`flex-col gap-4 ${tab === "past" ? "flex" : "hidden"}`}>
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
              return (
                <div
                  key={order.id}
                  className="shadow-soft rounded-[24px] border border-gray-100 bg-white p-5 opacity-70"
                >
                  <div className="mb-3 flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <span className="rounded bg-gray-200 px-2 py-0.5 text-[10px] font-bold text-gray-600">
                        음성 피드백
                      </span>
                      <span className="text-[13px] font-medium text-gray-500">{doneDate}</span>
                    </div>
                    <span className="text-[12px] font-bold text-gray-400">코칭 종료</span>
                  </div>

                  <div className="mb-5 flex items-center gap-3">
                    <img
                      src={master?.avatarUrl}
                      alt=""
                      className="h-12 w-12 rounded-full border border-gray-100 object-cover grayscale"
                    />
                    <div>
                      <div className="mb-0.5 text-[13px] font-medium text-gray-500">{master?.title}</div>
                      <h3 className="text-[16px] font-bold leading-tight text-gray-900">
                        {order.mediaLabel}
                      </h3>
                    </div>
                  </div>

                  <Link
                    href={`/feedback/${order.id}`}
                    className="flex w-full items-center justify-center rounded-[12px] border border-brand-200 bg-white py-3 text-[13px] font-bold text-brand-500 transition-colors hover:bg-brand-50"
                  >
                    리뷰 작성하고 500P 받기
                  </Link>
                </div>
              );
            })
          )}
        </div>
      </main>
    </div>
  );
}
