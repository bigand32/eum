import { MasterLayoutClient } from "@/components/MasterLayoutClient";

export default function MasterLayout({ children }: { children: React.ReactNode }) {
  return <MasterLayoutClient>{children}</MasterLayoutClient>;
}
