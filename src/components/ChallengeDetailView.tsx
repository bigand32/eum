"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useDb } from "@/lib/db/use-db";
import { useStudentId } from "@/lib/auth/use-student-id";
import {
  CHALLENGE_CATALOG,
  getChallengeDetailProgress,
  type ChallengeId,
} from "@/lib/challenges";
import { RoutineChallengeDetail } from "@/components/RoutineChallengeDetail";
import { LongToneGameView } from "@/components/LongToneGameView";
import { PitchChallengeCard } from "@/components/PitchChallengeCard";
import { DoremiChallengeView } from "@/components/DoremiChallengeView";

function ProgressFace({ percent }: { percent: number }) {
  const face = percent >= 90 ? "😄" : percent >= 60 ? "🙂" : percent >= 30 ? "😐" : "🌱";
  return (
    <div className="relative h-3 w-full overflow-hidden rounded-full bg-white/35">
      <div
        className="absolute inset-y-0 left-0 rounded-full bg-white/90 transition-all"
        style={{ width: `${Math.max(8, percent)}%` }}
      />
      <span
        className="absolute top-1/2 -translate-y-1/2 text-[14px] transition-all"
        style={{ left: `calc(${Math.min(92, Math.max(4, percent))}% - 8px)` }}
      >
        {face}
      </span>
      <span className="absolute top-1/2 right-2 -translate-y-1/2 text-[11px] font-bold text-white">
        {percent}%
      </span>
    </div>
  );
}

function DetailHeader({
  backHref = "/challenges",
  light,
}: {
  backHref?: string;
  light?: boolean;
}) {
  return (
    <header className="safe-top flex items-center justify-between px-4 py-3">
      <Link
        href={backHref}
        className={`flex h-9 w-9 items-center justify-center rounded-full ${
          light ? "bg-white/20 text-white" : "bg-white text-gray-800 shadow-sm"
        }`}
        aria-label="뒤로"
      >
        <i className="fa-solid fa-chevron-left text-[14px]" />
      </Link>
      <Link
        href="/daily"
        className={`flex h-9 w-9 items-center justify-center rounded-full ${
          light ? "bg-white/20 text-white" : "bg-white text-gray-500 shadow-sm"
        }`}
        aria-label="연습일지"
      >
        <i className="fa-solid fa-ellipsis text-[14px]" />
      </Link>
    </header>
  );
}

function PracticeWeekDetail({
  progress,
}: {
  progress: ReturnType<typeof getChallengeDetailProgress>;
}) {
  const level =
    progress.current >= 3 ? 3 : progress.current >= 2 ? 2 : progress.current >= 1 ? 1 : 0;
  const levelLabel =
    level === 0 ? "레벨0 씨앗" : level === 1 ? "레벨1 새싹" : level === 2 ? "레벨2 줄기" : "레벨3 나무";

  return (
    <div className="flex min-h-dvh flex-col bg-[#E8F3FF]">
      <DetailHeader />
      <div className="flex flex-1 flex-col px-6 pt-2 pb-8">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-[26px] font-extrabold leading-tight tracking-tight text-gray-900">
              {progress.completed ? "잘 자랐어요!" : "씨앗을 심었습니다"}
            </h1>
            <p className="mt-2 text-[15px] font-medium text-gray-500">
              {progress.completed
                ? "이번 주 연습 목표를 달성했어요"
                : "연습일지를 쓰며 잘 자라길 기다려 보아요"}
            </p>
          </div>
          <Link
            href="/daily"
            className="flex flex-col items-center gap-1 rounded-full bg-white px-3 py-2.5 shadow-sm"
          >
            <span className="text-[22px]">🧪</span>
            <span className="text-[10px] font-bold text-gray-600">미션받기</span>
          </Link>
        </div>

        <div className="flex flex-1 flex-col items-center justify-center py-10">
          <div className="relative flex h-44 w-44 items-end justify-center rounded-full bg-[#c4a484]/35">
            <img
              src="/challenge-icons/mungchi/write.png"
              alt=""
              className="absolute bottom-6 h-[120px] w-[120px] object-contain drop-shadow-md"
              style={{ transform: `scale(${0.75 + level * 0.12})` }}
            />
          </div>
        </div>

        <div className="rounded-[28px] bg-white p-5 shadow-[0_12px_40px_rgba(49,130,246,0.12)]">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-[14px] font-bold text-gray-900">{levelLabel}</p>
            <p className="text-[14px] font-extrabold text-brand-500">{progress.percent}%</p>
          </div>
          <div className="mb-4 h-2 overflow-hidden rounded-full bg-brand-50">
            <div
              className="h-full rounded-full bg-brand-500 transition-all"
              style={{ width: `${progress.percent}%` }}
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Link
              href="/daily"
              className="flex items-center gap-3 rounded-[18px] bg-surface px-3 py-3.5"
            >
              <span className="text-[28px]">💊</span>
              <div>
                <p className="text-[14px] font-bold text-gray-900">영양제 주기</p>
                <p className="text-[11px] text-gray-500">
                  {Math.max(0, progress.target - progress.current)}회 남음
                </p>
              </div>
            </Link>
            <Link
              href="/daily"
              className="flex items-center gap-3 rounded-[18px] bg-brand-50 px-3 py-3.5"
            >
              <span className="text-[28px]">💧</span>
              <div>
                <p className="text-[14px] font-bold text-gray-900">물 주기</p>
                <p className="text-[11px] text-brand-500">지금 주세요</p>
              </div>
            </Link>
          </div>
          <Link
            href={progress.ctaHref}
            className="mt-3 flex h-12 w-full items-center justify-center rounded-full bg-brand-500 text-[14px] font-bold text-white"
          >
            {progress.ctaLabel}
          </Link>
        </div>
      </div>
    </div>
  );
}

function FirstFeedbackDetail({
  progress,
}: {
  progress: ReturnType<typeof getChallengeDetailProgress>;
}) {
  const [picked, setPicked] = useState<string[]>([]);
  const chips = ["고음", "호흡", "비브라토", "음정", "발성", "무대"];

  return (
    <div className="flex min-h-dvh flex-col bg-white">
      <div className="bg-brand-500 pb-6 text-white">
        <DetailHeader light />
        <div className="px-6 pt-2">
          <div className="mb-4 flex items-end justify-between">
            <div>
              <p className="text-[13px] font-medium text-white/80">첫 피드백 챌린지</p>
              <h1 className="mt-1 text-[24px] font-extrabold leading-tight">
                어떤 부분을
                <br />
                고치고 싶나요?
              </h1>
            </div>
            <img
              src="/challenge-icons/mungchi/headphones.png"
              alt=""
              className="h-[72px] w-[72px] object-contain drop-shadow-sm"
            />
          </div>
          <ProgressFace percent={progress.percent} />
          <div className="mt-3 inline-block rounded-2xl rounded-tl-sm bg-white px-3 py-2 text-[12px] font-medium text-gray-700 shadow-sm">
            {progress.completed
              ? "이미 피드백을 받아봤어요. 다시 들어볼까요?"
              : "복수 선택 가능 · 관심 키워드를 골라주세요!"}
          </div>
        </div>
      </div>

      <div className="flex flex-1 flex-col px-5 py-6">
        <p className="mb-3 text-[13px] font-semibold text-gray-400">관심 키워드</p>
        <div className="flex flex-wrap gap-2">
          {chips.map((chip) => {
            const on = picked.includes(chip);
            return (
              <button
                key={chip}
                type="button"
                onClick={() =>
                  setPicked((prev) =>
                    on ? prev.filter((c) => c !== chip) : [...prev, chip],
                  )
                }
                className={`rounded-full px-4 py-2.5 text-[13px] font-bold transition ${
                  on
                    ? "bg-brand-500 text-white"
                    : "bg-sky-50 text-sky-800"
                }`}
              >
                {chip}
              </button>
            );
          })}
        </div>

        <div className="mt-auto pt-8">
          <Link
            href={progress.ctaHref}
            className="flex h-13 w-full items-center justify-center rounded-full bg-gray-900 py-4 text-[15px] font-bold text-white"
          >
            {progress.ctaLabel}
          </Link>
        </div>
      </div>
    </div>
  );
}

function HighNoteDetail({
  progress,
}: {
  progress: ReturnType<typeof getChallengeDetailProgress>;
}) {
  return (
    <div className="flex min-h-dvh flex-col bg-[#F3F5F8]">
      <DetailHeader />
      <div className="px-5 pb-10">
        <PitchChallengeCard challengeDayTarget={progress.target} />

        <section className="mt-3 rounded-[24px] bg-white px-5 py-4 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
          <h2 className="text-[14px] font-extrabold text-gray-900">연습 팁</h2>
          <p className="mt-2 text-[13px] leading-relaxed text-gray-500">
            워밍업 후 낮은 음부터 올라가요. 목이 조이면 한 키 내려서 다시.
            롱톤·호흡과 같이 하면 고음이 더 안정적이에요.
          </p>
          <div className="mt-3 flex gap-2">
            <Link
              href="/challenges/long-tone"
              className="rounded-full bg-sky-50 px-3 py-2 text-[12px] font-bold text-sky-700"
            >
              롱톤 게임
            </Link>
            <Link
              href="/challenges/breath-basics"
              className="rounded-full bg-gray-100 px-3 py-2 text-[12px] font-bold text-gray-600"
            >
              호흡법 기초
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}

function ConsistencyDetail({
  progress,
}: {
  progress: ReturnType<typeof getChallengeDetailProgress>;
}) {
  return (
    <div className="flex min-h-dvh flex-col bg-white">
      <DetailHeader />
      <div className="px-5 pb-8">
        <p className="text-[13px] font-bold text-brand-500">연습 루틴</p>
        <div className="mt-1 flex items-start justify-between gap-3">
          <h1 className="text-[26px] font-extrabold tracking-tight text-gray-900">
            이번 달 연습
            <br />
            달성률
          </h1>
          <img
            src="/challenge-icons/mungchi/checklist.png"
            alt=""
            className="h-16 w-16 shrink-0 object-contain"
          />
        </div>
        <p className="mt-2 text-[14px] text-gray-500">{progress.label}</p>

        <div className="my-8 flex justify-center">
          <div className="relative h-40 w-40">
            <svg viewBox="0 0 120 120" className="-rotate-90">
              <circle cx="60" cy="60" r="48" fill="none" stroke="#eef2f7" strokeWidth="12" />
              <circle
                cx="60"
                cy="60"
                r="48"
                fill="none"
                stroke="#3182f6"
                strokeWidth="12"
                strokeLinecap="round"
                strokeDasharray={2 * Math.PI * 48}
                strokeDashoffset={2 * Math.PI * 48 * (1 - progress.percent / 100)}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-[32px] font-extrabold text-gray-900">
                {progress.percent}%
              </span>
              <span className="text-[12px] font-medium text-gray-400">목표 12일</span>
            </div>
          </div>
        </div>

        <div className="rounded-[24px] bg-surface p-5">
          <p className="text-[14px] font-bold text-gray-900">이렇게 채워가요</p>
          <ul className="mt-3 space-y-2 text-[13px] text-gray-600">
            <li>· 주 3회 이상 연습일지 작성</li>
            <li>· 하루 10분만 해도 인정돼요</li>
            <li>· 피드백 받은 날은 보너스 성장</li>
          </ul>
        </div>

        <Link
          href={progress.ctaHref}
          className="mt-5 flex h-12 w-full items-center justify-center rounded-full bg-gray-900 text-[15px] font-bold text-white"
        >
          {progress.ctaLabel}
        </Link>
      </div>
    </div>
  );
}

function BreathDetail({
  progress,
}: {
  progress: ReturnType<typeof getChallengeDetailProgress>;
}) {
  const [showLongTone, setShowLongTone] = useState(false);
  const db = useDb();
  const studentId = useStudentId();
  const longToneProgress = useMemo(
    () => getChallengeDetailProgress("long-tone", db, studentId),
    [db, studentId],
  );

  const tips = [
    {
      title: "복식호흡 4초",
      desc: "들이쉬고 4초 유지",
      href: "/challenges/breath-basics",
    },
    {
      title: "지지음 연습",
      desc: "허밍으로 호흡 유지",
      action: "long-tone" as const,
    },
    {
      title: "가사 없이 호흡",
      desc: "멜로디만 호흡으로",
      action: "long-tone" as const,
    },
  ];

  if (showLongTone) {
    return (
      <LongToneGameView
        progress={longToneProgress}
        onBack={() => setShowLongTone(false)}
      />
    );
  }

  return (
    <div className="flex min-h-dvh flex-col bg-white">
      <div className="bg-sky-500 pb-6 text-white">
        <DetailHeader light />
        <div className="px-6 pt-2">
          <div className="mb-2">
            <p className="text-[13px] font-medium text-white/80">호흡 트레이닝</p>
            <h1 className="mt-1 text-[24px] font-extrabold leading-tight">
              조금만 더!
              <br />
              호흡이 자리 잡아요
            </h1>
          </div>
          <div className="relative pt-14">
            <img
              src="/challenge-icons/checkered-flag.png"
              alt=""
              className="pointer-events-none absolute top-0 right-1 z-0 h-[72px] w-[72px] object-contain drop-shadow-md"
            />
            <ProgressFace percent={progress.percent} />
          </div>
          <div className="mt-3 inline-block rounded-2xl rounded-tl-sm bg-white px-3 py-2 text-[12px] font-medium text-gray-700">
            연습일지 제목에 &apos;호흡&apos;을 넣어 기록해 주세요
          </div>
        </div>
      </div>

      <div className="relative z-10 flex flex-1 flex-col px-5 py-6 pb-10">
        <p className="mb-3 text-[13px] font-semibold text-gray-400">추천 미션</p>
        <div className="flex flex-col gap-2">
          {tips.map((tip) =>
            "href" in tip && tip.href ? (
              <Link
                key={tip.title}
                href={tip.href}
                className="flex items-center gap-3 rounded-[18px] border border-gray-100 bg-white px-4 py-3.5 shadow-soft transition active:bg-gray-50"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-sky-50 text-sky-600">
                  <i className="fa-solid fa-wind" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[14px] font-bold text-gray-900">{tip.title}</p>
                  <p className="text-[12px] text-gray-500">{tip.desc}</p>
                </div>
                <i className="fa-solid fa-chevron-right text-[12px] text-gray-300" />
              </Link>
            ) : (
              <button
                key={tip.title}
                type="button"
                onClick={() => setShowLongTone(true)}
                className="flex w-full items-center gap-3 rounded-[18px] border border-gray-100 bg-white px-4 py-3.5 text-left shadow-soft transition active:bg-gray-50"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-sky-50 text-sky-600">
                  <i className="fa-solid fa-wind" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[14px] font-bold text-gray-900">{tip.title}</p>
                  <p className="text-[12px] text-gray-500">{tip.desc}</p>
                </div>
                <i className="fa-solid fa-chevron-right text-[12px] text-gray-300" />
              </button>
            ),
          )}
        </div>

        <button
          type="button"
          onClick={() => setShowLongTone(true)}
          className="mt-6 w-full rounded-[22px] border border-sky-100 bg-sky-50/60 p-4 text-left transition active:bg-sky-50"
        >
          <div className="flex items-center gap-3">
            <img
              src="/challenge-icons/mungchi/breath.png"
              alt=""
              className="h-14 w-14 object-contain"
            />
            <div className="min-w-0 flex-1">
              <p className="text-[14px] font-extrabold text-gray-900">롱톤 유지력 게임</p>
              <p className="text-[12px] text-gray-500">
                캐릭터가 달리는 동안 긴 음을 유지해 보세요
              </p>
            </div>
            <i className="fa-solid fa-chevron-right text-[12px] text-gray-300" />
          </div>
        </button>

        <p className="mt-5 text-center text-[13px] font-medium text-gray-500">
          {longToneProgress.label}
        </p>
        <button
          type="button"
          onClick={() => setShowLongTone(true)}
          className="relative z-30 mt-4 flex h-12 w-full cursor-pointer items-center justify-center rounded-full bg-sky-500 text-[15px] font-bold text-white transition hover:bg-sky-600 active:scale-[0.99]"
        >
          롱톤 게임 하기
        </button>
        <Link
          href={progress.ctaHref}
          className="mt-2 block text-center text-[13px] font-bold text-gray-400"
        >
          {progress.ctaLabel}
        </Link>
      </div>
    </div>
  );
}

export function ChallengeDetailView({ challengeId }: { challengeId: ChallengeId }) {
  const db = useDb();
  const studentId = useStudentId();
  const progress = useMemo(
    () => getChallengeDetailProgress(challengeId, db, studentId),
    [challengeId, db, studentId],
  );
  const catalog = CHALLENGE_CATALOG.find((c) => c.id === challengeId);

  if (!catalog) return null;

  if (challengeId === "long-tone") {
    return <LongToneGameView progress={progress} />;
  }

  if (challengeId === "doremi") {
    return <DoremiChallengeView />;
  }

  if (
    challengeId === "daily-warmup" ||
    challengeId === "scale-basics" ||
    challengeId === "breath-basics" ||
    challengeId === "beginner-daily"
  ) {
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
        clayIcon={catalog.clayIcon}
        toneClass={toneClass}
      />
    );
  }

  if (challengeId === "practice-week") return <PracticeWeekDetail progress={progress} />;
  if (challengeId === "first-feedback") return <FirstFeedbackDetail progress={progress} />;
  if (challengeId === "high-note") return <HighNoteDetail progress={progress} />;
  if (challengeId === "consistency") return <ConsistencyDetail progress={progress} />;
  return <BreathDetail progress={progress} />;
}
