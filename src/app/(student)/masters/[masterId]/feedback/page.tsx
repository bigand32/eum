import { FeedbackRequestPageClient } from "@/components/FeedbackRequestPageClient";
import { PageHeader } from "@/components/PageHeader";

export default async function FeedbackRequestPage({
  params,
}: PageProps<"/masters/[masterId]/feedback">) {
  const { masterId } = await params;

  return (
    <>
      <PageHeader title="피드백 요청" backHref={`/masters/${masterId}`} />
      <FeedbackRequestPageClient masterId={masterId} />
    </>
  );
}
