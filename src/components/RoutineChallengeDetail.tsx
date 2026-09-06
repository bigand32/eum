"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { ChallengeDetailProgress } from "@/lib/challenges";
import {
  formatStepTime,
  getRoutineByChallengeId,
  type VocalRoutine,
} from "@/lib/vocal-routines";
import { MUNGCHI } from "@/lib/mungchi";

type Props = {
  challengeId: string;
  progress: ChallengeDetailProgress;
  clayIcon: string;
  toneClass: string;
};

export function RoutineChallengeDetail({
  challengeId,
  progress,
  clayIcon,
  toneClass,
}: Props) {
  const routine = getRoutineByChallengeId(challengeId);
  if (!routine) return null;

  return (
    <RoutinePlayer
      routine={routine}
      progress={progress}
      clayIcon={clayIcon}
      toneClass={toneClass}
    />
  );
}

function RoutinePlayer({
  routine,
  progress,
  clayIcon,
  toneClass,
}: {
  routine: VocalRoutine;
  progress: ChallengeDetailProgress;
  clayIcon: string;
  toneClass: string;
}) {
  const [stepIdx, setStepIdx] = useState(0);
  const [remaining, setRemaining] = useState(routine.steps[0]?.durationSec ?? 0);
  const [running, setRunning] = useState(false);
  const [doneSteps, setDoneSteps] = useState<Set<string>>(new Set());

  const step = routine.steps[stepIdx];

  useEffect(() => {
    setRemaining(step?.durationSec ?? 0);
    setRunning(false);
  }, [stepIdx, step?.durationSec]);

  useEffect(() => {
    if (!running || remaining <= 0) return;
    const t = window.setInterval(() => {
      setRemaining((r) => {
        if (r <= 1) {
          window.clearInterval(t);
          setRunning(false);
          setDoneSteps((prev) => new Set(prev).add(step.id));
          return 0;
        }
        return r - 1;
      });
    }, 1000);
    return () => window.clearInterval(t);
  }, [running, remaining, step.id]);

  const allDone = doneSteps.size >= routine.steps.length;
  const keywordHint = routine.keywords[0] ?? "루틴";
  const pose = allDone ? MUNGCHI.win : running ? MUNGCHI.sing : clayIcon || MUNGCHI.idle;

  return (
    <div className="flex min-h-dvh flex-col bg-white">
      <div className={`${toneClass} pb-6 text-white`}>
        <header className="safe-top flex items-center justify-between px-4 py-3">
          <Link
            href="/challenges"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-white/20 text-white"
            aria-label="뒤로"
          >
            <i className="fa-solid fa-chevron-left text-[14px]" />
          </Link>
          <span className="rounded-full bg-white/20 px-3 py-1 text-[12px] font-bold">
            {routine.level} · {routine.totalMin}
          </span>
        </header>
        <div className="flex items-end justify-between gap-3 px-6 pt-1">
          <div className="min-w-0">
            <p className="text-[13px] font-medium text-white/80">따라 하기 루틴</p>
            <h1 className="mt-1 text-[24px] font-extrabold leading-tight">{routine.title}</h1>
            <p className="mt-2 text-[13px] text-white/85">{routine.subtitle}</p>
          </div>
          <img src={pose} alt="" className="h-16 w-16 shrink-0 object-contain" />
        </div>
        <p className="mt-4 px-6 text-[12px] font-medium text-white/80">{progress.label}</p>
      </div>

      <div className="flex flex-1 flex-col px-5 py-5">
        <div className="mb-4 flex gap-1.5">
          {routine.steps.map((s, i) => (
            <div
              key={s.id}
              className={`h-1.5 flex-1 rounded-full ${
                doneSteps.has(s.id)
                  ? "bg-brand-500"
                  : i === stepIdx
                    ? "bg-brand-300"
                    : "bg-gray-100"
              }`}
            />
          ))}
        </div>

        <div className="shadow-soft rounded-[24px] border border-gray-100 bg-white p-5">
          <p className="text-[12px] font-bold text-brand-500">
            STEP {stepIdx + 1} / {routine.steps.length}
          </p>
          <h2 className="mt-1 text-[20px] font-extrabold text-gray-900">{step.title}</h2>
          <p className="mt-3 text-[14px] leading-relaxed text-gray-600">{step.how}</p>
          <p className="mt-2 text-[13px] font-medium text-gray-400">💡 {step.tip}</p>

          <div className="mt-6 flex flex-col items-center">
            <p className="text-[40px] font-extrabold tracking-tight text-gray-900">
              {formatStepTime(remaining)}
            </p>
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => setRunning((v) => !v)}
                className="rounded-full bg-brand-500 px-6 py-3 text-[14px] font-bold text-white"
              >
                {running ? "일시정지" : remaining === 0 ? "다시" : "시작"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setDoneSteps((prev) => new Set(prev).add(step.id));
                  setRunning(false);
                  setRemaining(0);
                }}
                className="rounded-full border border-gray-200 px-5 py-3 text-[14px] font-bold text-gray-700"
              >
                완료
              </button>
            </div>
          </div>
        </div>

        <div className="mt-4 flex gap-2">
          <button
            type="button"
            disabled={stepIdx === 0}
            onClick={() => setStepIdx((i) => Math.max(0, i - 1))}
            className="flex-1 rounded-full border border-gray-200 py-3 text-[14px] font-bold text-gray-700 disabled:opacity-40"
          >
            이전
          </button>
          <button
            type="button"
            disabled={stepIdx >= routine.steps.length - 1}
            onClick={() => setStepIdx((i) => Math.min(routine.steps.length - 1, i + 1))}
            className="flex-1 rounded-full bg-gray-900 py-3 text-[14px] font-bold text-white disabled:opacity-40"
          >
            다음 스텝
          </button>
        </div>

        {allDone ? (
          <div className="mt-5 rounded-[20px] bg-brand-50 p-4 text-center">
            <img src={MUNGCHI.win} alt="" className="mx-auto h-14 w-14 object-contain" />
            <p className="mt-2 text-[15px] font-extrabold text-gray-900">오늘 루틴 완료!</p>
            <p className="mt-1 text-[12px] text-gray-500">
              연습일지 제목에 &apos;{keywordHint}&apos;을 넣어 기록하면 챌린지 진행도가 올라가요
            </p>
            <Link
              href={progress.ctaHref}
              className="mt-3 inline-flex h-11 items-center justify-center rounded-full bg-brand-500 px-6 text-[14px] font-bold text-white"
            >
              {progress.ctaLabel}
            </Link>
          </div>
        ) : (
          <Link
            href="/vocal-ai"
            className="mt-5 flex items-center justify-between rounded-[18px] border border-gray-100 bg-surface px-4 py-3.5"
          >
            <div>
              <p className="text-[13px] font-bold text-gray-900">연습 후 AI 분석해 보기</p>
              <p className="text-[11px] text-gray-500">음정·박자·호흡을 점수와 리포트로</p>
            </div>
            <i className="fa-solid fa-chevron-right text-[12px] text-gray-300" />
          </Link>
        )}
      </div>
    </div>
  );
}
