"use client";

import { createContext, useContext, useEffect, useRef, useState } from "react";
import { invalidateDbCache, loadDb } from "./api";
import type { EumDatabase } from "./schema";
import { EMPTY_DB } from "./schema";
import { getSession } from "@/lib/auth/session";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { getDb } from "./store";

type DbContextValue = {
  db: EumDatabase;
  ready: boolean;
  refreshing: boolean;
};

const DbContext = createContext<DbContextValue>({
  db: EMPTY_DB,
  ready: false,
  refreshing: false,
});

/** 탭 복귀 시 이 시간 이내면 풀 리프레시 생략 */
const VISIBLE_REFRESH_MIN_MS = 60_000;

export function DbProvider({ children }: { children: React.ReactNode }) {
  const [value, setValue] = useState<DbContextValue>(() => ({
    db:
      typeof window !== "undefined" && !isSupabaseConfigured() ? getDb() : EMPTY_DB,
    ready: typeof window !== "undefined" && !isSupabaseConfigured(),
    refreshing: false,
  }));
  const refreshSeq = useRef(0);
  const dbRef = useRef(value.db);
  const lastUserIdRef = useRef<string | undefined>(undefined);
  const lastFetchAtRef = useRef(0);
  dbRef.current = value.db;

  useEffect(() => {
    let cancelled = false;
    let authDebounceTimer: number | null = null;
    let visibleDebounceTimer: number | null = null;
    let retryTimer: number | null = null;
    let inFlight = false;

    const refresh = async (opts?: { force?: boolean; soft?: boolean }) => {
      const force = Boolean(opts?.force);
      const soft = Boolean(opts?.soft);
      if (inFlight && !force) return;
      inFlight = true;

      const seq = ++refreshSeq.current;
      if (dbRef.current.masters.length > 0) {
        setValue((prev) => ({ ...prev, refreshing: true }));
      }

      try {
        if (isSupabaseConfigured()) {
          const session = getSession();
          const userId = session?.id;

          if (userId !== lastUserIdRef.current) {
            invalidateDbCache();
            if (lastUserIdRef.current) {
              setValue({ db: EMPTY_DB, ready: false, refreshing: true });
            }
          }

          if (!userId && !getSession()) {
            if (cancelled || seq !== refreshSeq.current) return;
            lastUserIdRef.current = undefined;
            setValue({ db: EMPTY_DB, ready: true, refreshing: false });
            return;
          }

          if (force && !soft) invalidateDbCache();
          const next = await loadDb(userId, { force: force && !soft });
          if (cancelled || seq !== refreshSeq.current) return;

          lastUserIdRef.current = userId;
          lastFetchAtRef.current = Date.now();
          setValue({ db: next, ready: true, refreshing: false });
          return;
        }

        if (cancelled || seq !== refreshSeq.current) return;
        setValue({ db: getDb(), ready: true, refreshing: false });
      } catch {
        if (cancelled || seq !== refreshSeq.current) return;

        setValue((prev) => ({
          ...prev,
          ready: true,
          refreshing: false,
        }));

        if (dbRef.current.masters.length === 0) {
          retryTimer = window.setTimeout(() => {
            if (!cancelled) void refresh({ force: true });
          }, 1_500);
        }
      } finally {
        inFlight = false;
      }
    };

    void refresh({ force: true });

    const onDbUpdated = () => {
      void refresh({ force: true });
    };

    const onAuthUpdated = () => {
      if (authDebounceTimer) window.clearTimeout(authDebounceTimer);
      authDebounceTimer = window.setTimeout(() => {
        invalidateDbCache();
        void refresh({ force: true });
      }, 150);
    };

    const onVisible = () => {
      if (document.visibilityState !== "visible") return;
      if (visibleDebounceTimer) window.clearTimeout(visibleDebounceTimer);
      visibleDebounceTimer = window.setTimeout(() => {
        if (Date.now() - lastFetchAtRef.current < VISIBLE_REFRESH_MIN_MS) return;
        void refresh({ soft: true });
      }, 400);
    };

    window.addEventListener("eum-db-updated", onDbUpdated);
    window.addEventListener("eum-auth-updated", onAuthUpdated);
    document.addEventListener("visibilitychange", onVisible);
    // window focus 는 탭 전환마다 과도하게 호출되므로 visibility만 사용

    let bc: BroadcastChannel | null = null;
    try {
      bc = new BroadcastChannel("eum-db");
      bc.onmessage = (event) => {
        if (event.data?.type === "db-updated") {
          invalidateDbCache();
          void refresh({ force: true });
        }
      };
    } catch {
      bc = null;
    }

    return () => {
      cancelled = true;
      refreshSeq.current += 1;
      if (authDebounceTimer) window.clearTimeout(authDebounceTimer);
      if (visibleDebounceTimer) window.clearTimeout(visibleDebounceTimer);
      if (retryTimer) window.clearTimeout(retryTimer);
      window.removeEventListener("eum-db-updated", onDbUpdated);
      window.removeEventListener("eum-auth-updated", onAuthUpdated);
      document.removeEventListener("visibilitychange", onVisible);
      bc?.close();
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

export function useDbRefreshing(): boolean {
  return useContext(DbContext).refreshing;
}
