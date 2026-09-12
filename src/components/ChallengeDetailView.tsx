"use client";

import { useMemo } from "react";
import { useDb } from "@/lib/db/use-db";
import { useStudentId } from "@/lib/auth/use-student-id";
import {
  CHALLENGE_CATALOG,
  getChallengeDetailProgress,
  type ChallengeId,
} from "@/lib/challenges";
import { RoutineChallengeDetail } from "@/components/RoutineChallengeDetail";
import { BreathBallGameView } from "@/components/BreathBallGameView";

export function ChallengeDetailView({ challengeId }: { challengeId: ChallengeId }) {
  const db = useDb();
  const studentId = useStudentId();
  const progress = useMemo(
    () => getChallengeDetailProgress(challengeId, db, studentId),
    [challengeId, db, studentId],
  );
  const catalog = CHALLENGE_CATALOG.find((c) => c.id === challengeId);

  if (!catalog) return null;

  if (challengeId === "breath-extend") {
    return <BreathBallGameView progress={progress} />;
  }

  const toneClass =
    catalog.tone === "sky"
      ? "bg-sky-500"
      : catalog.tone === "amber"
        ? "bg-amber-400"
        : catalog.tone === "warm"
          ? "bg-orange-400"
          : catalog.tone === "mint"
            ? "bg-emerald-500"
            : "bg-brand-500";

  return (
    <RoutineChallengeDetail
      challengeId={challengeId}
      progress={progress}
      icon={catalog.icon}
      toneClass={toneClass}
    />
  );
}
