"use client";

import { useDb, useDbReady } from "@/lib/db/use-db";
import { FeedbackRequestForm } from "@/components/FeedbackRequestForm";

export function FeedbackRequestPageClient({ masterId }: { masterId: string }) {
  const db = useDb();
  const ready = useDbReady();
  const master = db.masters.find((m) => m.id === masterId);

  if (!master) {
    if (!ready) return null;
    return <p className="p-6 text-center text-gray-500">마스터를 찾을 수 없어요.</p>;
  }

  return <FeedbackRequestForm master={master} />;
}
