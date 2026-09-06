import { StudentCoursePlayerView } from "@/components/StudentCoursePlayerView";

export default async function CoursePlayerPage({
  params,
}: {
  params: Promise<{ purchaseId: string }>;
}) {
  const { purchaseId } = await params;
  return <StudentCoursePlayerView purchaseId={purchaseId} />;
}
