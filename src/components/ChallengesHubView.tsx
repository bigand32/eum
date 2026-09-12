"use client";

import Link from "next/link";
import { useState } from "react";
import { CHALLENGE_CATALOG } from "@/lib/challenges";
import { challengeIcon } from "@/components/ChallengeIcons";
import { MUNGCHI } from "@/lib/mungchi";

const FILTERS = ["전체", "#발성", "#호흡"] as const;

export function ChallengesHubView() {
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("전체");

  const filtered =
    filter === "전체"
      ? CHALLENGE_CATALOG
      : CHALLENGE_CATALOG.filter((c) => c.filter === filter);

  return (
    <div className="min-h-dvh bg-[#F5F6F8] pb-4">
      <header className="safe-top px-5 pt-4 pb-2">
        <h1 className="text-[22px] font-extrabold tracking-tight text-gray-900">챌린지</h1>
      </header>

      <section className="mt-3 px-5">
        <Link
          href="/vocal-ai"
          className="relative flex overflow-hidden rounded-[22px] bg-gradient-to-br from-brand-600 to-brand-400 p-5 text-white shadow-soft transition active:opacity-95"
        >
          <div className="relative z-10 min-w-0 pr-20">
            <p className="text-[11px] font-bold uppercase tracking-wide text-white/75">AI 보컬 분석</p>
            <p className="mt-1 text-[17px] font-extrabold leading-snug">
              녹음하면 음정·호흡
              <br />
              바로 리포트
            </p>
            <span className="mt-3 inline-flex items-center gap-1 rounded-full bg-white/20 px-3 py-1 text-[12px] font-bold backdrop-blur-sm">
              지금 분석하기
              <i className="fa-solid fa-chevron-right text-[10px]" />
            </span>
          </div>
          <img
            src={MUNGCHI.analyze}
            alt=""
            className="pointer-events-none absolute right-1 bottom-0 h-[88px] w-[88px] object-contain"
          />
        </Link>
      </section>

      <section className="mt-4 px-5">
        <div className="flex gap-2">
          {FILTERS.map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={`rounded-full px-4 py-2 text-[13px] font-bold transition ${
                filter === f
                  ? "bg-brand-500 text-white"
                  : "bg-white text-gray-600 shadow-soft"
              }`}
            >
              {f === "전체" ? "전체" : f.replace("#", "")}
            </button>
          ))}
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2.5">
          {filtered.map((item) => {
            const Icon = challengeIcon(item.id);
            return (
              <Link
                key={item.id}
                href={`/challenges/${item.id}`}
                className="flex flex-col items-center gap-2.5 rounded-[20px] bg-white px-3 py-5 shadow-soft transition active:opacity-95"
              >
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-500">
                  <Icon className="h-7 w-7" />
                </div>
                <div className="min-w-0 text-center">
                  <p className="truncate text-[14px] font-extrabold text-gray-900">
                    {item.title}
                  </p>
                  <span className="mt-1 inline-block rounded-md bg-gray-50 px-1.5 py-0.5 text-[10px] font-bold text-gray-400">
                    {item.tag}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
}
