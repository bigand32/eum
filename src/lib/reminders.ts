import type { EumDatabase, FeedbackOrder, Reservation } from "@/lib/db/schema";
import { matchesStudentScope } from "@/lib/student-utils";
import { isSameDay, matchesMasterScope } from "@/lib/master-utils";

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"] as const;

export type ReminderKind = "today" | "tomorrow" | "soon" | "feedback";

export type ScheduleReminder = {
  id: string;
  kind: ReminderKind;
  title: string;
  subtitle: string;
  href: string;
  at: number;
};

function startOfDay(d: Date) {
  const next = new Date(d);
  next.setHours(0, 0, 0, 0);
  return next;
}

export function formatDateKo(iso: string) {
  const d = new Date(iso);
  return `${d.getMonth() + 1}월 ${d.getDate()}일 (${WEEKDAYS[d.getDay()]})`;
}

export function formatTimeKo(iso: string) {
  const d = new Date(iso);
  const h = d.getHours();
  const period = h < 12 ? "오전" : "오후";
  const hour12 = h % 12 || 12;
  return `${period} ${hour12}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export function feedbackDeadline(createdAt: string) {
  return new Date(new Date(createdAt).getTime() + 24 * 60 * 60 * 1000);
}

export function formatFeedbackDeadlineLabel(createdAt: string) {
  const deadline = feedbackDeadline(createdAt);
  const now = new Date();
  const diffMs = deadline.getTime() - now.getTime();
  if (diffMs <= 0) return "마감 임박";
  if (isSameDay(deadline, now)) {
    return `오늘 ${String(deadline.getHours()).padStart(2, "0")}:${String(deadline.getMinutes()).padStart(2, "0")} 마감`;
  }
  const tomorrow = startOfDay(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  if (isSameDay(deadline, tomorrow)) {
    return `내일 ${String(deadline.getHours()).padStart(2, "0")}:${String(deadline.getMinutes()).padStart(2, "0")} 마감`;
  }
  return `${formatDateKo(deadline.toISOString())} 마감`;
}

/** 학생: 다가오는 예약·대기 피드백 알림 */
export function getStudentReminders(
  db: EumDatabase,
  studentId: string,
  now = new Date(),
): ScheduleReminder[] {
  const reminders: ScheduleReminder[] = [];
  const today = startOfDay(now);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const upcoming = db.reservations
    .filter(
      (r) =>
        matchesStudentScope(studentId, r.studentId) &&
        r.status === "scheduled" &&
        new Date(r.scheduledAt).getTime() >= now.getTime() - 30 * 60 * 1000,
    )
    .sort(
      (a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime(),
    );

  for (const r of upcoming) {
    const at = new Date(r.scheduledAt);
    const master = db.masters.find((m) => m.id === r.masterId);
    const typeLabel = r.type === "phone" ? "전화 상담" : "방문 상담";
    let kind: ReminderKind = "soon";
    if (isSameDay(at, today)) kind = "today";
    else if (isSameDay(at, tomorrow)) kind = "tomorrow";

    reminders.push({
      id: `res-${r.id}`,
      kind,
      title:
        kind === "today"
          ? `오늘 ${formatTimeKo(r.scheduledAt)} ${typeLabel}`
          : kind === "tomorrow"
            ? `내일 ${formatTimeKo(r.scheduledAt)} ${typeLabel}`
            : `${formatDateKo(r.scheduledAt)} ${typeLabel}`,
      subtitle: master?.title ?? "마스터",
      href: "/reservation",
      at: at.getTime(),
    });
  }

  const pendingFeedback = db.feedbackOrders.filter(
    (o) =>
      matchesStudentScope(studentId, o.studentId) &&
      (o.status === "paid" || o.status === "in_review" || o.status === "pending_payment"),
  );

  for (const o of pendingFeedback) {
    const master = db.masters.find((m) => m.id === o.masterId);
    reminders.push({
      id: `fb-${o.id}`,
      kind: "feedback",
      title: "피드백 답변 대기 중",
      subtitle: `${master?.title ?? "마스터"} · ${formatFeedbackDeadlineLabel(o.createdAt)}`,
      href: `/feedback/${o.id}`,
      at: feedbackDeadline(o.createdAt).getTime(),
    });
  }

  return reminders.sort((a, b) => a.at - b.at);
}

/** 마스터: 오늘·내일 예약 + 대기 피드백 */
export function getMasterReminders(
  db: EumDatabase,
  masterId: string,
  now = new Date(),
): ScheduleReminder[] {
  const reminders: ScheduleReminder[] = [];
  const today = startOfDay(now);
  const dayAfter = new Date(today);
  dayAfter.setDate(dayAfter.getDate() + 2);

  const upcoming = db.reservations
    .filter(
      (r) =>
        matchesMasterScope(masterId, r.masterId) &&
        r.status === "scheduled" &&
        new Date(r.scheduledAt).getTime() < dayAfter.getTime() &&
        new Date(r.scheduledAt).getTime() >= today.getTime(),
    )
    .sort(
      (a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime(),
    );

  for (const r of upcoming) {
    const at = new Date(r.scheduledAt);
    const student = db.students.find((s) => s.id === r.studentId)?.name ?? "수강생";
    const typeLabel = r.type === "phone" ? "전화" : "방문";
    const kind: ReminderKind = isSameDay(at, today) ? "today" : "tomorrow";
    reminders.push({
      id: `mres-${r.id}`,
      kind,
      title: `${kind === "today" ? "오늘" : "내일"} ${formatTimeKo(r.scheduledAt)} ${typeLabel}`,
      subtitle: student,
      href: "/master/schedule",
      at: at.getTime(),
    });
  }

  const pending = db.feedbackOrders.filter(
    (o) =>
      matchesMasterScope(masterId, o.masterId) &&
      (o.status === "paid" || o.status === "in_review"),
  );
  for (const o of pending) {
    const student = db.students.find((s) => s.id === o.studentId)?.name ?? "수강생";
    reminders.push({
      id: `mfb-${o.id}`,
      kind: "feedback",
      title: "피드백 대기",
      subtitle: `${student} · ${formatFeedbackDeadlineLabel(o.createdAt)}`,
      href: `/master/feedback/${o.id}`,
      at: feedbackDeadline(o.createdAt).getTime(),
    });
  }

  return reminders.sort((a, b) => a.at - b.at);
}

export function listStudentUpcomingReservations(
  db: EumDatabase,
  studentId: string,
): Reservation[] {
  return db.reservations
    .filter(
      (r) =>
        matchesStudentScope(studentId, r.studentId) &&
        r.status === "scheduled",
    )
    .sort(
      (a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime(),
    );
}

export function listStudentPendingFeedback(
  db: EumDatabase,
  studentId: string,
): FeedbackOrder[] {
  return db.feedbackOrders
    .filter(
      (o) =>
        matchesStudentScope(studentId, o.studentId) &&
        o.status !== "completed" &&
        o.status !== "cancelled",
    )
    .sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
}

export function listStudentPastReservations(
  db: EumDatabase,
  studentId: string,
): Reservation[] {
  return db.reservations
    .filter(
      (r) =>
        matchesStudentScope(studentId, r.studentId) &&
        (r.status === "completed" || r.status === "cancelled"),
    )
    .sort(
      (a, b) => new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime(),
    );
}
