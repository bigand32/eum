"use client";

import { useEffect } from "react";
import { DEMO_MASTER_ID } from "@/lib/db/schema";
import { useSession } from "@/lib/auth/use-session";
import { persistSession } from "@/lib/auth/session";
import { useDb } from "@/lib/db/use-db";
import { useDbReady } from "@/lib/db/db-provider";
import { isSupabaseConfigured } from "@/lib/supabase/config";

function resolveMasterIdFromDb(userId: string, masters: { id: string; userId?: string }[]) {
  return masters.find((m) => m.userId === userId)?.id ?? "";
}

export function useMasterId(): string {
  const { session, loading } = useSession();
  const db = useDb();
  const dbReady = useDbReady();

  // DB에 연결된 masters.user_id 를 최우선으로 사용 (캐시된 session.masterId 가 틀릴 수 있음)
  const dbMasterId =
    session?.id && dbReady ? resolveMasterIdFromDb(session.id, db.masters) : "";
  const resolvedId = dbMasterId || session?.masterId || "";

  useEffect(() => {
    if (!isSupabaseConfigured() || loading || !dbReady || !session?.id) return;
    if (!dbMasterId) return;
    if (session.masterId === dbMasterId && session.role === "master") return;
    persistSession({
      ...session,
      role: session.role === "student" && session.studentId ? session.role : "master",
      masterId: dbMasterId,
    });
  }, [loading, dbReady, dbMasterId, session]);

  if (isSupabaseConfigured()) {
    if (loading && !session?.id) return "";
    return resolvedId;
  }

  return session?.masterId ?? DEMO_MASTER_ID;
}
