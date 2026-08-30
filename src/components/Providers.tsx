"use client";

import { DbProvider } from "@/lib/db/db-provider";

export function Providers({ children }: { children: React.ReactNode }) {
  return <DbProvider>{children}</DbProvider>;
}
