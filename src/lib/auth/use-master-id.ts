"use client";

import { DEMO_MASTER_ID } from "@/lib/db/schema";
import { useSession } from "@/lib/auth/use-session";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export function useMasterId(): string {
  const { session, loading } = useSession();

  if (isSupabaseConfigured()) {
    if (loading) return "";
    return session?.masterId ?? "";
  }

  return session?.masterId ?? DEMO_MASTER_ID;
}
