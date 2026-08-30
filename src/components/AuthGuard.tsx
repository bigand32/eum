"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { UserRole } from "@/lib/auth/session";
import {
  getHomePathForRole,
  getSession,
  isAuthenticated,
  setSession,
} from "@/lib/auth/session";
import { getCurrentAuthUser } from "@/lib/auth/supabase-auth";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/client";

export function AuthGuard({
  children,
  role,
}: {
  children: React.ReactNode;
  role?: UserRole;
}) {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const check = async () => {
      if (isSupabaseConfigured()) {
        const supabase = createClient();
        const {
          data: { session: authSession },
        } = await supabase.auth.getSession();

        if (!authSession?.user) {
          setReady(false);
          router.replace("/login");
          return;
        }

        const user = (await getCurrentAuthUser()) ?? getSession();
        if (cancelled) return;

        if (!user || user.id !== authSession.user.id) {
          setReady(false);
          router.replace("/login");
          return;
        }

        setSession(user);

        if (role && user.role !== role) {
          setReady(false);
          router.replace(getHomePathForRole(user.role));
          return;
        }

        setReady(true);
        return;
      }

      if (!isAuthenticated()) {
        setReady(false);
        router.replace("/login");
        return;
      }

      const session = getSession();
      if (!session) return;

      if (role && session.role !== role) {
        setReady(false);
        router.replace(getHomePathForRole(session.role));
        return;
      }

      setReady(true);
    };

    void check();
    const handler = () => void check();
    window.addEventListener("eum-auth-updated", handler);
    return () => {
      cancelled = true;
      window.removeEventListener("eum-auth-updated", handler);
    };
  }, [router, role]);

  if (!ready) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-white">
        <div className="text-[14px] font-medium text-gray-400">로딩 중…</div>
      </div>
    );
  }

  return children;
}
