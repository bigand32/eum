"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { isOnboardingComplete } from "@/lib/onboarding";
import { useSession } from "@/lib/auth/use-session";

export function OnboardingRedirect() {
  const router = useRouter();
  const pathname = usePathname();
  const { session, loading } = useSession();

  useEffect(() => {
    if (loading) return;
    if (pathname.startsWith("/onboarding")) return;
    // 마스터 프로필 열람 중에는 온보딩으로 가로채지 않음
    if (pathname.startsWith("/masters/")) return;
    if (!session || session.role !== "student") return;

    if (session.onboardingPrefs?.completedAt || isOnboardingComplete()) return;

    router.replace("/onboarding");
  }, [pathname, router, session, loading]);

  return null;
}
