"use client";

import { createContext, useContext, useEffect, useRef, useState } from "react";
import { loadDb } from "./api";
import type { EumDatabase } from "./schema";
import { EMPTY_DB } from "./schema";
import { getSession } from "@/lib/auth/session";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { getDb } from "./store";

type DbContextValue = {
  db: EumDatabase;
  ready: boolean;
};

const DbContext = createContext<DbContextValue>({
  db: EMPTY_DB,
  ready: false,
});

export function DbProvider({ children }: { children: React.ReactNode }) {
  const [value, setValue] = useState<DbContextValue>(() => ({
    db:
      typeof window !== "undefined" && !isSupabaseConfigured() ? getDb() : EMPTY_DB,
    ready: typeof window !== "undefined" && !isSupabaseConfigured(),
  }));
  const refreshSeq = useRef(0);
  const inflight = useRef<Promise<void> | null>(null);

  useEffect(() => {
    let cancelled = false;
    let debounceTimer: ReturnType<typeof setTimeout> | null = null;

    const refresh = async () => {
      if (inflight.current) return inflight.current;

      const seq = ++refreshSeq.current;
      inflight.current = (async () => {
        try {
          if (isSupabaseConfigured()) {
            const session = getSession();
            const next = await loadDb(session?.id);
            if (!cancelled && seq === refreshSeq.current) {
              setValue({ db: next, ready: true });
            }
            return;
          }
          if (!cancelled && seq === refreshSeq.current) {
            setValue({ db: getDb(), ready: true });
          }
        } catch {
          // 네트워크 불안정·업로드 중 연결 포화 시 fetch 실패 — 기존 데이터 유지
          if (!cancelled && seq === refreshSeq.current) {
            setValue((prev) => ({ db: prev.db, ready: true }));
          }
        } finally {
          inflight.current = null;
        }
      })();

      return inflight.current;
    };

    void refresh();

    const scheduleRefresh = () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => void refresh(), 400);
    };

    window.addEventListener("eum-db-updated", scheduleRefresh);
    window.addEventListener("eum-auth-updated", scheduleRefresh);
    return () => {
      cancelled = true;
      if (debounceTimer) clearTimeout(debounceTimer);
      window.removeEventListener("eum-db-updated", scheduleRefresh);
      window.removeEventListener("eum-auth-updated", scheduleRefresh);
    };
  }, []);

  return <DbContext.Provider value={value}>{children}</DbContext.Provider>;
}

export function useDb(): EumDatabase {
  return useContext(DbContext).db;
}

export function useDbReady(): boolean {
  return useContext(DbContext).ready;
}
