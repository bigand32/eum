"use client";

import { useEffect, useState } from "react";
import { useDbReady } from "@/lib/db/db-provider";
import { useSession } from "@/lib/auth/use-session";
import { isSupabaseConfigured } from "@/lib/supabase/config";

const LOADING_TIMEOUT_MS = 6_000;

export function DbLoadingOverlay() {
  const ready = useDbReady();
  const { loading } = useSession();
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    if (!isSupabaseConfigured()) return;
    const timer = window.setTimeout(() => setTimedOut(true), LOADING_TIMEOUT_MS);
    return () => window.clearTimeout(timer);
  }, []);

  if (!isSupabaseConfigured()) return null;
  if (timedOut) return null;
  if (ready && !loading) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-white">
      <p className="text-sm text-gray-400">불러오는 중...</p>
    </div>
  );
}
