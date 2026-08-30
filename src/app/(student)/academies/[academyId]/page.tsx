import { notFound } from "next/navigation";
import { AcademyDetailView } from "@/components/AcademyDetailView";
import { ACADEMIES } from "@/lib/db/academies";

export default async function AcademyDetailPage({
  params,
}: PageProps<"/academies/[academyId]">) {
  const { academyId } = await params;
  const academy = ACADEMIES.find((a) => a.id === academyId);
  if (!academy) notFound();
  return <AcademyDetailView academy={academy} />;
}
