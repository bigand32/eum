"use client";

import { usePathname } from "next/navigation";
import { MasterBottomNav } from "@/components/MasterBottomNav";
import { AppFrame } from "@/components/AppFrame";
import { AuthGuard } from "@/components/AuthGuard";
import { DbLoadingOverlay } from "@/components/DbLoadingOverlay";

export function MasterLayoutClient({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const hideNav =
    pathname.startsWith("/master/feedback/") ||
    pathname.startsWith("/master/settings/pricing");

  return (
    <AuthGuard role="master">
      <DbLoadingOverlay />
      <AppFrame className="bg-[#f8fafc] pb-24">
        {children}
        {!hideNav && <MasterBottomNav />}
      </AppFrame>
    </AuthGuard>
  );
}
