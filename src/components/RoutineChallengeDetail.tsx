"use client";

import Link from "next/link";
import type { ChallengeDetailProgress } from "@/lib/challenges";
import { getRoutineByChallengeId } from "@/lib/vocal-routines";
import { RoutinePianoPlayer } from "@/components/RoutinePianoPlayer";

type Props = {
  challengeId: string;
  progress: ChallengeDetailProgress;
  icon: string;
  toneClass: string;
};

export function RoutineChallengeDetail({
  challengeId,
  progress,
  icon,
  toneClass: _toneClass,
}: Props) {
  const routine = getRoutineByChallengeId(challengeId);
  if (!routine) return null;

  const keywordHint = routine.keywords[0] ?? "루틴";
  const tips = routine.steps.slice(0, 3).map((s) => s.tip);

  return (
    <div className="flex min-h-dvh flex-col bg-[#F5F6F8]">
      <header className="safe-top flex items-center justify-between px-5 pt-4 pb-2">
        <Link
          href="/challenges"
          className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-gray-700 shadow-soft"
          aria-label="뒤로"
        >
          <i className="fa-solid fa-chevron-left text-[14px]" />
        </Link>
        <p className="text-[15px] font-bold text-gray-900">{routine.title}</p>
        <div className="w-10" />
      </header>

      <div className="flex flex-1 flex-col px-5 pb-28 pt-3">
        <section className="rounded-[24px] bg-white p-5 shadow-soft">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-brand-50 text-brand-500">
              <i className={`fa-solid ${icon} text-[16px]`} />
            </div>
            <div className="min-w-0">
              <p className="text-[12px] font-bold text-brand-500">
                {routine.level} · {routine.totalMin}
              </p>
              <h1 className="mt-0.5 text-[18px] font-extrabold text-gray-900">
                {routine.title}
              </h1>
              <p className="mt-1 text-[13px] leading-relaxed text-gray-500">
                {routine.subtitle}
              </p>
            </div>
          </div>

          <ul className="mt-4 space-y-2">
            {tips.map((tip) => (
              <li
                key={tip}
                className="flex gap-2 rounded-[14px] bg-gray-50 px-3 py-2.5 text-[13px] font-medium text-gray-600"
              >
                <i className="fa-solid fa-check mt-0.5 text-[11px] text-brand-400" />
                <span>{tip}</span>
              </li>
            ))}
          </ul>

          <p className="mt-3 text-[12px] text-gray-400">{progress.label}</p>
        </section>

        <div className="mt-3">
          <RoutinePianoPlayer challengeId={routine.challengeId} />
        </div>

        <section className="mt-4 rounded-[24px] bg-white px-5 py-6 shadow-soft">
          <p className="text-center text-[14px] leading-relaxed font-medium text-gray-500">
            연습일지 제목에 &apos;{keywordHint}&apos;을 넣어 기록하면
            <br />
            챌린지 진행도가 올라가요
          </p>
          <Link
            href={progress.ctaHref}
            className="mt-5 flex h-14 w-full items-center justify-center rounded-full bg-brand-500 text-[16px] font-bold text-white transition active:opacity-90"
          >
            {progress.ctaLabel}
          </Link>
        </section>
      </div>
    </div>
  );
}
