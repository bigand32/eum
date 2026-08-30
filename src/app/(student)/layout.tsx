import { StudentLayoutClient } from "@/components/StudentLayoutClient";

export default function StudentLayout({ children }: LayoutProps<"/">) {
  return <StudentLayoutClient>{children}</StudentLayoutClient>;
}
