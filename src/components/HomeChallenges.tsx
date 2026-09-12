"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useDb } from "@/lib/db/use-db";
import { useStudentId } from "@/lib/auth/use-student-id";
import { buildHomeChallenges } from "@/lib/challenges";
import { MUNGCHI } from "@/lib/mungchi";

function MeterRing({ percent }: { percent: number }) {
  const r = 28;
  const c = 2 * Math.PI * r;
  const offset = c * (1 - Math.min(100, Math.max(0, percent)) / 100);
  return (
    <div className="relative h-[72px] w-[72px] shrink-0">
      <svg viewBox="0 0 72 72" className="-rotate-90">
        <circle cx="36" cy="36" r={r} fill="none" stroke="#e5e7eb" strokeWidth="8" />
        <circle
          cx="36"
          cy="36"
          r={r}
          fill="none"
          stroke="var(--brand-500)"
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-[15px] font-extrabold text-gray-900">{percent}%</span>
      </div>
    </div>
  );
}

export function HomeChallenges() {
  const db = useDb();
  const studentId = useStudentId();
  const challenges = useMemo(
    () => buildHomeChallenges(db, studentId),
    [db, studentId],
  );

  const active = challenges.filter((c) => !c.completed && c.id !== "consistency");
  const activeCount = active.length;
  const preview = active[0];
  const previewTitle =
    preview && "title" in preview
      ? preview.title.replace(/\n/g, " ")
      : "챌린지를 시작해 보세요";

  const routine = challenges.find((c) => c.id === "consistency" && c.kind === "meter");

  return (
    <section className="mt-10 px-5">
      <h3 className="mb-4 text-[19px] font-bold tracking-tight text-gray-900">
        진행중인 챌린지
        {activeCount > 0 && (
          <span className="ml-2 text-[14px] font-bold text-brand-500">{activeCount}</span>
        )}
      </h3>

      <div className="flex flex-col gap-3">
        <Link
          href="/challenges"
          className="shadow-soft flex items-center gap-3.5 rounded-[20px] bg-gray-50 px-4 py-4 transition active:bg-gray-100"
        >
          <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-white">
            <img
              src={MUNGCHI.idle}
              alt=""
              className="h-11 w-11 object-contain"
            />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[15px] font-bold text-gray-900">챌린지 목록 보기</p>
            <p className="mt-0.5 truncate text-[12px] text-gray-500">
              {activeCount === 0
                ? "완료한 챌린지를 확인해 보세요"
                : activeCount === 1
                  ? previewTitle
                  : `${previewTitle} 외 ${activeCount - 1}개 진행 중`}
            </p>
          </div>
          <i className="fa-solid fa-chevron-right text-[12px] text-gray-300" aria-hidden />
        </Link>

        {routine && routine.kind === "meter" ? (
          <Link
            href={routine.href}
            className={`shadow-soft flex items-center justify-between gap-4 rounded-[24px] px-5 py-4 ${
              routine.completed ? "bg-green-50" : "bg-gray-50"
            }`}
          >
            <div className="min-w-0">
              <p className="text-[12px] font-bold text-brand-500">{routine.label}</p>
              <h4 className="mt-1 text-[16px] font-extrabold leading-snug tracking-tight text-gray-900">
                {routine.title}
              </h4>
              <p className="mt-1 text-[12px] text-gray-500">{routine.detail}</p>
            </div>
            <MeterRing percent={routine.percent} />
          </Link>
        ) : null}
      </div>
    </section>
  );
}
