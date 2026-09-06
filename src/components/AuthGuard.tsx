"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { UserRole } from "@/lib/auth/session";
import { getHomePathForRole } from "@/lib/auth/session";
import { useSession } from "@/lib/auth/use-session";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/client";

export function AuthGuard({
  children,
  role,
  roles,
}: {
  children: React.ReactNode;
  role?: UserRole;
  /** 여러 역할 허용 (예: 마스터 공개 프로필) */
  roles?: UserRole[];
}) {
  const router = useRouter();
  const { session, loading } = useSession();
  const [ready, setReady] = useState(false);
  const allowedKey = (roles?.length ? [...roles].sort().join(",") : role) ?? "";

  useEffect(() => {
    let cancelled = false;
    let waitTimer: number | null = null;

    const run = async () => {
      if (loading) {
        setReady(false);
        return;
      }

      if (!session) {
        setReady(false);
        if (isSupabaseConfigured()) {
          try {
            const supabase = createClient();
            const {
              data: { session: authSession },
            } = await supabase.auth.getSession();
            if (cancelled) return;
            if (authSession?.user) {
              // 로컬 세션 복구 대기 (로그인↔홈 루프 방지)
              window.dispatchEvent(new CustomEvent("eum-auth-resync"));
              waitTimer = window.setTimeout(() => {
                if (!cancelled) router.replace("/login");
              }, 4_000);
              return;
            }
          } catch {
            // fall through
          }
        }
        if (!cancelled) router.replace("/login");
        return;
      }

      if (allowedKey) {
        const allowed = allowedKey.split(",") as UserRole[];
        const canAccess =
          allowed.includes(session.role) ||
          (allowed.includes("master") && Boolean(session.masterId)) ||
          (allowed.includes("student") && Boolean(session.studentId));

        if (!canAccess) {
          setReady(false);
          if (!cancelled) router.replace(getHomePathForRole(session.role));
          return;
        }
      }

      if (!cancelled) setReady(true);
    };

    void run();
    return () => {
      cancelled = true;
      if (waitTimer) window.clearTimeout(waitTimer);
    };
  }, [session, loading, allowedKey, router]);

  if (!ready) {
    // 세션이 있으면 가드로 전체를 막지 않고 children 렌더 (DB 스켈레톤과 병행)
    if (session) return children;
    return (
      <div className="flex min-h-dvh items-center justify-center bg-white">
        <div className="text-[14px] font-medium text-gray-400">로딩 중…</div>
      </div>
    );
  }

  return children;
}
