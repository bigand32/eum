"use client";

import { useEffect } from "react";
import { DEMO_STUDENT_ID } from "@/lib/db/schema";
import { useSession } from "@/lib/auth/use-session";
import { persistSession } from "@/lib/auth/session";
import { useDb } from "@/lib/db/use-db";
import { useDbReady } from "@/lib/db/db-provider";
import { isSupabaseConfigured } from "@/lib/supabase/config";

function resolveStudentIdFromDb(userId: string, students: { id: string; userId?: string }[]) {
  return students.find((s) => s.userId === userId)?.id ?? "";
}

export function useStudentId(): string {
  const { session, loading } = useSession();
  const db = useDb();
  const dbReady = useDbReady();

  // DB에 연결된 students.user_id 를 최우선 (캐시된 session.studentId 가 틀릴 수 있음)
  const dbStudentId =
    session?.id && dbReady ? resolveStudentIdFromDb(session.id, db.students) : "";
  const resolvedId = dbStudentId || session?.studentId || "";

  useEffect(() => {
    if (!isSupabaseConfigured() || loading || !dbReady || !session?.id) return;
    if (!dbStudentId || session.studentId === dbStudentId) return;
    persistSession({ ...session, studentId: dbStudentId });
  }, [loading, dbReady, dbStudentId, session]);

  if (isSupabaseConfigured()) {
    if (loading && !session?.id) return "";
    return resolvedId;
  }

  return session?.studentId ?? DEMO_STUDENT_ID;
}
