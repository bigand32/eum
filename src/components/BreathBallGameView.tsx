"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { ChallengeDetailProgress } from "@/lib/challenges";
import {
  BREATH_BALL_GOALS,
  getBreathBallBest,
  getBreathBallDayCount,
  getBreathBallHistory,
  saveBreathBallAttempt,
  suggestBreathBallGoal,
  type BreathBallRecord,
} from "@/lib/breath-ball";

type Phase = "ready" | "running" | "result";
type HoldMode = "voice" | "touch";

type Props = {
  progress: ChallengeDetailProgress;
};

export function BreathBallGameView({ progress }: Props) {
  const [phase, setPhase] = useState<Phase>("ready");
  const [goalSec, setGoalSec] = useState(20);
  const [best, setBest] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [height, setHeight] = useState(0.35);
  const [blowing, setBlowing] = useState(false);
  const [started, setStarted] = useState(false);
  const [holdMode, setHoldMode] = useState<HoldMode>("voice");
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<BreathBallRecord[]>([]);
  const [dayCount, setDayCount] = useState(0);
  const [result, setResult] = useState<{
    seconds: number;
    finished: boolean;
    isNewBest: boolean;
    dropped: boolean;
  } | null>(null);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const elapsedRef = useRef(0);
  const heightRef = useRef(0.35);
  const velocityRef = useRef(0);
  const touchOnRef = useRef(false);
  const goalRef = useRef(goalSec);
  const startedRef = useRef(false);
  const smoothRmsRef = useRef(0);
  const lastBlowAtRef = useRef(0);

  useEffect(() => {
    const b = getBreathBallBest();
    setBest(b);
    const g = suggestBreathBallGoal(b);
    setGoalSec(g);
    goalRef.current = g;
    setHistory(getBreathBallHistory());
    setDayCount(getBreathBallDayCount());
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

  function breathEnergy(analyser: AnalyserNode) {
    const buf = new Uint8Array(analyser.frequencyBinCount);
    analyser.getByteFrequencyData(buf);
    const start = Math.floor(buf.length * 0.12);
    const end = Math.floor(buf.length * 0.85);
    let sum = 0;
    let n = 0;
    for (let i = start; i < end; i++) {
      sum += buf[i];
      n += 1;
    }
    return n ? sum / n / 255 : 0;
  }

  async function startGame() {
    setError(null);
    setResult(null);
    elapsedRef.current = 0;
    heightRef.current = 0.42;
    velocityRef.current = 0;
    startedRef.current = false;
    smoothRmsRef.current = 0;
    lastBlowAtRef.current = 0;
    setElapsed(0);
    setHeight(0.42);
    setBlowing(false);
    setStarted(false);
    touchOnRef.current = false;

    if (holdMode === "voice") {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: false,
            noiseSuppression: false,
            autoGainControl: true,
            channelCount: 1,
          },
        });
        streamRef.current = stream;
        const ctx = new AudioContext();
        audioCtxRef.current = ctx;
        if (ctx.state === "suspended") await ctx.resume();
        const source = ctx.createMediaStreamSource(stream);
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 2048;
        analyser.smoothingTimeConstant = 0.65;
        source.connect(analyser);
        analyserRef.current = analyser;
      } catch {
        setError("마이크를 쓸 수 없어요. 누르고 유지 모드로 전환합니다.");
        setHoldMode("touch");
      }
    }

    setPhase("running");

    const GRAVITY = -0.00055;
    const LIFT = 0.0028;
    const DRAG = 0.988;
    const FLOOR = 0.02;
    const CEILING = 0.92;
    const GRACE_MS = 700;

    const tick = () => {
      const analyser = analyserRef.current;
      let sustaining = touchOnRef.current;
      let force = 0;
      const now = performance.now();

      if (holdMode === "voice" && analyser) {
        const rms = rmsFromAnalyser(analyser);
        const breath = breathEnergy(analyser);
        smoothRmsRef.current = smoothRmsRef.current * 0.82 + rms * 0.18;
        const smooth = smoothRmsRef.current;
        const rawHit = smooth > 0.008 || breath > 0.045 || rms > 0.01;
        if (rawHit) lastBlowAtRef.current = now;
        sustaining = now - lastBlowAtRef.current < GRACE_MS;
        force = Math.min(1, Math.max(0, (smooth - 0.005) * 18 + breath * 1.4));
      } else if (holdMode === "touch") {
        sustaining = touchOnRef.current;
        force = sustaining ? 0.85 : 0;
        if (sustaining) lastBlowAtRef.current = now;
      }

      setBlowing(sustaining);

      if (!startedRef.current) {
        if (sustaining) {
          startedRef.current = true;
          setStarted(true);
        } else {
          heightRef.current = 0.42 + Math.sin(performance.now() / 450) * 0.02;
          setHeight(heightRef.current);
          rafRef.current = requestAnimationFrame(tick);
          return;
        }
      }

      if (sustaining) {
        velocityRef.current += LIFT * (0.55 + force * 0.7);
        if (heightRef.current > 0.7) velocityRef.current *= 0.92;
        elapsedRef.current += 1 / 60;
        setElapsed(elapsedRef.current);
        if (elapsedRef.current >= goalRef.current) {
          finish(elapsedRef.current, true, false);
          return;
        }
      } else {
        velocityRef.current += GRAVITY;
      }

      velocityRef.current *= DRAG;
      heightRef.current = Math.min(
        CEILING,
        Math.max(FLOOR, heightRef.current + velocityRef.current),
      );

      if (heightRef.current >= CEILING) {
        heightRef.current = CEILING;
        velocityRef.current = Math.min(0, velocityRef.current);
      }

      setHeight(heightRef.current);

      if (heightRef.current <= FLOOR + 0.001 && velocityRef.current <= 0) {
        finish(elapsedRef.current, false, true);
        return;
      }

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
  }

  function finish(seconds: number, finished: boolean, dropped: boolean) {
    stopAll();
    setBlowing(false);
    const saved = saveBreathBallAttempt(seconds, goalRef.current);
    setBest(saved.best);
    const nextGoal = suggestBreathBallGoal(saved.best);
    setGoalSec(nextGoal);
    goalRef.current = nextGoal;
    setHistory(getBreathBallHistory());
    setDayCount(getBreathBallDayCount());
    setResult({
      seconds: Math.floor(seconds * 10) / 10,
      finished,
      isNewBest: saved.isNewBest,
      dropped,
    });
    setPhase("result");
  }

  const pct = Math.min(100, (elapsed / goalSec) * 100);
  const ballBottom = `${8 + height * 72}%`;

  return (
    <div className="flex min-h-dvh flex-col bg-[#F5F6F8]">
      <style>{`
        @keyframes eum-ball-glow {
          0%, 100% { transform: translateX(-50%) scale(1); }
          50% { transform: translateX(-50%) scale(1.04); }
        }
        @keyframes eum-breath-puff {
          0% { opacity: 0.45; transform: translate(-50%, 8px) scale(0.7); }
          100% { opacity: 0; transform: translate(-50%, -28px) scale(1.3); }
        }
        .eum-ball-glow { animation: eum-ball-glow 1.1s ease-in-out infinite; }
        .eum-breath-puff { animation: eum-breath-puff 0.7s ease-out infinite; }
      `}</style>

      <header className="safe-top flex items-center justify-between px-5 pt-4 pb-2">
        <Link
          href="/challenges"
          className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-gray-700 shadow-soft"
          aria-label="뒤로"
        >
          <i className="fa-solid fa-chevron-left text-[14px]" />
        </Link>
        <p className="text-[15px] font-bold text-gray-900">호흡 연습</p>
        <div className="w-10" />
      </header>

      <div className="flex flex-1 flex-col px-5 pb-8 pt-3">
        {/* 진행 카드 */}
        <section className="rounded-[24px] bg-white p-5 shadow-soft">
          <div className="flex items-center justify-between">
            <p className="text-[13px] font-semibold text-gray-400">목표 시간</p>
            <p className="text-[12px] font-medium text-gray-400">{progress.label}</p>
          </div>
          <div className="mt-3 space-y-2">
            {BREATH_BALL_GOALS.map((g) => {
              const selected = goalSec === g;
              return (
                <button
                  key={g}
                  type="button"
                  disabled={phase === "running"}
                  onClick={() => {
                    setGoalSec(g);
                    goalRef.current = g;
                  }}
                  className={`flex w-full items-center gap-3 rounded-[16px] px-4 py-3.5 text-left transition disabled:opacity-60 ${
                    selected ? "bg-brand-50 ring-1 ring-brand-200" : "bg-gray-50"
                  }`}
                >
                  <span
                    className={`flex h-9 w-9 items-center justify-center rounded-full text-[13px] font-extrabold ${
                      selected ? "bg-brand-500 text-white" : "bg-white text-gray-500"
                    }`}
                  >
                    {g}
                  </span>
                  <span className="flex-1 text-[15px] font-bold text-gray-900">{g}초 유지</span>
                  {selected ? (
                    <i className="fa-solid fa-circle-check text-[18px] text-brand-500" />
                  ) : (
                    <span className="h-[18px] w-[18px] rounded-full border border-gray-200" />
                  )}
                </button>
              );
            })}
          </div>
        </section>

        {/* 게임 카드 */}
        <section className="mt-3 overflow-hidden rounded-[24px] bg-white p-4 shadow-soft">
          <div className="mb-3 flex items-center justify-between px-1">
            <p className="text-[12px] font-semibold text-gray-400">
              최고 <span className="text-gray-700">{best || "—"}초</span>
            </p>
            <p className="text-[13px] font-extrabold text-gray-900">
              {elapsed.toFixed(1)}
              <span className="font-semibold text-gray-400"> / {goalSec}초</span>
            </p>
          </div>
          <div className="mb-3 h-1.5 overflow-hidden rounded-full bg-gray-100">
            <div
              className="h-full rounded-full bg-brand-500 transition-[width] duration-100"
              style={{ width: `${pct}%` }}
            />
          </div>

          <div
            className="relative h-[300px] overflow-hidden rounded-[20px]"
            style={{
              background:
                "radial-gradient(ellipse at 50% 0%, #ede9fe 0%, #f5f6f8 45%, #eef2ff 100%)",
            }}
            onPointerDown={() => {
              if (phase === "running" && holdMode === "touch") touchOnRef.current = true;
            }}
            onPointerUp={() => {
              touchOnRef.current = false;
            }}
            onPointerLeave={() => {
              touchOnRef.current = false;
            }}
            onPointerCancel={() => {
              touchOnRef.current = false;
            }}
          >
            <div className="pointer-events-none absolute top-8 left-6 h-8 w-16 rounded-full bg-white/50 blur-[1px]" />
            <div className="pointer-events-none absolute top-16 right-8 h-6 w-12 rounded-full bg-white/40 blur-[1px]" />

            {phase === "running" && blowing ? (
              <>
                <div className="eum-breath-puff absolute bottom-[16%] left-1/2 h-10 w-10 -translate-x-1/2 rounded-full bg-brand-200/40" />
                <div
                  className="eum-breath-puff absolute bottom-[20%] left-[46%] h-7 w-7 rounded-full bg-violet-200/50"
                  style={{ animationDelay: "0.12s" }}
                />
              </>
            ) : null}

            <img
              src="/brand/icons/breath-ball.png"
              alt=""
              className={`pointer-events-none absolute left-1/2 h-[72px] w-[72px] -translate-x-1/2 object-contain transition-[bottom] duration-75 ${
                blowing ? "eum-ball-glow" : ""
              } ${phase === "result" && result?.dropped ? "opacity-70" : ""}`}
              style={{
                bottom: phase === "result" && result?.dropped ? "6%" : ballBottom,
              }}
            />

            <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-white/80 to-transparent" />
            <div className="absolute bottom-5 left-1/2 h-2.5 w-[58%] -translate-x-1/2 rounded-full bg-brand-100/80 shadow-sm" />
            <div className="absolute bottom-4 left-1/2 h-1 w-[48%] -translate-x-1/2 rounded-full bg-brand-200/60" />

            {phase === "ready" ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center">
                <img
                  src="/brand/icons/breath-ball.png"
                  alt=""
                  className="h-16 w-16 object-contain"
                />
                <p className="mt-3 text-[15px] font-extrabold text-gray-900">
                  숨을 내쉬며 공을 띄우세요
                </p>
                <p className="mt-1 text-[12px] leading-relaxed text-gray-400">
                  마이크에 가까이 ‘스~’ 또는 ‘후~’
                </p>
              </div>
            ) : null}

            {phase === "running" && !blowing && !started ? (
              <p className="absolute inset-x-0 bottom-14 text-center text-[13px] font-bold text-brand-600">
                {holdMode === "voice" ? "마이크에 숨을 불어 시작" : "화면을 누른 채 유지"}
              </p>
            ) : null}

            {phase === "running" && blowing ? (
              <p className="absolute inset-x-0 bottom-14 text-center text-[13px] font-bold text-brand-600">
                좋아요, 계속 유지!
              </p>
            ) : null}
          </div>
        </section>

        {error ? (
          <p className="mt-3 text-center text-[12px] font-medium text-rose-500">{error}</p>
        ) : null}

        {/* 모드 선택 */}
        <section className="mt-3 rounded-[24px] bg-white p-4 shadow-soft">
          <p className="mb-2 px-1 text-[13px] font-semibold text-gray-400">조작 방식</p>
          {(
            [
              ["voice", "호흡 감지", "마이크에 숨을 불어 유지"],
              ["touch", "누르고 유지", "화면을 누른 채로 유지"],
            ] as const
          ).map(([id, title, desc]) => {
            const selected = holdMode === id;
            return (
              <button
                key={id}
                type="button"
                disabled={phase === "running"}
                onClick={() => setHoldMode(id)}
                className={`mb-2 flex w-full items-center gap-3 rounded-[16px] px-4 py-3.5 text-left last:mb-0 disabled:opacity-60 ${
                  selected ? "bg-brand-50 ring-1 ring-brand-200" : "bg-gray-50"
                }`}
              >
                <span
                  className={`flex h-9 w-9 items-center justify-center rounded-full ${
                    selected ? "bg-brand-500 text-white" : "bg-white text-gray-400"
                  }`}
                >
                  <i
                    className={`fa-solid ${id === "voice" ? "fa-microphone" : "fa-hand-pointer"} text-[13px]`}
                  />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[15px] font-bold text-gray-900">{title}</span>
                  <span className="block text-[12px] text-gray-400">{desc}</span>
                </span>
                {selected ? (
                  <i className="fa-solid fa-circle-check text-[18px] text-blue-500" />
                ) : (
                  <span className="h-[18px] w-[18px] rounded-full border border-gray-200" />
                )}
              </button>
            );
          })}
        </section>

        {phase === "result" && result ? (
          <section className="mt-3 rounded-[24px] bg-white p-5 text-center shadow-soft">
            <p className="text-[32px] font-extrabold tracking-tight text-gray-900">
              {result.seconds}
              <span className="ml-1 text-[15px] font-bold text-gray-400">초</span>
            </p>
            <p className="mt-1 text-[14px] font-bold text-gray-800">
              {result.finished
                ? "목표 달성! 공이 끝까지 버텼어요"
                : result.dropped
                  ? "공이 떨어졌어요. 호흡을 더 이어가 보세요"
                  : "여기까지 잘했어요"}
            </p>
            {result.isNewBest ? (
              <p className="mt-1 text-[12px] font-bold text-blue-500">개인 최고 기록!</p>
            ) : null}
            <Link
              href={progress.ctaHref}
              className="mt-5 flex h-14 w-full items-center justify-center rounded-full bg-brand-500 text-[16px] font-bold text-white transition active:opacity-90"
            >
              {progress.ctaLabel}
            </Link>
          </section>
        ) : null}

        <div className="mt-4 flex items-center justify-between px-1 text-[12px] text-gray-400">
          <span>연습일 {dayCount}일</span>
          <span>최근 {history[0]?.seconds ?? "—"}초</span>
        </div>

        {phase === "ready" || phase === "result" ? (
          <button
            type="button"
            onClick={() => void startGame()}
            className="mt-4 flex h-14 w-full items-center justify-center rounded-full bg-brand-500 text-[16px] font-bold text-white transition active:opacity-90"
          >
            {phase === "result" ? "다시 도전" : "시작하기"}
          </button>
        ) : (
          <button
            type="button"
            onClick={() => finish(elapsedRef.current, false, false)}
            className="mt-4 flex h-14 w-full items-center justify-center rounded-full bg-white text-[16px] font-bold text-gray-700 shadow-soft transition active:opacity-90"
          >
            그만하기
          </button>
        )}
      </div>
    </div>
  );
}
