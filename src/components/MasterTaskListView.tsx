"use client";

import { useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { FeedbackTaskCard, ReservationTaskCard } from "@/components/MasterHomeClient";
import { useDb } from "@/lib/db/use-db";
import { useSession } from "@/lib/auth/use-session";
import { useMasterId } from "@/lib/auth/use-master-id";
import {
  formatScheduleWhen,
  getStudentName,
  matchesMasterScope,
} from "@/lib/master-utils";

function useActiveMaster() {
  const db = useDb();
  const { session } = useSession();
  const masterId = useMasterId();
  const master =
    db.masters.find((m) => m.id === masterId) ??
    (session?.id ? db.masters.find((m) => m.userId === session.id) : undefined) ??
    (session?.masterId ? db.masters.find((m) => m.id === session.masterId) : undefined);

  return { db, master, activeMasterId: master?.id || masterId };
}

function SegmentedTabs<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (value: T) => void;
  options: { id: T; label: string; count: number }[];
}) {
  return (
    <div className="mb-4 flex rounded-full bg-gray-100 p-1">
      {options.map((option) => {
        const active = option.id === value;
        return (
          <button
            key={option.id}
            type="button"
            onClick={() => onChange(option.id)}
            className={`flex-1 rounded-full py-2 text-[13px] font-bold transition ${
              active ? "bg-white text-gray-900 shadow-sm" : "text-gray-400"
            }`}
          >
            {option.label}
            <span className={`ml-1 ${active ? "text-master-500" : "text-gray-400"}`}>
              {option.count}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function EmptyList({ children }: { children: string }) {
  return (
    <div className="rounded-[20px] border border-dashed border-gray-200 bg-white px-4 py-10 text-center text-[13px] text-gray-400">
      {children}
    </div>
  );
}

export function MasterFeedbackListView() {
  const { db, activeMasterId } = useActiveMaster();
  const orders = db.feedbackOrders
    .filter(
      (o) =>
        matchesMasterScope(activeMasterId, o.masterId) && o.status !== "pending_payment",
    )
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  const pending = orders.filter((o) => o.status === "paid" || o.status === "in_review");
  const done = orders
    .filter((o) => o.status === "completed" || o.status === "cancelled")
    .sort(
      (a, b) =>
        new Date(b.completedAt ?? b.paidAt ?? b.createdAt).getTime() -
        new Date(a.completedAt ?? a.paidAt ?? a.createdAt).getTime(),
    );
  const [tab, setTab] = useState<"pending" | "done">("pending");
  const visible = tab === "pending" ? pending : done;

  return (
    <>
      <PageHeader title="피드백" backHref="/master" />
      <main className="px-5 py-5 pb-28">
        {pending.length > 0 && (
          <button
            type="button"
            onClick={() => setTab("pending")}
            className="mb-4 w-full rounded-[16px] border border-brand-100 bg-brand-50/80 px-4 py-3.5 text-left"
          >
            <p className="text-[14px] font-bold text-gray-900">대기 중인 피드백이 있어요</p>
            <p className="mt-0.5 text-[12px] text-gray-500">
              {pending.length}건 답변을 기다리고 있어요
            </p>
          </button>
        )}

        <SegmentedTabs
          value={tab}
          onChange={setTab}
          options={[
            { id: "pending", label: "대기", count: pending.length },
            { id: "done", label: "지난", count: done.length },
          ]}
        />

        {visible.length === 0 ? (
          <EmptyList>
            {tab === "pending" ? "대기 중인 피드백이 없어요" : "지난 피드백이 없어요"}
          </EmptyList>
        ) : (
          <div className="flex flex-col gap-3">
            {visible.map((order) => (
              <FeedbackTaskCard
                key={order.id}
                order={order}
                studentName={getStudentName(db, order.studentId)}
              />
            ))}
          </div>
        )}
      </main>
    </>
  );
}

export function MasterConsultationListView({ type }: { type: "phone" | "visit" }) {
  const { db, master, activeMasterId } = useActiveMaster();
  const title = type === "phone" ? "전화 상담" : "방문 상담";
  const reservations = db.reservations.filter(
    (r) => matchesMasterScope(activeMasterId, r.masterId) && r.type === type,
  );
  const upcoming = reservations
    .filter((r) => r.status === "scheduled")
    .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime());
  const past = reservations
    .filter((r) => r.status === "completed" || r.status === "cancelled")
    .sort((a, b) => new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime());
  const [tab, setTab] = useState<"upcoming" | "past">(
    upcoming.length > 0 ? "upcoming" : "past",
  );
  const visible = tab === "upcoming" ? upcoming : past;

  return (
    <>
      <PageHeader title={title} backHref="/master" />
      <main className="px-5 py-5 pb-28">
        <SegmentedTabs
          value={tab}
          onChange={setTab}
          options={[
            { id: "upcoming", label: "예정", count: upcoming.length },
            { id: "past", label: "지난", count: past.length },
          ]}
        />

        {visible.length === 0 ? (
          <EmptyList>
            {tab === "upcoming"
              ? `예정된 ${title}이 없어요`
              : `지난 ${title}이 없어요`}
          </EmptyList>
        ) : (
          <div className="flex flex-col gap-3">
            {visible.map((reservation) => (
              <ReservationTaskCard
                key={reservation.id}
                reservation={reservation}
                studentName={getStudentName(db, reservation.studentId)}
                phoneNumber={master?.phoneNumber ?? ""}
                whenLabel={formatScheduleWhen(reservation.scheduledAt)}
              />
            ))}
          </div>
        )}
      </main>
    </>
  );
}
