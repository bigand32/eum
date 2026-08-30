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
  const hideNav = isCheckout || isMasterDetail || pathname === "/onboarding";

  return (
    <AuthGuard role="student">
      <DbLoadingOverlay />
      <OnboardingRedirect />
      <AppFrame className={hideNav ? "pb-0" : "pb-28"}>
        {children}
        {!hideNav && <BottomNav />}
      </AppFrame>
    </AuthGuard>
  );
}
