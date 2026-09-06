"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { ChallengeDetailProgress } from "@/lib/challenges";
import {
  getLongToneBest,
  getLongToneDayCount,
  getLongToneHistory,
  saveLongToneAttempt,
  suggestLongToneGoal,
  type LongToneRecord,
} from "@/lib/long-tone";
import { MUNGCHI } from "@/lib/mungchi";

type Phase = "ready" | "running" | "result";

type Props = {
  progress: ChallengeDetailProgress;
  onBack?: () => void;
};

export function LongToneGameView({ progress, onBack }: Props) {
  const [phase, setPhase] = useState<Phase>("ready");
  const [best, setBest] = useState(0);
  const [goalSec, setGoalSec] = useState(10);
  const [elapsed, setElapsed] = useState(0);
  const [level, setLevel] = useState(0);
  const [runningPose, setRunningPose] = useState(false);
  const [result, setResult] = useState<{
    seconds: number;
    isNewBest: boolean;
    finished: boolean;
  } | null>(null);
  const [history, setHistory] = useState<LongToneRecord[]>([]);
  const [dayCount, setDayCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [holdMode, setHoldMode] = useState<"voice" | "touch">("voice");

  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const elapsedRef = useRef(0);
  const touchOnRef = useRef(false);
  const goalRef = useRef(goalSec);

  useEffect(() => {
    const b = getLongToneBest();
    setBest(b);
    const g = suggestLongToneGoal(b);
    setGoalSec(g);
    goalRef.current = g;
    setHistory(getLongToneHistory());
    setDayCount(getLongToneDayCount());
  }, []);

  useEffect(() => {
    goalRef.current = goalSec;
  }, [goalSec]);

  useEffect(() => () => stopAll(), []);

  function stopAll() {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    void audioCtxRef.current?.close();
    audioCtxRef.current = null;
    analyserRef.current = null;
  }

  function rmsFromAnalyser(analyser: AnalyserNode) {
    const data = new Uint8Array(analyser.fftSize);
    analyser.getByteTimeDomainData(data);
    let sum = 0;
    for (let i = 0; i < data.length; i++) {
      const v = (data[i] - 128) / 128;
      sum += v * v;
    }
    return Math.sqrt(sum / data.length);
  }

  async function startGame() {
    setError(null);
    setResult(null);
    elapsedRef.current = 0;
    setElapsed(0);
    setLevel(0);
    setRunningPose(false);
    touchOnRef.current = false;

    if (holdMode === "voice") {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        streamRef.current = stream;
        const ctx = new AudioContext();
        audioCtxRef.current = ctx;
        const source = ctx.createMediaStreamSource(stream);
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 2048;
        source.connect(analyser);
        analyserRef.current = analyser;
      } catch {
        setError("마이크를 쓸 수 없어요. 누르고 유지 모드로 전환합니다.");
        setHoldMode("touch");
      }
    }

    setPhase("running");

    const tick = () => {
      const analyser = analyserRef.current;
      let sustaining = touchOnRef.current;
      let meter = touchOnRef.current ? 0.75 : 0;
      if (holdMode === "voice" && analyser) {
        const rms = rmsFromAnalyser(analyser);
        sustaining = rms > 0.02;
        meter = Math.min(1, rms * 8);
      }

      setRunningPose(sustaining);

      if (sustaining) {
        elapsedRef.current += 1 / 60;
        setElapsed(elapsedRef.current);
        setLevel(meter);
        if (elapsedRef.current >= goalRef.current) {
          finish(elapsedRef.current, true);
          return;
        }
      } else {
        setLevel((v) => Math.max(0, v * 0.9));
      }

      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
  }

  function finish(seconds: number, finished: boolean) {
    stopAll();
    setRunningPose(false);
    const saved = saveLongToneAttempt(seconds, goalRef.current);
    setBest(saved.best);
    const nextGoal = suggestLongToneGoal(saved.best);
    setGoalSec(nextGoal);
    goalRef.current = nextGoal;
    setHistory(getLongToneHistory());
    setDayCount(getLongToneDayCount());
    setResult({
      seconds: Math.floor(seconds * 10) / 10,
      isNewBest: saved.isNewBest,
      finished,
    });
    setPhase("result");
  }

  const progressPct = Math.min(100, (elapsed / goalSec) * 100);
  const runnerLeft = 8 + (progressPct / 100) * 76;
  const isMoving = phase === "running" && runningPose;
  const runner =
    phase === "result"
      ? result?.isNewBest
        ? MUNGCHI.best
        : MUNGCHI.win
      : phase === "running"
        ? MUNGCHI.sing
        : MUNGCHI.breath;

  const cheer =
    phase === "result"
      ? result?.finished
        ? "완주했어요!"
        : "잘했어요, 한 번 더 해볼까요?"
      : progressPct >= 90
        ? "이제 거의 다 왔어요!"
        : progressPct >= 40
          ? "잘하고 있어요, 조금만 더!"
          : phase === "running"
            ? holdMode === "voice"
              ? "‘아~’를 길게 유지해 보세요"
              : "화면을 누른 채 유지해요"
            : "목표 초만큼 롱톤을 이어가요";

  return (
    <div className="flex min-h-dvh flex-col bg-[#EEF2F6]">
      <style>{`
        @keyframes eum-run-bob {
          0%, 100% { transform: translate(-50%, 0) rotate(-2deg); }
          50% { transform: translate(-50%, -10px) rotate(2deg); }
        }
        @keyframes eum-run-trail {
          0% { opacity: 0.35; transform: translate(-50%, 0) scale(0.92); }
          100% { opacity: 0; transform: translate(-50%, 0) scale(0.8); }
        }
        .eum-runner-bob { animation: eum-run-bob 0.28s ease-in-out infinite; }
        .eum-runner-trail { animation: eum-run-trail 0.45s ease-out infinite; }
      `}</style>

      <header className="safe-top flex items-center justify-between px-4 py-3">
        {onBack ? (
          <button
            type="button"
            onClick={onBack}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-gray-800 shadow-sm"
            aria-label="뒤로"
          >
            <i className="fa-solid fa-chevron-left text-[14px]" />
          </button>
        ) : (
          <Link
            href="/challenges"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-gray-800 shadow-sm"
            aria-label="뒤로"
          >
            <i className="fa-solid fa-chevron-left text-[14px]" />
          </Link>
        )}
        <h1 className="text-[15px] font-bold text-gray-800">롱톤 챌린지</h1>
        <span className="w-9" />
      </header>

      <div className="flex flex-1 flex-col px-5 pb-8">
        <p className="mb-4 text-center text-[17px] font-extrabold tracking-tight text-gray-800">
          {cheer}
        </p>

        {/* 캐릭터 + 트랙 */}
        <section className="rounded-[28px] bg-white px-4 pt-6 pb-5 shadow-[0_8px_30px_rgba(15,23,42,0.04)]">
          <div className="relative mx-auto h-[132px] w-full max-w-[320px]">
            {isMoving && progressPct > 6 ? (
              <>
                <img
                  src={runner}
                  alt=""
                  className="eum-runner-trail pointer-events-none absolute bottom-10 h-[72px] w-[72px] object-contain"
                  style={{ left: `${Math.max(8, runnerLeft - 10)}%` }}
                />
                <img
                  src={runner}
                  alt=""
                  className="pointer-events-none absolute bottom-10 h-[72px] w-[72px] object-contain opacity-25"
                  style={{
                    left: `${Math.max(8, runnerLeft - 5)}%`,
                    transform: "translateX(-50%)",
                  }}
                />
              </>
            ) : null}
            <img
              src={runner}
              alt=""
              className={`pointer-events-none absolute bottom-8 h-[96px] w-[96px] object-contain will-change-transform ${
                isMoving ? "eum-runner-bob" : ""
              }`}
              style={{
                left: `${runnerLeft}%`,
                transform: isMoving ? undefined : "translateX(-50%)",
                transition: isMoving ? "left 80ms linear" : "left 200ms ease-out",
              }}
            />
          </div>

          <div className="relative mx-1 mt-1 h-3.5 rounded-full bg-gray-100">
            <div
              className="h-full rounded-full bg-emerald-400 transition-[width] duration-75"
              style={{ width: `${progressPct}%` }}
            />
            <div
              className="absolute top-1/2 h-9 w-9 -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px] border-white bg-[#F4FBF7] shadow-md"
              style={{
                left: `${Math.max(6, Math.min(94, progressPct))}%`,
                transition: "left 80ms linear",
              }}
            >
              <img src={runner} alt="" className="h-full w-full object-contain p-0.5" />
            </div>
          </div>

          <div className="mt-3 flex items-center justify-between px-1 text-[12px] font-bold text-gray-400">
            <span>0초</span>
            <span className="text-emerald-500">
              {phase === "running" ? `${elapsed.toFixed(1)}초` : `목표 ${goalSec}초`}
            </span>
            <span>{goalSec}초</span>
          </div>
        </section>

        {/* 게이지 */}
        <section className="mt-3 rounded-[28px] bg-white px-5 py-4 shadow-[0_8px_30px_rgba(15,23,42,0.04)]">
          <div className="mb-3 flex items-center justify-between text-[13px] font-bold">
            <span className="text-gray-500">복식호흡 게이지</span>
            <span className="text-emerald-500">{Math.round(level * 100)}%</span>
          </div>
          <div className="flex h-[72px] items-end justify-center gap-1.5">
            {Array.from({ length: 11 }, (_, i) => {
              const active = level > (i + 0.15) / 11;
              return (
                <div
                  key={i}
                  className={`w-2.5 rounded-full transition-all duration-100 ${
                    active ? "bg-sky-400" : "bg-gray-100"
                  }`}
                  style={{ height: `${32 + i * 5.5}%` }}
                />
              );
            })}
          </div>
          <p className="mt-3 text-center text-[12px] font-medium text-gray-400">
            소리가 안정될수록 캐릭터가 앞으로 달려요
          </p>
        </section>

        {/* 컨트롤 / 결과 */}
        <section className="mt-3 rounded-[28px] bg-white px-5 py-5 shadow-[0_8px_30px_rgba(15,23,42,0.04)]">
          {phase === "ready" ? (
            <div className="space-y-3">
              <div className="flex gap-2">
                <ModeChip
                  active={holdMode === "voice"}
                  onClick={() => setHoldMode("voice")}
                  label="마이크"
                />
                <ModeChip
                  active={holdMode === "touch"}
                  onClick={() => setHoldMode("touch")}
                  label="터치 유지"
                />
              </div>
              {error ? <p className="text-[12px] font-medium text-rose-500">{error}</p> : null}
              <button
                type="button"
                onClick={() => void startGame()}
                className="flex h-12 w-full items-center justify-center rounded-full bg-emerald-500 text-[15px] font-bold text-white"
              >
                목표 {goalSec}초 · 시작하기
              </button>
              <p className="text-center text-[12px] text-gray-400">
                최고 {best || 0}초 · {dayCount}/{progress.target}일
              </p>
            </div>
          ) : null}

          {phase === "running" ? (
            <div className="space-y-3">
              {holdMode === "touch" ? (
                <button
                  type="button"
                  onPointerDown={(e) => {
                    e.currentTarget.setPointerCapture(e.pointerId);
                    touchOnRef.current = true;
                  }}
                  onPointerUp={() => {
                    touchOnRef.current = false;
                  }}
                  onPointerCancel={() => {
                    touchOnRef.current = false;
                  }}
                  className="flex h-24 w-full select-none items-center justify-center rounded-[22px] bg-sky-500 text-[16px] font-bold text-white active:bg-sky-600"
                >
                  누르고 있는 동안 달려요
                </button>
              ) : (
                <div
                  className={`rounded-[22px] py-7 text-center text-[15px] font-bold ${
                    runningPose ? "bg-emerald-50 text-emerald-600" : "bg-gray-50 text-gray-500"
                  }`}
                >
                  {runningPose ? "달리는 중… 유지!" : "소리가 약해요 · ‘아~’를 이어보세요"}
                </div>
              )}
              <button
                type="button"
                onClick={() => finish(elapsedRef.current, elapsedRef.current >= goalRef.current)}
                className="flex h-11 w-full items-center justify-center rounded-full border border-gray-200 text-[14px] font-bold text-gray-600"
              >
                그만두기 · 기록 저장
              </button>
            </div>
          ) : null}

          {phase === "result" && result ? (
            <div className="text-center">
              <p className="text-[13px] font-bold text-emerald-500">
                {result.finished ? "완주" : "이번 기록"}
                {result.isNewBest ? " · 신기록 🎉" : ""}
              </p>
              <p className="mt-2 text-[44px] font-extrabold leading-none tracking-tight text-gray-900">
                {result.seconds}
                <span className="ml-1 text-[18px] font-bold text-gray-400">초</span>
              </p>
              <p className="mt-2 text-[13px] font-medium text-gray-400">다음 목표 {goalSec}초</p>
              <button
                type="button"
                onClick={() => {
                  setPhase("ready");
                  setElapsed(0);
                  setLevel(0);
                }}
                className="mt-5 flex h-12 w-full items-center justify-center rounded-full bg-emerald-500 text-[15px] font-bold text-white"
              >
                한 번 더
              </button>
              <Link
                href="/vocal-ai"
                className="mt-3 block text-[13px] font-bold text-brand-500"
              >
                이어서 AI 보컬 분석
              </Link>
            </div>
          ) : null}
        </section>

        {phase === "ready" && history.length > 0 ? (
          <div className="mt-4 px-1">
            <p className="mb-2 text-[12px] font-bold text-gray-400">최근 기록</p>
            <div className="flex flex-wrap gap-2">
              {history.slice(0, 4).map((h) => (
                <span
                  key={h.id}
                  className="rounded-full bg-white px-3 py-1.5 text-[12px] font-bold text-gray-600 shadow-sm"
                >
                  {h.seconds}초
                </span>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function ModeChip({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex-1 rounded-full py-2.5 text-[13px] font-bold transition ${
        active ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-500"
      }`}
    >
      {label}
    </button>
  );
}
