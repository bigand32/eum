"use client";

import { createContext, useContext, useEffect, useState } from "react";
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

  useEffect(() => {
    let cancelled = false;

    const refresh = async () => {
      if (isSupabaseConfigured()) {
        const session = getSession();
        const next = await loadDb(session?.id);
        if (!cancelled) setValue({ db: next, ready: true });
        return;
      }
      if (!cancelled) setValue({ db: getDb(), ready: true });
    };

    void refresh();
    const handler = () => void refresh();
    window.addEventListener("eum-db-updated", handler);
    window.addEventListener("eum-auth-updated", handler);
    return () => {
      cancelled = true;
      window.removeEventListener("eum-db-updated", handler);
      window.removeEventListener("eum-auth-updated", handler);
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
