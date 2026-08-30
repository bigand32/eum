import { AppFrame } from "@/components/AppFrame";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return <AppFrame>{children}</AppFrame>;
}
