"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { isOnboardingComplete } from "@/lib/onboarding";

export function OnboardingRedirect() {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (pathname.startsWith("/onboarding")) return;
    if (!isOnboardingComplete()) {
      router.replace("/onboarding");
    }
  }, [pathname, router]);

  return null;
}
