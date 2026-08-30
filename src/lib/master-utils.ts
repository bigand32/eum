import type { EumDatabase, FeedbackOrder, Reservation } from "@/lib/db/schema";

export function getStudentName(db: EumDatabase, studentId: string) {
  return db.students.find((s) => s.id === studentId)?.name || "수강생";
}

export function formatKoreanDate(date = new Date()) {
  const days = ["일", "월", "화", "수", "목", "금", "토"];
  return `${date.getFullYear()}년 ${date.getMonth() + 1}월 ${date.getDate()}일 ${days[date.getDay()]}요일`;
}

export function formatTimeLabel(iso: string) {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function formatDeadlineLabel(createdAt: string) {
  const created = new Date(createdAt);
  const deadline = new Date(created.getTime() + 24 * 60 * 60 * 1000);
  const now = new Date();
  const diffMs = deadline.getTime() - now.getTime();

  if (diffMs <= 0) return "마감 임박";

  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  if (hours < 24) return `${hours}시간 남음`;

  const days = Math.floor(hours / 24);
  return `내일 ${String(deadline.getHours()).padStart(2, "0")}:${String(deadline.getMinutes()).padStart(2, "0")} 마감`;
}

export function isUrgentFeedback(order: FeedbackOrder) {
  const created = new Date(order.createdAt);
  const deadline = new Date(created.getTime() + 24 * 60 * 60 * 1000);
  return deadline.getTime() - Date.now() < 6 * 60 * 60 * 1000;
}

export function getMasterPendingAmount(db: EumDatabase, masterId: string) {
  const feedback = db.feedbackOrders
    .filter((o) => o.masterId === masterId && o.status === "paid")
    .reduce((sum, o) => sum + o.priceAtPurchase, 0);
  const reservations = db.reservations
    .filter((r) => r.masterId === masterId && r.status === "scheduled")
    .reduce((sum, r) => sum + r.priceAtPurchase, 0);
  return feedback + reservations;
}

export function getTodayPhoneReservations(db: EumDatabase, masterId: string): Reservation[] {
  const today = new Date();
  return db.reservations.filter(
    (r) =>
      r.masterId === masterId &&
      r.type === "phone" &&
      r.status === "scheduled" &&
      isSameDay(new Date(r.scheduledAt), today),
  );
}

export function formatManWon(won: number) {
  const man = won / 10000;
  return man >= 1 ? man.toFixed(1).replace(/\.0$/, "") : (won / 1000).toFixed(1);
}
