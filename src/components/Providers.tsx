"use client";

import { DbProvider } from "@/lib/db/db-provider";
import { SessionProvider } from "@/lib/auth/session-provider";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <DbProvider>{children}</DbProvider>
    </SessionProvider>
  );
}
