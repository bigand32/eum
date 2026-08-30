"use client";

import { useEffect, useState } from "react";
import type { AuthUser } from "@/lib/auth/session";
import { getSession, setSession } from "@/lib/auth/session";
import { getCurrentAuthUser } from "@/lib/auth/supabase-auth";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/client";

export function useSession() {
  const [session, setSessionState] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const refreshLocal = () => {
      if (!cancelled) {
        setSessionState(getSession());
        setLoading(false);
      }
    };

    const refreshSupabase = async () => {
      const user = await getCurrentAuthUser();
      if (cancelled) return;
      if (user) {
        setSession(user);
        setSessionState(user);
      } else {
        setSessionState(null);
      }
      setLoading(false);
    };

    if (isSupabaseConfigured()) {
      const supabase = createClient();

      void refreshSupabase();

      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange(async () => {
        const user = await getCurrentAuthUser();
        if (cancelled) return;
        if (user) {
          setSession(user);
          setSessionState(user);
        } else {
          setSessionState(null);
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

  return { session, loading };
}
