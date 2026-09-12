"use client";

import { usePathname } from "next/navigation";
import { AppFrame } from "@/components/AppFrame";
import { AuthGuard } from "@/components/AuthGuard";
import { BottomNav } from "@/components/BottomNav";
import { DbLoadingOverlay } from "@/components/DbLoadingOverlay";
import { OnboardingRedirect } from "@/components/OnboardingRedirect";

export function StudentLayoutClient({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isCheckout = /^\/masters\/[^/]+\/(feedback|reservation)/.test(pathname);
  const isMasterDetail = /^\/masters\/[^/]+$/.test(pathname);
  const isFeedbackDetail = /^\/feedback\//.test(pathname);
  const hideNav =
    isCheckout ||
    isMasterDetail ||
    isFeedbackDetail ||
    pathname === "/onboarding" ||
    /^\/challenges\/[^/]+$/.test(pathname) ||
    pathname === "/vocal-ai" ||
    pathname.startsWith("/contest/");

  return (
    <AuthGuard roles={isMasterDetail ? ["student", "master"] : ["student"]}>
      <DbLoadingOverlay />
      <OnboardingRedirect />
      <AppFrame className={hideNav ? "pb-0" : "pb-20"}>
        {children}
        {!hideNav && <BottomNav />}
      </AppFrame>
    </AuthGuard>
  );
}
