"use client";

import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { useStudentId } from "@/lib/auth/use-student-id";
import { useDb } from "@/lib/db/use-db";
import type { FeedbackOrder, FeedbackOrderStatus } from "@/lib/db/schema";
import { matchesStudentScope } from "@/lib/student-utils";

const STATUS_LABEL: Record<FeedbackOrderStatus, string> = {
  pending_payment: "결제 대기",
  paid: "답변 대기",
  in_review: "첨삭 중",
  completed: "답변 완료",
  cancelled: "취소됨",
};

function formatWhen(iso: string) {
  const d = new Date(iso);
  return `${d.getMonth() + 1}월 ${d.getDate()}일`;
}

function canOpen(order: FeedbackOrder) {
  return order.status !== "cancelled" && order.status !== "pending_payment";
}

export function FeedbackInboxView() {
  const db = useDb();
  const studentId = useStudentId();

  const orders = db.feedbackOrders
    .filter((o) => matchesStudentScope(studentId, o.studentId) && canOpen(o))
    .sort(
      (a, b) =>
        new Date(b.completedAt ?? b.paidAt ?? b.createdAt).getTime() -
        new Date(a.completedAt ?? a.paidAt ?? a.createdAt).getTime(),
    );

  return (
    <>
      <PageHeader title="내 피드백" backHref="/daily" />
      <main className="flex flex-col gap-3 px-5 py-5 pb-28">
        {orders.length === 0 ? (
          <div className="rounded-[20px] border border-gray-100 bg-white p-8 text-center text-[13px] text-gray-400">
            아직 볼 수 있는 피드백이 없어요
            <Link href="/search" className="mt-3 block text-[13px] font-bold text-brand-500">
              마스터에게 요청하기
            </Link>
          </div>
        ) : (
          orders.map((order) => {
            const master = db.masters.find((m) => m.id === order.masterId);
            const done = order.status === "completed";
            const when = order.completedAt ?? order.paidAt ?? order.createdAt;
            return (
              <Link
                key={order.id}
                href={`/feedback/${order.id}`}
                className="shadow-soft flex items-center gap-3 rounded-[20px] border border-gray-100 bg-white px-4 py-4"
              >
                {master?.avatarUrl ? (
                  <img
                    src={master.avatarUrl}
                    alt=""
                    className="h-12 w-12 shrink-0 rounded-full border border-gray-100 object-cover"
                  />
                ) : (
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-500">
                    <i className="fa-solid fa-comment-dots" />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex items-center gap-2">
                    <span
                      className={`rounded-md px-2 py-0.5 text-[11px] font-bold ${
                        done ? "bg-brand-50 text-brand-600" : "bg-gray-100 text-gray-500"
                      }`}
                    >
                      {STATUS_LABEL[order.status]}
                    </span>
                    <span className="text-[11px] font-medium text-gray-400">{formatWhen(when)}</span>
                  </div>
                  <p className="truncate text-[15px] font-bold text-gray-900">{order.mediaLabel}</p>
                  <p className="mt-0.5 truncate text-[12px] text-gray-500">
                    {master?.title ?? "마스터"}
                    {done && order.timestampComments.length > 0
                      ? ` · 코멘트 ${order.timestampComments.length}개`
                      : ""}
                  </p>
                </div>
                <i className="fa-solid fa-chevron-right text-[11px] text-gray-300" />
              </Link>
            );
          })
        )}
      </main>
    </>
  );
}
