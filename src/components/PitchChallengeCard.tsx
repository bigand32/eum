"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { usePitchDetection } from "@/hooks/usePitchDetection";
import {
  HIGH_NOTE_TARGETS,
  isOnPitch,
  type TargetNote,
} from "@/lib/pitch/pitchUtils";
import {
  getHighNotePracticeDayCount,
  getHighNoteStreak,
  saveHighNoteResult,
  syncHighNoteResultsFromSupabase,
  type HighNoteSessionResult,
} from "@/lib/pitch/highNoteStorage";
import { useStudentId } from "@/lib/auth/use-student-id";
import { MUNGCHI } from "@/lib/mungchi";

type Phase = "intro" | "practice" | "report";

type Props = {
  challengeDayTarget?: number;
  targets?: TargetNote[];
  centThreshold?: number;
};

export function PitchChallengeCard({
  challengeDayTarget = 7,
  targets = HIGH_NOTE_TARGETS,
  centThreshold = 50,
}: Props) {
  const studentId = useStudentId();
  const [phase, setPhase] = useState<Phase>("intro");
  const [targetIdx, setTargetIdx] = useState(0);
  const [holdSec, setHoldSec] = useState(0);
  const [dayCount, setDayCount] = useState(0);
  const [streak, setStreak] = useState(0);
  const [report, setReport] = useState<HighNoteSessionResult | null>(null);
  const [saving, setSaving] = useState(false);
  const [starting, setStarting] = useState(false);

  const centsHistory = useRef<number[]>([]);
  const hzHistory = useRef<number[]>([]);
  const onPitchFrames = useRef(0);
  const totalVoiced = useRef(0);
  const maxHold = useRef(0);
  const holdAcc = useRef(0);
  const finishingRef = useRef(false);

  const target = targets[targetIdx] ?? targets[0];
  const { listening, error, frame, start, stop } = usePitchDetection({
    engine: "pitchy",
    bufferSize: 2048,
    targetHz: target?.frequency ?? null,
    enabled: phase === "practice",
  });

  function refreshStats() {
    setDayCount(getHighNotePracticeDayCount());
    setStreak(getHighNoteStreak());
  }

  useEffect(() => {
    refreshStats();
  }, [phase, report]);

  useEffect(() => {
    if (!studentId) {
      refreshStats();
      return;
    }
    let cancelled = false;
    void (async () => {
      await syncHighNoteResultsFromSupabase(studentId);
      if (!cancelled) refreshStats();
    })();
    return () => {
      cancelled = true;
    };
  }, [studentId]);

  const onPitch = useMemo(() => {
    if (frame.hz == null || frame.centsFrom == null) return false;
    return isOnPitch(frame.centsFrom, centThreshold);
  }, [frame, centThreshold]);

  useEffect(() => {
    if (phase !== "practice" || !listening) return;
    if (frame.hz == null || frame.centsFrom == null) {
      holdAcc.current = Math.max(0, holdAcc.current - 1 / 30);
      setHoldSec(holdAcc.current);
      return;
    }

    totalVoiced.current += 1;
    centsHistory.current.push(Math.abs(frame.centsFrom));
    hzHistory.current.push(frame.hz);
    if (centsHistory.current.length > 600) centsHistory.current.shift();
    if (hzHistory.current.length > 600) hzHistory.current.shift();

    if (onPitch) {
      onPitchFrames.current += 1;
      holdAcc.current += 1 / 60;
      maxHold.current = Math.max(maxHold.current, holdAcc.current);
    } else {
      holdAcc.current = Math.max(0, holdAcc.current - 1 / 20);
    }
    setHoldSec(holdAcc.current);

    if (holdAcc.current >= target.holdSeconds) {
      holdAcc.current = 0;
      setHoldSec(0);
      if (targetIdx < targets.length - 1) {
        setTargetIdx((i) => i + 1);
      } else {
        void finishSession();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [frame.hz, frame.centsFrom, onPitch, phase, listening, targetIdx]);

  function resetSessionStats() {
    centsHistory.current = [];
    hzHistory.current = [];
    onPitchFrames.current = 0;
    totalVoiced.current = 0;
    maxHold.current = 0;
    holdAcc.current = 0;
    setHoldSec(0);
    setTargetIdx(0);
  }

  async function finishSession() {
    if (finishingRef.current) return;
    finishingRef.current = true;
    stop();
    const abs = centsHistory.current;
    const avgCentsAbs =
      abs.length > 0 ? abs.reduce((a, b) => a + b, 0) / abs.length : 99;
    const onPitchRatio =
      totalVoiced.current > 0 ? onPitchFrames.current / totalVoiced.current : 0;
    const vibratoStability = estimateVibratoStability(hzHistory.current);
    const accuracyPct = Math.round(
      Math.max(0, Math.min(100, onPitchRatio * 100 * (1 - avgCentsAbs / 200))),
    );

    setSaving(true);
    setPhase("report");
    try {
      const saved = await saveHighNoteResult(
        {
          targetNote: targets.map((t) => t.note).join("→"),
          accuracyPct,
          avgCentsAbs: Math.round(avgCentsAbs * 10) / 10,
          maxHoldSec: Math.round(maxHold.current * 10) / 10,
          vibratoStability: Math.round(vibratoStability * 10) / 10,
          onPitchRatio: Math.round(onPitchRatio * 1000) / 10,
        },
        studentId || undefined,
      );
      setReport(saved);
      refreshStats();
    } finally {
      setSaving(false);
      finishingRef.current = false;
    }
  }

  async function beginPractice() {
    finishingRef.current = false;
    resetSessionStats();
    setReport(null);
    setStarting(true);
    setPhase("practice");
    try {
      await start();
    } finally {
      setStarting(false);
    }
  }

  const holdPct = Math.min(100, (holdSec / target.holdSeconds) * 100);
  const needle = frame.centsFrom == null ? 0 : Math.max(-100, Math.min(100, frame.centsFrom));
  const dayPct = Math.min(100, Math.round((dayCount / challengeDayTarget) * 100));
  const climbPct = ((targetIdx + holdPct / 100) / targets.length) * 100;
  const noteLabel = target.label ?? target.note;
  const pose =
    phase === "report"
      ? saving
        ? MUNGCHI.analyze
        : MUNGCHI.win
      : phase === "practice"
        ? onPitch
          ? MUNGCHI.highnote
          : MUNGCHI.sing
        : MUNGCHI.highnote;

  return (
    <div className="space-y-3">
      <style>{`
        @keyframes eum-pitch-bob {
          0%, 100% { transform: translate(-50%, 0); }
          50% { transform: translate(-50%, -8px); }
        }
        .eum-pitch-bob { animation: eum-pitch-bob 0.35s ease-in-out infinite; }
      `}</style>

      {/* 히어로 */}
      <section className="relative overflow-hidden rounded-[28px] bg-amber-400 px-5 pt-5 pb-5 text-white shadow-[0_10px_30px_rgba(251,191,36,0.25)]">
        <p className="text-[12px] font-bold text-white/85">매일 10분 · 7일</p>
        <h2 className="mt-1 text-[22px] font-extrabold leading-snug tracking-tight">
          고음 챌린지가
          <br />
          도착했어요
        </h2>
        <p className="mt-2 max-w-[210px] text-[13px] text-white/90">
          목표음을 맞추고 잠시 유지하면 다음 음으로 올라가요
        </p>
        <img
          src={MUNGCHI.highnote}
          alt=""
          className="pointer-events-none absolute right-1 bottom-1 h-[88px] w-[88px] object-contain"
        />
      </section>

      {/* 진행 */}
      <section className="rounded-[24px] bg-white px-5 py-4 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
        <div className="mb-2 flex items-center justify-between text-[13px] font-bold">
          <span className="text-gray-500">7일 챌린지</span>
          <span className="text-amber-600">
            {dayCount}/{challengeDayTarget}일 · 연속 {streak}일
          </span>
        </div>
        <div className="h-2.5 overflow-hidden rounded-full bg-amber-50">
          <div className="h-full rounded-full bg-amber-400" style={{ width: `${dayPct}%` }} />
        </div>
      </section>

      {phase === "intro" ? (
        <section className="rounded-[28px] bg-white px-5 py-5 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
          <div className="mb-4 flex items-center gap-3">
            <img src={MUNGCHI.highnote} alt="" className="h-14 w-14 object-contain" />
            <div>
              <p className="text-[15px] font-extrabold text-gray-900">목표음 {targets.length}단</p>
              <p className="mt-0.5 text-[13px] text-gray-500">
                C4에서 E5까지 · 각 음 {targets[0]?.holdSeconds ?? 2}초 유지
              </p>
            </div>
          </div>
          <ul className="mb-5 space-y-2 text-[13px] text-gray-600">
            <li>· 마이크에 대고 목표음에 맞춰 불러요</li>
            <li>· 초록불이면 잘 맞고 있어요</li>
            <li>· 유지하면 자동으로 다음 음으로 넘어가요</li>
          </ul>
          {error ? <p className="mb-3 text-[12px] font-medium text-rose-500">{error}</p> : null}
          <button
            type="button"
            disabled={starting}
            onClick={() => void beginPractice()}
            className="flex h-12 w-full cursor-pointer items-center justify-center rounded-full bg-brand-500 text-[15px] font-bold text-white transition hover:bg-brand-600 disabled:opacity-60"
          >
            {starting ? "마이크 준비 중…" : "고음 챌린지 시작"}
          </button>
        </section>
      ) : null}

      {phase === "practice" ? (
        <>
          <section className="rounded-[28px] bg-white px-5 py-5 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
            <div className="flex items-end justify-between">
              <div>
                <p className="text-[12px] font-bold text-amber-600">
                  {targetIdx + 1} / {targets.length} · {noteLabel}
                </p>
                <p className="mt-1 text-[36px] font-extrabold tracking-tight text-gray-900">
                  {target.note}
                </p>
              </div>
              <div className="text-right">
                <p className="text-[12px] font-bold text-gray-400">지금 내는 음</p>
                <p
                  className={`text-[28px] font-extrabold ${
                    onPitch ? "text-emerald-500" : "text-gray-800"
                  }`}
                >
                  {frame.note}
                </p>
              </div>
            </div>

            {/* 캐릭터 클라이밍 트랙 */}
            <div className="relative mt-5 h-[110px] overflow-hidden rounded-[22px] bg-amber-50">
              <div className="absolute inset-x-4 bottom-4 h-2.5 rounded-full bg-white">
                <div
                  className={`h-full rounded-full transition-all ${
                    onPitch ? "bg-emerald-400" : "bg-amber-300"
                  }`}
                  style={{ width: `${climbPct}%` }}
                />
              </div>
              <img
                src={pose}
                alt=""
                className={`pointer-events-none absolute bottom-8 h-16 w-16 object-contain ${
                  onPitch ? "eum-pitch-bob" : ""
                }`}
                style={{
                  left: `${Math.max(10, Math.min(88, climbPct))}%`,
                  transform: onPitch ? undefined : "translateX(-50%)",
                  transition: "left 120ms linear",
                }}
              />
              <p className="absolute top-3 left-4 text-[12px] font-bold text-amber-700/80">
                {onPitch ? "좋아요! 유지 중" : "목표음에 가까이…"}
              </p>
            </div>

            {/* 음정 맞춤 미터 */}
            <div
              className={`relative mt-4 h-24 overflow-hidden rounded-[20px] border transition-colors ${
                onPitch ? "border-emerald-200 bg-emerald-50" : "border-gray-100 bg-gray-50"
              }`}
            >
              <div className="absolute inset-x-5 top-1/2 h-0.5 -translate-y-1/2 bg-amber-400/70" />
              <p className="absolute top-1/2 right-4 -translate-y-1/2 text-[11px] font-bold text-amber-600">
                목표
              </p>
              <div
                className={`absolute left-1/2 h-4 w-4 -translate-x-1/2 rounded-full border-2 border-white shadow ${
                  onPitch ? "scale-125 bg-emerald-500" : "bg-brand-500"
                }`}
                style={{ top: `calc(50% - ${needle * 0.35}px)` }}
              />
              <p
                className={`absolute right-4 bottom-3 text-[13px] font-extrabold ${
                  onPitch ? "text-emerald-600" : "text-gray-500"
                }`}
              >
                {onPitch ? "맞춤!" : frame.hz ? "조율 중" : "소리 기다리는 중"}
              </p>
            </div>

            <div className="mt-4 mb-1 flex justify-between text-[12px] font-bold text-gray-500">
              <span>유지</span>
              <span>
                {holdSec.toFixed(1)} / {target.holdSeconds}초
              </span>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-gray-100">
              <div
                className={`h-full rounded-full ${onPitch ? "bg-emerald-400" : "bg-gray-300"}`}
                style={{ width: `${holdPct}%` }}
              />
            </div>

            {error ? <p className="mt-3 text-[12px] font-medium text-rose-500">{error}</p> : null}

            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => void finishSession()}
                className="flex h-11 flex-1 items-center justify-center rounded-full border border-gray-200 text-[14px] font-bold text-gray-700"
              >
                종료
              </button>
              <button
                type="button"
                onClick={() => {
                  if (targetIdx < targets.length - 1) {
                    setTargetIdx((i) => i + 1);
                    holdAcc.current = 0;
                    setHoldSec(0);
                  } else void finishSession();
                }}
                className="flex h-11 flex-1 items-center justify-center rounded-full bg-gray-900 text-[14px] font-bold text-white"
              >
                다음 음
              </button>
            </div>
          </section>
        </>
      ) : null}

      {phase === "report" && report ? (
        <section className="rounded-[28px] bg-white px-5 py-6 text-center shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
          <img src={pose} alt="" className="mx-auto h-20 w-20 object-contain" />
          <p className="mt-2 text-[13px] font-bold text-amber-600">오늘의 결과</p>
          <p className="mt-2 text-[48px] font-extrabold leading-none tracking-tight text-gray-900">
            {report.accuracyPct}
            <span className="ml-1 text-[18px] font-bold text-gray-400">점</span>
          </p>
          <p className="mt-2 text-[12px] text-gray-400">
            {saving ? "저장 중…" : studentId ? "클라우드에 저장됐어요" : "이 기기에 저장됐어요"}
          </p>
          <div className="mt-5 grid grid-cols-2 gap-2 text-left">
            <Stat label="최고 유지" value={`${report.maxHoldSec}초`} />
            <Stat label="맞춘 비율" value={`${report.onPitchRatio}%`} />
            <Stat label="평균 오차" value={`${report.avgCentsAbs}`} />
            <Stat label="안정성" value={`${report.vibratoStability}`} />
          </div>
          <button
            type="button"
            onClick={() => void beginPractice()}
            className="mt-5 flex h-12 w-full items-center justify-center rounded-full bg-brand-500 text-[15px] font-bold text-white"
          >
            다시 도전
          </button>
          <Link href="/challenges/long-tone" className="mt-3 block text-[13px] font-bold text-brand-500">
            호흡 롱톤도 이어서
          </Link>
        </section>
      ) : null}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[16px] bg-gray-50 px-3 py-3">
      <p className="text-[11px] font-bold text-gray-400">{label}</p>
      <p className="mt-0.5 text-[16px] font-extrabold text-gray-900">{value}</p>
    </div>
  );
}

function estimateVibratoStability(hzList: number[]) {
  if (hzList.length < 20) return 50;
  const recent = hzList.slice(-90);
  const mean = recent.reduce((a, b) => a + b, 0) / recent.length;
  if (mean <= 0) return 40;
  let varSum = 0;
  for (const h of recent) varSum += (h - mean) ** 2;
  const std = Math.sqrt(varSum / recent.length);
  const cv = std / mean;
  if (cv < 0.003) return 88;
  if (cv < 0.01) return 92;
  if (cv < 0.02) return 78;
  if (cv < 0.04) return 60;
  return 42;
}
