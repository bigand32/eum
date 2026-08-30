"use client";

import { useDbReady } from "@/lib/db/db-provider";
import { useSession } from "@/lib/auth/use-session";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export function DbLoadingOverlay() {
  const ready = useDbReady();
  const { loading } = useSession();

  if (!isSupabaseConfigured()) return null;
  if (ready && !loading) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-white">
      <p className="text-sm text-gray-400">불러오는 중...</p>
    </div>
  );
}
