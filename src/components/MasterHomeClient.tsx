"use client";

import Link from "next/link";
import { type ReactNode } from "react";
import { BrandLogo } from "@/components/BrandLogo";
import { useDb } from "@/lib/db/use-db";
import { useSession } from "@/lib/auth/use-session";
import { useMasterId } from "@/lib/auth/use-master-id";
import { toTelHref } from "@/lib/phone-call";
import {
  formatDeadlineLabel,
  formatKoreanDate,
  formatTimeLabel,
  getStudentName,
  getTodayPhoneReservations,
  getTodayVisitReservations,
  matchesMasterScope,
} from "@/lib/master-utils";
import { getMasterReminders } from "@/lib/reminders";
import { formatFeedbackMediaLabel, isFeedbackVideo } from "@/lib/feedback-pricing";
import type { FeedbackOrder, Reservation } from "@/lib/db/schema";
import { formatPrice } from "@/lib/db/schema";

export function MasterHomeClient() {
  const db = useDb();
  const { session } = useSession();
  const masterId = useMasterId();
  const master =
    db.masters.find((m) => m.id === masterId) ??
    (session?.id ? db.masters.find((m) => m.userId === session.id) : undefined) ??
    (session?.masterId ? db.masters.find((m) => m.id === session.masterId) : undefined);
  const activeMasterId = master?.id || masterId;

  // 마스터 홈은 DbProvider 캐시/갱신을 그대로 사용 (진입마다 풀 리프레시하지 않음)
  const pendingFeedback = db.feedbackOrders
    .filter(
      (o) =>
        matchesMasterScope(activeMasterId, o.masterId) &&
        (o.status === "paid" || o.status === "in_review"),
    )
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  const todayPhone = getTodayPhoneReservations(db, activeMasterId);
  const todayVisit = getTodayVisitReservations(db, activeMasterId);
  const todayCount = pendingFeedback.length + todayPhone.length + todayVisit.length;
  const reminders = getMasterReminders(db, activeMasterId);
  const tomorrowReminders = reminders.filter((r) => r.kind === "tomorrow");

  return (
    <>
      <div className="relative overflow-hidden bg-white px-6 pb-6 safe-top-pad">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-48 bg-gradient-to-b from-brand-50/90 to-white" />

        <header className="safe-top relative mb-8 flex items-center justify-between">
          <BrandLogo variant="dark" suffix="파트너스" />
          <Link
            href="/master/schedule"
            aria-label="일정 알림"
            className="relative flex h-9 w-9 items-center justify-center rounded-full bg-surface text-gray-500 transition hover:bg-gray-100"
          >
            <i className="fa-regular fa-bell text-[15px]" />
            {reminders.length > 0 && (
              <span className="absolute top-1.5 right-1.5 h-1.5 w-1.5 rounded-full bg-master-500" />
            )}
          </Link>
        </header>

        <div className="relative mb-6">
          <p className="mb-1.5 text-[13px] font-medium text-gray-400">{formatKoreanDate()}</p>
          <h1 className="text-[24px] font-extrabold leading-tight tracking-tight text-gray-900">
            {(() => {
              const raw = (master?.name ?? session?.name ?? "")
                .replace(/\s*마스터님?$/, "")
                .replace(/\s*마스터$/, "")
                .trim();
              return raw ? `${raw} 마스터님,` : "마스터님,";
            })()}
            <br />
            오늘{" "}
            <span className="text-master-500">{todayCount}건</span>
            의 할 일이 있어요
          </h1>
        </div>

        <div className="relative grid grid-cols-3 gap-2">
          <StatCell label="피드백" value={`${pendingFeedback.length}`} unit="건" />
          <StatCell label="전화" value={`${todayPhone.length}`} unit="건" />
          <StatCell label="방문" value={`${todayVisit.length}`} unit="건" />
        </div>
      </div>

      <main className="flex flex-col gap-7 px-5 pt-2 pb-4">
        {tomorrowReminders.length > 0 && (
          <section>
            <h2 className="mb-3 text-[16px] font-bold text-gray-900">내일 예정</h2>
            <div className="flex flex-col gap-2">
              {tomorrowReminders.map((r) => (
                <Link
                  key={r.id}
                  href={r.href}
                  className="flex items-center justify-between rounded-[16px] border border-brand-100 bg-brand-50/80 px-4 py-3"
                >
                  <div>
                    <p className="text-[14px] font-bold text-gray-900">{r.title}</p>
                    <p className="text-[12px] text-gray-500">{r.subtitle}</p>
                  </div>
                  <i className="fa-solid fa-chevron-right text-[11px] text-gray-300" />
                </Link>
              ))}
            </div>
          </section>
        )}

        {pendingFeedback.length > 0 && (
          <Link
            href="/master/feedback"
            className="flex items-center justify-between rounded-[16px] border border-brand-100 bg-brand-50/80 px-4 py-3.5"
          >
            <div>
              <p className="text-[14px] font-bold text-gray-900">대기 중인 피드백이 있어요</p>
              <p className="mt-0.5 text-[12px] text-gray-500">
                {pendingFeedback.length}건 답변을 기다리고 있어요
              </p>
            </div>
            <i className="fa-solid fa-chevron-right text-[11px] text-gray-300" />
          </Link>
        )}

        <TaskSection
          title="피드백"
          count={pendingFeedback.length}
          empty="대기 중인 피드백이 없어요"
          href="/master/feedback"
        >
          {pendingFeedback.slice(0, 3).map((o) => (
            <FeedbackTaskCard
              key={o.id}
              order={o}
              studentName={getStudentName(db, o.studentId)}
            />
          ))}
          {pendingFeedback.length > 3 && (
            <Link href="/master/feedback" className="text-center text-[13px] font-bold text-master-500">
              {pendingFeedback.length - 3}건 더 보기
            </Link>
          )}
        </TaskSection>

        <TaskSection
          title="전화 상담"
          count={todayPhone.length}
          empty="전화 일정이 없어요"
          href="/master/consultations/phone"
        >
          {todayPhone.slice(0, 3).map((r) => (
            <ReservationTaskCard
              key={r.id}
              reservation={r}
              studentName={getStudentName(db, r.studentId)}
              phoneNumber={master?.phoneNumber ?? ""}
            />
          ))}
          {todayPhone.length > 3 && (
            <Link
              href="/master/consultations/phone"
              className="text-center text-[13px] font-bold text-master-500"
            >
              {todayPhone.length - 3}건 더 보기
            </Link>
          )}
        </TaskSection>

        <TaskSection
          title="방문 상담"
          count={todayVisit.length}
          empty="방문 일정이 없어요"
          href="/master/consultations/visit"
        >
          {todayVisit.slice(0, 3).map((r) => (
            <ReservationTaskCard
              key={r.id}
              reservation={r}
              studentName={getStudentName(db, r.studentId)}
              phoneNumber={master?.phoneNumber ?? ""}
            />
          ))}
          {todayVisit.length > 3 && (
            <Link
              href="/master/consultations/visit"
              className="text-center text-[13px] font-bold text-master-500"
            >
              {todayVisit.length - 3}건 더 보기
            </Link>
          )}
        </TaskSection>
      </main>
    </>
  );
}

function StatCell({
  label,
  value,
  unit,
}: {
  label: string;
  value: string;
  unit: string;
}) {
  return (
    <div className="rounded-[18px] border border-gray-100 bg-white px-3 py-3.5 text-center shadow-soft">
      <div className="mb-1 text-[11px] font-medium text-gray-400">{label}</div>
      <div className="text-[18px] font-extrabold tracking-tight text-gray-900">
        {value}
        <span className="ml-0.5 text-[11px] font-semibold text-gray-400">{unit}</span>
      </div>
    </div>
  );
}

function TaskSection({
  title,
  count,
  empty,
  href,
  children,
}: {
  title: string;
  count: number;
  empty: string;
  href: string;
  children: ReactNode;
}) {
  return (
    <section>
      <div className="mb-3 flex items-center justify-between px-1">
        <h3 className="text-[15px] font-bold tracking-tight text-gray-900">
          {title}
          {count > 0 && (
            <span className="ml-1.5 text-[13px] font-bold text-master-500">{count}</span>
          )}
        </h3>
        <Link href={href} className="text-[12px] font-medium text-gray-400 hover:text-gray-600">
          전체보기
        </Link>
      </div>
      {count === 0 ? (
        <div className="rounded-[20px] border border-dashed border-gray-200 bg-white px-4 py-6 text-center text-[13px] text-gray-400">
          {empty}
        </div>
      ) : (
        <div className="flex flex-col gap-3">{children}</div>
      )}
    </section>
  );
}

export function FeedbackTaskCard({
  order,
  studentName,
  actionLabel,
}: {
  order: FeedbackOrder;
  studentName: string;
  actionLabel?: string;
}) {
  const video = isFeedbackVideo(order);
  const mediaLabel = formatFeedbackMediaLabel(order.mediaLabel, video);
  const pending = order.status === "paid" || order.status === "in_review";
  const label =
    actionLabel ??
    (order.status === "completed"
      ? "피드백 보기"
      : order.status === "cancelled"
        ? "취소됨"
        : "피드백 작성");

  return (
    <Link
      href={`/master/feedback/${order.id}`}
      className="block rounded-[22px] border border-gray-100 bg-white p-5 shadow-soft transition hover:border-gray-200"
    >
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="mb-1 flex items-center gap-2">
            <span className="rounded-md bg-brand-50 px-2 py-0.5 text-[10px] font-bold tracking-wide text-master-500">
              {video ? "영상" : "음성"}
            </span>
            <span className="text-[12px] font-medium text-gray-400">
              {pending
                ? formatDeadlineLabel(order.createdAt)
                : order.status === "completed"
                  ? "완료"
                  : "취소"}
            </span>
          </div>
          <h4 className="truncate text-[16px] font-bold text-gray-900">{studentName}</h4>
        </div>
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface text-master-500">
          <i className={`fa-solid ${video ? "fa-video" : "fa-headphones"} text-[14px]`} />
        </div>
      </div>

      <p className="mb-1 line-clamp-2 text-[13px] leading-relaxed text-gray-600">
        {order.studentMessage || "요청 메시지가 없어요"}
      </p>
      <p className="mb-4 text-[12px] font-medium text-gray-400">{mediaLabel}</p>

      <div
        className={`flex items-center justify-between rounded-xl px-4 py-3 ${
          pending ? "bg-gray-900" : "bg-gray-100"
        }`}
      >
        <span className={`text-[13px] font-bold ${pending ? "text-white" : "text-gray-600"}`}>
          {label}
        </span>
        <i
          className={`fa-solid fa-arrow-right text-[12px] ${pending ? "text-white/70" : "text-gray-400"}`}
        />
      </div>
    </Link>
  );
}

export function ReservationTaskCard({
  reservation,
  studentName,
  phoneNumber,
  whenLabel,
}: {
  reservation: Reservation;
  studentName: string;
  phoneNumber: string;
  whenLabel?: string;
}) {
  const isPhone = reservation.type === "phone";
  const time = whenLabel ?? formatTimeLabel(reservation.scheduledAt);
  const question = reservation.preQuestion || (isPhone ? "전화 상담 예약" : "방문 상담 예약");
  const active = reservation.status === "scheduled";

  return (
    <div className="rounded-[22px] border border-gray-100 bg-white p-5 shadow-soft">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="mb-1 flex items-center gap-2">
            <span
              className={`rounded-md px-2 py-0.5 text-[10px] font-bold tracking-wide ${
                isPhone
                  ? "bg-emerald-50 text-emerald-600"
                  : "bg-amber-50 text-amber-700"
              }`}
            >
              {isPhone ? "전화" : "방문"}
            </span>
            <span className="text-[12px] font-bold text-master-500">{time}</span>
            {reservation.durationMin ? (
              <span className="text-[12px] font-medium text-gray-400">
                {reservation.durationMin}분
              </span>
            ) : null}
            {!active && (
              <span className="text-[11px] font-medium text-gray-400">
                {reservation.status === "completed" ? "완료" : "취소"}
              </span>
            )}
          </div>
          <h4 className="truncate text-[16px] font-bold text-gray-900">{studentName}</h4>
        </div>
        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface ${
            isPhone ? "text-emerald-600" : "text-amber-600"
          }`}
        >
          <i className={`fa-solid ${isPhone ? "fa-phone" : "fa-location-dot"} text-[13px]`} />
        </div>
      </div>

      <p className="mb-1 line-clamp-2 text-[13px] leading-relaxed text-gray-600">{question}</p>
      <p className="mb-4 text-[12px] font-medium text-gray-400">
        {formatPrice(reservation.priceAtPurchase)}원
      </p>

      {!active ? (
        <div className="flex items-center justify-between rounded-xl bg-gray-100 px-4 py-3">
          <span className="text-[13px] font-bold text-gray-600">
            {reservation.status === "completed" ? "상담 완료" : "예약 취소"}
          </span>
        </div>
      ) : isPhone ? (
        phoneNumber ? (
          <a
            href={toTelHref(phoneNumber)}
            className="flex items-center justify-between rounded-xl bg-master-500 px-4 py-3"
          >
            <span className="text-[13px] font-bold text-white">전화 연결</span>
            <i className="fa-solid fa-arrow-right text-[12px] text-white/70" />
          </a>
        ) : (
          <p className="text-[12px] text-gray-400">등록된 연락처가 없어요</p>
        )
      ) : (
        <div className="flex items-center justify-between rounded-xl bg-gray-900 px-4 py-3">
          <span className="text-[13px] font-bold text-white">방문 일정 확인</span>
          <span className="text-[12px] font-medium text-white/60">{time}</span>
        </div>
      )}
    </div>
  );
}
