"use client";

import { createContext, useContext, useEffect, useRef, useState } from "react";
import type { AuthUser } from "@/lib/auth/session";
import {
  clearSession,
  getSession,
  hasCompleteSession,
  persistSession,
} from "@/lib/auth/session";
import { getCurrentAuthUser, invalidateAuthUserCache } from "@/lib/auth/supabase-auth";
import { invalidateDbCache } from "@/lib/db/api";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/client";

type SessionContextValue = {
  session: AuthUser | null;
  loading: boolean;
};

const SessionContext = createContext<SessionContextValue>({
  session: null,
  loading: true,
});

function isUsableCachedSession(cached: AuthUser | null, authUserId: string) {
  if (!cached || cached.id !== authUserId || !hasCompleteSession(cached)) return false;
  if (cached.role === "student" && !cached.onboardingPrefs?.completedAt) return false;
  if (cached.role === "master" && !cached.masterId) return false;
  return true;
}

function wipeCaches() {
  invalidateAuthUserCache();
  invalidateDbCache();
}

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [session, setSessionState] = useState<AuthUser | null>(() => {
    if (typeof window === "undefined") return null;
    return getSession();
  });
  // Supabase 사용 시에는 항상 서버 세션 확인이 끝날 때까지 loading
  const [loading, setLoading] = useState(() => {
    if (typeof window === "undefined") return true;
    return isSupabaseConfigured();
  });
  const lastSyncedUserId = useRef<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const applyUser = (user: AuthUser | null) => {
      if (cancelled) return;
      if (user) {
        const prev = getSession();
        persistSession(user);
        if (
          !prev ||
          prev.id !== user.id ||
          prev.masterId !== user.masterId ||
          prev.studentId !== user.studentId ||
          prev.role !== user.role
        ) {
          if (prev?.id && prev.id !== user.id) {
            wipeCaches();
          }
          window.dispatchEvent(new CustomEvent("eum-auth-updated"));
        }
      }
      setSessionState(user);
      setLoading(false);
    };

    const syncFromServer = async (authUserId: string, cached: AuthUser | null) => {
      wipeCaches();
      const user = (await getCurrentAuthUser()) ?? cached;
      if (cancelled) return;
      if (user && user.id === authUserId) {
        applyUser(user);
        lastSyncedUserId.current = authUserId;
      } else if (cached?.id === authUserId && hasCompleteSession(cached)) {
        applyUser(cached);
        lastSyncedUserId.current = authUserId;
      } else {
        applyUser(null);
      }
    };

    const refreshSupabase = async () => {
      try {
        const supabase = createClient();
        const {
          data: { session: authSession },
        } = await supabase.auth.getSession();

        if (cancelled) return;

        if (!authSession?.user) {
          wipeCaches();
          if (getSession()) clearSession();
          setSessionState(null);
          setLoading(false);
          lastSyncedUserId.current = null;
          return;
        }

        const cached = getSession();
        // 계정 전환: 로컬 세션이 다른 유저면 즉시 폐기
        if (cached && cached.id !== authSession.user.id) {
          wipeCaches();
          localStorage.removeItem("eum_session_v1");
        }

        const freshCached = getSession();
        if (isUsableCachedSession(freshCached, authSession.user.id)) {
          applyUser(freshCached);
          lastSyncedUserId.current = authSession.user.id;
          // 항상 백그라운드에서 최신 프로필·ID 재동기화
          void syncFromServer(authSession.user.id, freshCached);
          return;
        }

        await syncFromServer(authSession.user.id, freshCached);
      } catch {
        if (!cancelled) {
          applyUser(getSession());
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    if (isSupabaseConfigured()) {
      void refreshSupabase();

      const supabase = createClient();
      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange(async (event, authSession) => {
        if (cancelled) return;
        if (event === "TOKEN_REFRESHED") return;

        const authUserId = authSession?.user?.id ?? null;
        if (event === "INITIAL_SESSION" && authUserId === lastSyncedUserId.current) {
          return;
        }

        if (event === "SIGNED_OUT" || !authSession?.user) {
          wipeCaches();
          if (getSession()) clearSession();
          setSessionState(null);
          setLoading(false);
          lastSyncedUserId.current = null;
          return;
        }

        if (event === "SIGNED_IN" || lastSyncedUserId.current !== authSession.user.id) {
          setLoading(true);
          wipeCaches();
          await syncFromServer(authSession.user.id, getSession());
          return;
        }

        const cached = getSession();
        if (isUsableCachedSession(cached, authSession.user.id)) {
          applyUser(cached);
          lastSyncedUserId.current = authSession.user.id;
          void syncFromServer(authSession.user.id, cached);
          return;
        }

        try {
          await syncFromServer(authSession.user.id, cached);
        } catch {
          if (!cancelled) applyUser(getSession());
        }
      });

      const onAuthUpdated = () => {
        if (cancelled) return;
        applyUser(getSession());
      };
      const onAuthResync = () => {
        if (cancelled) return;
        setLoading(true);
        void refreshSupabase();
      };
      window.addEventListener("eum-auth-updated", onAuthUpdated);
      window.addEventListener("eum-auth-resync", onAuthResync);

      return () => {
        cancelled = true;
        subscription.unsubscribe();
        window.removeEventListener("eum-auth-updated", onAuthUpdated);
        window.removeEventListener("eum-auth-resync", onAuthResync);
      };
    }

    setSessionState(getSession());
    setLoading(false);
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <SessionContext.Provider value={{ session, loading }}>{children}</SessionContext.Provider>
  );
}

export function useSession() {
  return useContext(SessionContext);
}
