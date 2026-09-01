"use client";

import Link from "next/link";
import { EumLogo } from "@/components/EumLogo";
import { useDb } from "@/lib/db/use-db";
import { useSession } from "@/lib/auth/use-session";
import { useMasterId } from "@/lib/auth/use-master-id";
import { toTelHref } from "@/lib/phone-call";
import {
  formatDeadlineLabel,
  formatKoreanDate,
  formatManWon,
  formatTimeLabel,
  getMasterPendingAmount,
  getStudentName,
  getTodayPhoneReservations,
  isUrgentFeedback,
} from "@/lib/master-utils";

export function MasterHomeClient() {
  const db = useDb();
  const { session } = useSession();
  const masterId = useMasterId();
  const master = db.masters.find((m) => m.id === masterId);

  const pendingFeedback = db.feedbackOrders.filter(
    (o) => o.masterId === masterId && (o.status === "paid" || o.status === "in_review"),
  );
  const todayPhone = getTodayPhoneReservations(db, masterId);
  const pendingAmount = getMasterPendingAmount(db, masterId);
  const todayCount = pendingFeedback.length + todayPhone.length;

  const urgentOrders = pendingFeedback.filter(isUrgentFeedback);
  const normalOrders = pendingFeedback.filter((o) => !isUrgentFeedback(o));

  return (
    <>
      <div className="relative rounded-b-[32px] bg-[#4f46e5] px-6 pb-16 text-white safe-top-pad">
        <header className="safe-top mb-6 flex items-center justify-between">
          <EumLogo variant="light" suffix="파트너스" />
          <button
            type="button"
            aria-label="알림"
            className="relative text-xl transition-colors hover:text-white/80"
          >
            <i className="fa-regular fa-bell" />
            {pendingFeedback.length > 0 && (
              <span className="absolute top-0 right-0 h-2 w-2 rounded-full border border-[#4f46e5] bg-red-400" />
            )}
          </button>
        </header>

        <div>
          <p className="mb-1 text-[13px] font-medium text-white/80">{formatKoreanDate()}</p>
          <h1 className="text-[24px] font-bold leading-tight">
            {master?.title ?? "마스터"}님,
            <br />
            오늘 <span className="text-yellow-300">{todayCount}건</span>의 일정이 있어요.
          </h1>
        </div>

        <div className="absolute -bottom-10 left-6 right-6 flex items-center justify-between rounded-[20px] border border-gray-100 bg-white p-5 shadow-soft">
          <div className="flex-1 border-r border-gray-100 text-center">
            <div className="mb-1 text-[11px] font-bold text-gray-400">대기중 피드백</div>
            <div className="text-[20px] font-extrabold text-gray-900">
              {pendingFeedback.length}
              <span className="ml-0.5 text-[12px] font-semibold text-gray-500">건</span>
            </div>
          </div>
          <div className="flex-1 border-r border-gray-100 text-center">
            <div className="mb-1 text-[11px] font-bold text-gray-400">오늘 전화상담</div>
            <div className="text-[20px] font-extrabold text-gray-900">
              {todayPhone.length}
              <span className="ml-0.5 text-[12px] font-semibold text-gray-500">건</span>
            </div>
          </div>
          <div className="flex-1 text-center">
            <div className="mb-1 text-[11px] font-bold text-[#4f46e5]">입금예정</div>
            <div className="text-[16px] font-extrabold text-gray-900">
              {formatManWon(pendingAmount)}
              <span className="ml-0.5 text-[12px] font-semibold text-gray-500">만</span>
            </div>
          </div>
        </div>
      </div>

      <main className="flex flex-col px-6 pt-16 pb-24">
        <section className="mb-8">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-[15px] font-bold text-gray-800">오늘의 할 일</h3>
            <Link
              href="/master/schedule"
              className="text-[12px] font-medium text-gray-400 transition-colors hover:text-gray-600"
            >
              <i className="fa-solid fa-list-check mr-1" />
              전체보기
            </Link>
          </div>

          <div className="flex flex-col gap-3">
            {pendingFeedback.length === 0 && todayPhone.length === 0 ? (
              <p className="rounded-[16px] border border-gray-100 bg-white p-6 text-center text-[13px] text-gray-400 shadow-soft">
                오늘 할 일이 없어요
              </p>
            ) : (
              <>
                {urgentOrders.map((o) => (
                  <FeedbackTaskCard
                    key={o.id}
                    order={o}
                    studentName={getStudentName(db, o.studentId)}
                    urgent
                  />
                ))}

                {todayPhone.map((r) => (
                  <PhoneTaskCard
                    key={r.id}
                    studentName={getStudentName(db, r.studentId)}
                    time={formatTimeLabel(r.scheduledAt)}
                    question={r.preQuestion ?? "전화 상담 예약"}
                    phoneNumber={master?.phoneNumber ?? ""}
                  />
                ))}

                {normalOrders.map((o) => (
                  <FeedbackTaskCard
                    key={o.id}
                    order={o}
                    studentName={getStudentName(db, o.studentId)}
                  />
                ))}
              </>
            )}
          </div>
        </section>
      </main>
    </>
  );
}

function FeedbackTaskCard({
  order,
  studentName,
  urgent = false,
}: {
  order: { id: string; studentMessage: string; createdAt: string };
  studentName: string;
  urgent?: boolean;
}) {
  return (
    <div className="group flex items-start gap-4 rounded-[16px] border border-gray-100 bg-white p-5 shadow-soft transition-colors hover:border-gray-200">
      <div
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
          urgent ? "bg-red-50 text-red-500" : "bg-gray-50 text-gray-400"
        }`}
      >
        <i className="fa-solid fa-microphone-lines" />
      </div>
      <div className="flex-1">
        <div className="mb-1 flex items-center justify-between">
          <span className="text-[15px] font-bold text-gray-900">{studentName} 수강생</span>
          <span
            className={`flex items-center gap-1 text-[11px] font-bold ${
              urgent ? "text-red-500" : "font-medium text-gray-400"
            } ${urgent ? "" : "text-[12px]"}`}
          >
            {urgent && <i className="fa-regular fa-clock" />}
            {formatDeadlineLabel(order.createdAt)}
          </span>
        </div>
        <p className="mb-4 text-[13px] font-medium text-gray-500">{order.studentMessage}</p>
        <div className="flex gap-2">
          <Link
            href={`/master/feedback/${order.id}`}
            className="h-[36px] rounded-lg border border-gray-100 bg-surface px-4 text-[13px] font-bold text-gray-600 transition hover:bg-gray-100"
          >
            음원 듣기
          </Link>
          <Link
            href={`/master/feedback/${order.id}`}
            className="h-[36px] flex-1 rounded-lg bg-gray-900 text-center text-[13px] font-bold leading-[36px] text-white transition hover:bg-gray-800"
          >
            구간별 피드백 작성
          </Link>
        </div>
      </div>
    </div>
  );
}

function PhoneTaskCard({
  studentName,
  time,
  question,
  phoneNumber,
}: {
  studentName: string;
  time: string;
  question: string;
  phoneNumber: string;
}) {
  return (
    <div className="group flex items-start gap-4 rounded-[16px] border border-gray-100 bg-white p-5 shadow-soft transition-colors hover:border-gray-200">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-[#4f46e5]">
        <i className="fa-solid fa-phone" />
      </div>
      <div className="flex-1">
        <div className="mb-1 flex items-center justify-between">
          <span className="text-[15px] font-bold text-gray-900">{studentName} 수강생</span>
          <span className="text-[13px] font-bold text-[#4f46e5]">{time}</span>
        </div>
        <p className="mb-4 text-[13px] font-medium text-gray-500">{question}</p>
        {phoneNumber ? (
          <a
            href={toTelHref(phoneNumber)}
            className="flex h-[36px] flex-1 items-center justify-center rounded-lg bg-[#4f46e5] text-[13px] font-bold text-white shadow-sm transition hover:bg-indigo-700"
          >
            전화 상담 연결
          </a>
        ) : (
          <span className="text-[12px] text-gray-400">등록된 연락처가 없어요</span>
        )}
      </div>
    </div>
  );
}
