import { notFound } from "next/navigation";
import { AcademyMapView } from "@/components/AcademyMapView";
import { ACADEMIES } from "@/lib/db/academies";

export default async function AcademyMapPage({
  params,
}: PageProps<"/academies/[academyId]/map">) {
  const { academyId } = await params;
  const academy = ACADEMIES.find((a) => a.id === academyId);
  if (!academy) notFound();
  return <AcademyMapView academy={academy} />;
}
