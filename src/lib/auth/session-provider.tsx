"use client";

import { createContext, useContext, useEffect, useState } from "react";
import type { AuthUser } from "@/lib/auth/session";
import { getSession, setSession, clearSession } from "@/lib/auth/session";
import { getCurrentAuthUser } from "@/lib/auth/supabase-auth";
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

function hasCompleteSession(user: AuthUser | null) {
  if (!user) return false;
  return user.role === "master" ? Boolean(user.masterId) : Boolean(user.studentId);
}

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [session, setSessionState] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const applyUser = (user: AuthUser | null) => {
      if (cancelled) return;
      if (user) setSession(user);
      setSessionState(user);
      setLoading(false);
    };

    const refreshLocal = () => {
      applyUser(getSession());
    };

    const refreshSupabase = async () => {
      try {
        const supabase = createClient();
        const {
          data: { session: authSession },
        } = await supabase.auth.getSession();

        if (cancelled) return;

        if (!authSession?.user) {
          clearSession();
          setSessionState(null);
          setLoading(false);
          return;
        }

        const cached = getSession();
        if (cached?.id === authSession.user.id && hasCompleteSession(cached)) {
          applyUser(cached);
          return;
        }

        const user = (await getCurrentAuthUser()) ?? cached;
        if (cancelled) return;

        if (user && user.id === authSession.user.id) {
          applyUser(user);
        } else {
          applyUser(cached);
        }
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

        if (event === "SIGNED_OUT" || !authSession?.user) {
          clearSession();
          setSessionState(null);
          setLoading(false);
          return;
        }

        const cached = getSession();
        if (cached?.id === authSession.user.id && hasCompleteSession(cached)) {
          applyUser(cached);
          return;
        }

        try {
          const user = (await getCurrentAuthUser()) ?? cached;
          if (cancelled) return;

          if (user && user.id === authSession.user.id) {
            applyUser(user);
          } else {
            applyUser(cached);
          }
        } catch {
          if (!cancelled) applyUser(getSession());
        }
      });

      const handler = () => void refreshSupabase();
      window.addEventListener("eum-auth-updated", handler);

      return () => {
        cancelled = true;
        subscription.unsubscribe();
        window.removeEventListener("eum-auth-updated", handler);
      };
    }

    refreshLocal();
    const handler = () => refreshLocal();
    window.addEventListener("eum-auth-updated", handler);
    return () => {
      cancelled = true;
      window.removeEventListener("eum-auth-updated", handler);
    };
  }, []);

  return (
    <SessionContext.Provider value={{ session, loading }}>{children}</SessionContext.Provider>
  );
}

export function useSession() {
  return useContext(SessionContext);
}
