"use client";

import { DEMO_STUDENT_ID } from "@/lib/db/schema";
import { useSession } from "@/lib/auth/use-session";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export function useStudentId(): string {
  const { session, loading } = useSession();

  if (isSupabaseConfigured()) {
    if (loading) return "";
    return session?.studentId ?? "";
  }

  return session?.studentId ?? DEMO_STUDENT_ID;
}
