"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useDbReady } from "@/lib/db/db-provider";
import { useSession } from "@/lib/auth/use-session";
import { hasCompleteSession, getSession } from "@/lib/auth/session";
import { isSupabaseConfigured } from "@/lib/supabase/config";

const LOADING_TIMEOUT_MS = 2_500;

export function DbLoadingOverlay() {
  const pathname = usePathname();
  const ready = useDbReady();
  const { loading } = useSession();
  const [timedOut, setTimedOut] = useState(false);
  const [hasCachedSession, setHasCachedSession] = useState(false);

  useEffect(() => {
    if (!isSupabaseConfigured()) return;
    setHasCachedSession(hasCompleteSession(getSession()));
    const timer = window.setTimeout(() => setTimedOut(true), LOADING_TIMEOUT_MS);
    return () => window.clearTimeout(timer);
  }, []);

  if (!isSupabaseConfigured()) return null;
  if (pathname.startsWith("/login") || pathname.startsWith("/signup")) return null;
  if (timedOut) return null;
  // 세션 캐시가 있으면 오버레이로 막지 않고 기존/빈 UI를 먼저 그림
  if (hasCachedSession) return null;
  if (ready && !loading) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-white">
      <p className="text-sm text-gray-400">불러오는 중...</p>
    </div>
  );
}
