"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useDb } from "@/lib/db/use-db";
import { useStudentId } from "@/lib/auth/use-student-id";
import {
  CHALLENGE_CATALOG,
  getChallengeDetailProgress,
  type ChallengeCatalogItem,
} from "@/lib/challenges";
import { MUNGCHI } from "@/lib/mungchi";

const FILTERS = ["전체", "#초보", "#루틴", "#피드백", "#고음", "#호흡"] as const;

const TONE_CLASS: Record<ChallengeCatalogItem["tone"], string> = {
  brand: "bg-brand-50",
  amber: "bg-amber-50",
  sky: "bg-sky-50",
  mint: "bg-emerald-50",
  warm: "bg-orange-50",
};

const TONE_ACCENT: Record<ChallengeCatalogItem["tone"], string> = {
  brand: "text-brand-500",
  amber: "text-amber-600",
  sky: "text-sky-600",
  mint: "text-emerald-600",
  warm: "text-orange-600",
};

export function ChallengesHubView() {
  const db = useDb();
  const studentId = useStudentId();
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("전체");

  const cards = useMemo(
    () =>
      CHALLENGE_CATALOG.map((item) => ({
        item,
        progress: getChallengeDetailProgress(item.id, db, studentId),
      })),
    [db, studentId],
  );

  const filtered =
    filter === "전체"
      ? cards
      : cards.filter((c) => c.item.filter === filter);

  const earnable = cards
    .filter((c) => !c.progress.completed)
    .reduce((sum, c) => sum + (c.progress.target - c.progress.current) * 100, 0);

  return (
    <div className="min-h-dvh bg-white pb-8">
      <header className="safe-top px-5 pt-4 pb-2">
        <div className="flex items-end justify-between gap-3">
          <div>
            <h1 className="text-[28px] font-extrabold tracking-tight text-gray-900">챌린지</h1>
            <p className="mt-1 text-[13px] font-medium text-gray-500">뭉치와 함께 오늘 연습해요</p>
          </div>
          <img
            src={MUNGCHI.idle}
            alt=""
            className="h-16 w-16 object-contain"
          />
        </div>
      </header>

      <section className="no-scrollbar flex gap-3 overflow-x-auto px-5 pt-3 pb-2">
        {cards.slice(0, 3).map(({ item, progress }) => (
          <Link
            key={item.id}
            href={`/challenges/${item.id}`}
            className={`relative h-[150px] w-[220px] shrink-0 overflow-hidden rounded-[24px] p-5 text-white ${
              item.tone === "amber"
                ? "bg-amber-400"
                : item.tone === "sky"
                  ? "bg-sky-400"
                  : item.tone === "mint"
                    ? "bg-emerald-400"
                    : "bg-brand-500"
            }`}
          >
            <p className="text-[17px] font-extrabold leading-snug">
              {item.title}
              <br />
              도착했어요
            </p>
            <p className="mt-2 text-[12px] font-medium text-white/85">{progress.label}</p>
            <img
              src={item.clayIcon}
              alt=""
              className="pointer-events-none absolute right-2 bottom-2 h-[72px] w-[72px] object-contain drop-shadow-sm"
            />
            {!progress.completed && (
              <span className="absolute bottom-4 left-5 rounded-full bg-white px-2 py-0.5 text-[10px] font-bold text-rose-500">
                new
              </span>
            )}
          </Link>
        ))}
      </section>

      <section className="mt-4 px-5">
        <Link
          href="/vocal-ai"
          className="relative flex overflow-hidden rounded-[20px] bg-gradient-to-r from-brand-500 to-sky-500 p-4 text-white"
        >
          <div className="min-w-0 flex-1 pr-16">
            <p className="text-[11px] font-bold text-white/80">NEW · AI</p>
            <p className="mt-0.5 text-[15px] font-extrabold leading-snug">
              녹음하면 음정·박자·발성 AI 분석
            </p>
            <p className="mt-1 text-[11px] text-white/80">노래방 점수보다 디테일한 리포트</p>
          </div>
          <img
            src={MUNGCHI.analyze}
            alt=""
            className="absolute right-2 bottom-1 h-14 w-14 object-contain"
          />
        </Link>
      </section>

      <section className="mt-4 px-5">
        <div className="flex items-center justify-between rounded-[16px] bg-surface px-4 py-3 text-[13px] font-bold text-gray-700">
          <span>연습 포인트 현황</span>
          <Link href="/daily" className="text-brand-500">
            일지 보기 ›
          </Link>
        </div>
      </section>

      <section className="mt-7 px-5">
        <p className="text-[13px] font-semibold text-gray-400">챌린지 모아보기</p>
        <p className="mt-1 text-[18px] font-extrabold text-gray-900">
          <span className="text-brand-500">{earnable.toLocaleString("ko-KR")}</span> 더
          채울 수 있어요!
        </p>

        <div className="no-scrollbar mt-4 flex gap-2 overflow-x-auto pb-1">
          {FILTERS.map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={`shrink-0 rounded-full px-3.5 py-2 text-[13px] font-bold transition ${
                filter === f
                  ? "bg-gray-900 text-white"
                  : "border border-gray-200 bg-white text-gray-700"
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3">
          {filtered.map(({ item, progress }) => (
            <Link
              key={item.id}
              href={`/challenges/${item.id}`}
              className={`relative flex min-h-[200px] flex-col overflow-hidden rounded-[22px] p-4 ${TONE_CLASS[item.tone]}`}
            >
              <div className="flex items-start justify-between gap-2 pr-1">
                <h3 className="text-[15px] font-extrabold leading-snug text-gray-900">
                  {item.title}
                </h3>
                <span className="shrink-0 rounded-md bg-white/80 px-2 py-0.5 text-[10px] font-bold text-gray-600">
                  {item.tag}
                </span>
              </div>
              <p className={`mt-1.5 text-[13px] font-bold ${TONE_ACCENT[item.tone]}`}>
                {progress.percent}%
              </p>
              <div className={`mt-3 text-[22px] ${TONE_ACCENT[item.tone]} opacity-80`}>
                <i className={`fa-solid ${item.icon}`} />
              </div>
              <p className="mt-auto pt-10 text-[11px] font-medium text-gray-400">
                {progress.completed ? "완료" : `목표 ${progress.target}`}
              </p>
              <img
                src={item.clayIcon}
                alt=""
                className="pointer-events-none absolute right-0 bottom-0 h-[108px] w-[108px] object-contain object-bottom drop-shadow-sm"
              />
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
