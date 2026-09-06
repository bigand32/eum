import { ChallengeDetailView } from "@/components/ChallengeDetailView";
import { isChallengeId } from "@/lib/challenges";
import { notFound } from "next/navigation";

export default async function ChallengeDetailPage({
  params,
}: PageProps<"/challenges/[challengeId]">) {
  const { challengeId } = await params;
  if (!isChallengeId(challengeId)) notFound();
  return <ChallengeDetailView key={challengeId} challengeId={challengeId} />;
}
