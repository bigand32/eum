"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { usePitchDetection } from "@/hooks/usePitchDetection";
import {
  buildDoremiStairs,
  DOREMI_HOLD_SEC,
  DOREMI_LIVES,
  DOREMI_PASS_CENTS,
  DOREMI_SCALE,
  DOREMI_STAIR_COUNT,
  DOREMI_STEP_TIMEOUT,
  getDoremiBest,
  getDoremiDayCount,
  nearestDoremiLane,
  saveDoremiResult,
  type DoremiRunResult,
  type DoremiStair,
} from "@/lib/doremi-challenge";
import { centsBetween, frequencyToMidi } from "@/lib/pitch/pitchUtils";
import { MUNGCHI } from "@/lib/mungchi";

type Phase = "intro" | "playing" | "result";

const STEP_H = 58;

export function DoremiChallengeView() {
  const [phase, setPhase] = useState<Phase>("intro");
  const [stairs, setStairs] = useState<DoremiStair[]>([]);
  const [stepIdx, setStepIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);
  const [lives, setLives] = useState(DOREMI_LIVES);
  const [holdPct, setHoldPct] = useState(0);
  const [timeLeft, setTimeLeft] = useState(DOREMI_STEP_TIMEOUT);
  const [flash, setFlash] = useState<"ok" | "miss" | null>(null);
  const [jumping, setJumping] = useState(false);
  const [best, setBest] = useState(0);
  const [dayCount, setDayCount] = useState(0);
  const [result, setResult] = useState<DoremiRunResult | null>(null);
  const [starting, setStarting] = useState(false);

  const holdAccRef = useRef(0);
  const stepStartRef = useRef(0);
  const passedRef = useRef(0);
  const missedRef = useRef(0);
  const comboRef = useRef(0);
  const maxComboRef = useRef(0);
  const scoreRef = useRef(0);
  const livesRef = useRef(DOREMI_LIVES);
  const stepIdxRef = useRef(0);
  const stairsRef = useRef<DoremiStair[]>([]);
  const finishedRef = useRef(false);
  const climbingRef = useRef(false);
  const rafRef = useRef<number | null>(null);
  const lastTsRef = useRef(0);
  const hzRef = useRef<number | null>(null);

  const { frame, listening, error, start, stop } = usePitchDetection({
    enabled: phase === "playing",
    clarityThreshold: 0.78,
    rmsThreshold: 0.01,
  });

  useEffect(() => {
    setBest(getDoremiBest());
    setDayCount(getDoremiDayCount());
    return () => stop();
  }, [stop]);

  useEffect(() => {
    hzRef.current = frame.hz;
  }, [frame.hz]);

  const finishRun = (_cleared: boolean) => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    stop();
    const run: DoremiRunResult = {
      score: scoreRef.current,
      combo: comboRef.current,
      maxCombo: maxComboRef.current,
      passed: passedRef.current,
      missed: missedRef.current,
      total: stairsRef.current.length,
      height: passedRef.current,
    };
    const saved = saveDoremiResult(run);
    setBest(saved.best);
    setDayCount(getDoremiDayCount());
    setResult(run);
    setPhase("result");
  };

  const onMiss = () => {
    if (climbingRef.current || finishedRef.current) return;
    missedRef.current += 1;
    comboRef.current = 0;
    livesRef.current -= 1;
    holdAccRef.current = 0;
    stepStartRef.current = performance.now();
    setCombo(0);
    setHoldPct(0);
    setLives(livesRef.current);
    setFlash("miss");
    window.setTimeout(() => setFlash(null), 400);
    if (livesRef.current <= 0) {
      finishRun(false);
      return;
    }
    setTimeLeft(DOREMI_STEP_TIMEOUT);
  };

  const onClimb = () => {
    if (climbingRef.current || finishedRef.current) return;
    climbingRef.current = true;
    passedRef.current += 1;
    comboRef.current += 1;
    maxComboRef.current = Math.max(maxComboRef.current, comboRef.current);
    scoreRef.current += 100 + Math.min(80, comboRef.current * 12);
    holdAccRef.current = 0;
    setScore(scoreRef.current);
    setCombo(comboRef.current);
    setMaxCombo(maxComboRef.current);
    setHoldPct(0);
    setFlash("ok");
    setJumping(true);
    window.setTimeout(() => setFlash(null), 350);

    const next = stepIdxRef.current + 1;
    window.setTimeout(() => {
      setJumping(false);
      climbingRef.current = false;
      if (next >= stairsRef.current.length) {
        finishRun(true);
        return;
      }
      stepIdxRef.current = next;
      setStepIdx(next);
      stepStartRef.current = performance.now();
      setTimeLeft(DOREMI_STEP_TIMEOUT);
    }, 320);
  };

  const begin = async () => {
    setStarting(true);
    finishedRef.current = false;
    climbingRef.current = false;
    scoreRef.current = 0;
    comboRef.current = 0;
    maxComboRef.current = 0;
    passedRef.current = 0;
    missedRef.current = 0;
    livesRef.current = DOREMI_LIVES;
    stepIdxRef.current = 0;
    holdAccRef.current = 0;
    setScore(0);
    setCombo(0);
    setMaxCombo(0);
    setLives(DOREMI_LIVES);
    setHoldPct(0);
    setStepIdx(0);
    setFlash(null);
    setJumping(false);
    setResult(null);
    const nextStairs = buildDoremiStairs(DOREMI_STAIR_COUNT);
    stairsRef.current = nextStairs;
    setStairs(nextStairs);
    setPhase("playing");
    try {
      await start();
      stepStartRef.current = performance.now();
      lastTsRef.current = 0;
      setTimeLeft(DOREMI_STEP_TIMEOUT);

      const loop = (ts: number) => {
        if (finishedRef.current) return;
        if (!lastTsRef.current) lastTsRef.current = ts;
        const dt = Math.min(0.05, (ts - lastTsRef.current) / 1000);
        lastTsRef.current = ts;

        if (!climbingRef.current) {
          const elapsed = (ts - stepStartRef.current) / 1000;
          const left = Math.max(0, DOREMI_STEP_TIMEOUT - elapsed);
          setTimeLeft(left);
          if (left <= 0) {
            onMiss();
            lastTsRef.current = ts;
            rafRef.current = requestAnimationFrame(loop);
            return;
          }

          const stair = stairsRef.current[stepIdxRef.current];
          const hz = hzRef.current;
          let onPitch = false;
          if (stair && hz != null) {
            const target = DOREMI_SCALE[stair.lane]!;
            const cents = Math.abs(centsBetween(hz, target.frequency));
            const near = nearestDoremiLane(frequencyToMidi(hz));
            onPitch = cents <= DOREMI_PASS_CENTS || near === stair.lane;
          }

          if (onPitch) {
            holdAccRef.current += dt;
            setHoldPct(Math.min(100, (holdAccRef.current / DOREMI_HOLD_SEC) * 100));
            if (holdAccRef.current >= DOREMI_HOLD_SEC) {
              onClimb();
            }
          } else {
            holdAccRef.current = Math.max(0, holdAccRef.current - dt * 1.6);
            setHoldPct(Math.min(100, (holdAccRef.current / DOREMI_HOLD_SEC) * 100));
          }
        }

        rafRef.current = requestAnimationFrame(loop);
      };
      rafRef.current = requestAnimationFrame(loop);
    } catch {
      setPhase("intro");
    } finally {
      setStarting(false);
    }
  };

  useEffect(
    () => () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    },
    [],
  );

  const current = stairs[stepIdx];
  const targetNote = current ? DOREMI_SCALE[current.lane] : null;
  const liveSolfege =
    frame.hz != null ? DOREMI_SCALE[nearestDoremiLane(frequencyToMidi(frame.hz))]?.solfege : "—";

  // 카메라: 현재 계단이 화면 아래쪽에 오도록
  const cameraY = stepIdx * STEP_H;

  const sideLeft = (side: -1 | 0 | 1) => {
    if (side === -1) return "18%";
    if (side === 1) return "62%";
    return "40%";
  };

  return (
    <div className="flex min-h-dvh flex-col bg-[#E8F4EE]">
      <header className="safe-top flex items-center justify-between px-4 py-3">
        <Link
          href="/challenges"
          className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-gray-800 shadow-sm"
          aria-label="뒤로"
        >
          <i className="fa-solid fa-chevron-left text-[14px]" />
        </Link>
        <h1 className="text-[15px] font-bold text-gray-800">도레미 계단</h1>
        <span className="w-9" />
      </header>

      {phase === "intro" ? (
        <main className="flex flex-1 flex-col px-5 pb-10">
          <section className="relative mt-2 overflow-hidden rounded-[28px] bg-gradient-to-br from-emerald-400 to-teal-500 p-6 text-white">
            <p className="text-[12px] font-bold text-white/85">음정 · 계단 오르기</p>
            <h2 className="mt-1 text-[24px] font-extrabold leading-snug">
              맞는 음을 부르면
              <br />
              한 칸씩 올라가요
            </h2>
            <p className="mt-3 max-w-[230px] text-[13px] text-white/90">
              다음 계단에 적힌 도·레·미를 짧게 유지하면 뭉치가 점프해요
            </p>
            <img
              src={MUNGCHI.sing}
              alt=""
              className="pointer-events-none absolute right-0 bottom-0 h-28 w-28 object-contain"
            />
          </section>

          <section className="mt-4 rounded-[24px] bg-white px-5 py-4 shadow-sm">
            <div className="flex justify-between text-[13px] font-bold">
              <span className="text-gray-400">최고 점수</span>
              <span className="text-emerald-600">{best.toLocaleString("ko-KR")}</span>
            </div>
            <div className="mt-2 flex justify-between text-[13px] font-bold">
              <span className="text-gray-400">연습일</span>
              <span className="text-teal-600">{dayCount}일</span>
            </div>
          </section>

          <ul className="mt-5 space-y-2 text-[13px] text-gray-600">
            <li>· 다음 계단 글자를 보고 그 음을 불러 주세요</li>
            <li>· 약 0.5초만 맞추면 올라가요</li>
            <li>· 목숨 {DOREMI_LIVES}개 · 계단 {DOREMI_STAIR_COUNT}칸</li>
          </ul>

          {error ? <p className="mt-4 text-[12px] font-medium text-rose-500">{error}</p> : null}

          <button
            type="button"
            disabled={starting}
            onClick={() => void begin()}
            className="mt-auto flex h-14 w-full items-center justify-center rounded-full bg-emerald-500 text-[16px] font-extrabold text-white disabled:opacity-60"
          >
            {starting ? "마이크 준비 중…" : "계단 오르기"}
          </button>
        </main>
      ) : null}

      {phase === "playing" ? (
        <main className="relative flex flex-1 flex-col overflow-hidden px-3 pb-5">
          <div className="mb-2 flex items-center justify-between px-2 text-[13px] font-bold">
            <span className="text-emerald-700">{score}점</span>
            <span className="text-gray-500">
              {listening ? `지금 ${liveSolfege}` : "소리 기다리는 중"}
            </span>
            <span className="text-amber-600">
              {"♥".repeat(Math.max(0, lives))}
              <span className="text-gray-300">{"♡".repeat(Math.max(0, DOREMI_LIVES - lives))}</span>
            </span>
          </div>

          {/* 목표음 카드 */}
          <div className="mx-2 mb-3 flex items-center gap-3 rounded-[20px] bg-white px-4 py-3 shadow-sm">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-[26px] font-extrabold text-emerald-600">
              {targetNote?.solfege.replace("↑", "") ?? "—"}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[12px] font-bold text-gray-400">
                {stepIdx + 1} / {stairs.length}칸 · 콤보 {combo}
              </p>
              <p className="text-[15px] font-extrabold text-gray-900">
                “{targetNote?.solfege ?? "—"}” 를 불러 주세요
              </p>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-gray-100">
                <div
                  className="h-full rounded-full bg-emerald-400 transition-[width] duration-75"
                  style={{ width: `${holdPct}%` }}
                />
              </div>
            </div>
            <div className="text-right">
              <p className="text-[11px] font-bold text-gray-400">남은 시간</p>
              <p
                className={`text-[20px] font-extrabold tabular-nums ${
                  timeLeft < 1.5 ? "text-rose-500" : "text-gray-800"
                }`}
              >
                {timeLeft.toFixed(1)}
              </p>
            </div>
          </div>

          {/* 계단 월드 */}
          <div className="relative min-h-0 flex-1 overflow-hidden rounded-[28px] bg-gradient-to-b from-[#B8E0D2] to-[#7EB8A8]">
            <div
              className="absolute inset-x-0 bottom-8 transition-transform duration-300 ease-out"
              style={{ transform: `translateY(${cameraY}px)` }}
            >
              {/* 지나간 + 현재 + 앞 몇 칸 */}
              {stairs.map((stair, i) => {
                if (i < stepIdx - 1 || i > stepIdx + 5) return null;
                const note = DOREMI_SCALE[stair.lane]!;
                const isCurrent = i === stepIdx;
                const isDone = i < stepIdx;
                const bottom = i * STEP_H;
                return (
                  <div
                    key={stair.id}
                    className="absolute"
                    style={{
                      left: sideLeft(stair.side),
                      bottom: `${bottom}px`,
                      width: "34%",
                    }}
                  >
                    <div
                      className={`flex h-11 items-center justify-center rounded-2xl border-b-4 text-[18px] font-extrabold shadow-md ${
                        isDone
                          ? "border-emerald-700/40 bg-emerald-300/80 text-emerald-900"
                          : isCurrent
                            ? "border-amber-600 bg-amber-300 text-amber-950 ring-4 ring-white/70"
                            : "border-stone-500/40 bg-[#E8D5B5] text-stone-700"
                      }`}
                    >
                      {note.solfege.replace("↑", "")}
                    </div>
                  </div>
                );
              })}

              {/* 뭉치 — 현재 계단 위 */}
              {current ? (
                <div
                  className={`absolute z-10 transition-all duration-300 ${
                    jumping ? "-translate-y-8 scale-110" : ""
                  }`}
                  style={{
                    left: sideLeft(current.side),
                    bottom: `${stepIdx * STEP_H + 40}px`,
                    width: "34%",
                  }}
                >
                  <img
                    src={
                      flash === "miss"
                        ? MUNGCHI.breath
                        : flash === "ok"
                          ? MUNGCHI.win
                          : MUNGCHI.sing
                    }
                    alt=""
                    className="mx-auto h-[76px] w-[76px] object-contain drop-shadow-lg"
                  />
                </div>
              ) : null}

              {/* 바닥 */}
              <div
                className="absolute left-[10%] h-3 w-[80%] rounded-full bg-emerald-800/25"
                style={{ bottom: "-8px" }}
              />
            </div>

            {flash ? (
              <p
                className={`absolute top-4 left-1/2 -translate-x-1/2 rounded-full px-4 py-1.5 text-[15px] font-extrabold shadow ${
                  flash === "ok"
                    ? "bg-emerald-500 text-white"
                    : "bg-rose-500 text-white"
                }`}
              >
                {flash === "ok" ? "올라가요!" : "아쉬워요"}
              </p>
            ) : null}
          </div>

          <button
            type="button"
            onClick={() => finishRun(false)}
            className="mt-3 text-[13px] font-bold text-gray-400"
          >
            그만하기
          </button>
        </main>
      ) : null}

      {phase === "result" && result ? (
        <main className="flex flex-1 flex-col px-5 pb-10">
          <div className="mt-6 rounded-[28px] bg-white px-6 py-8 text-center shadow-sm">
            <img
              src={
                result.passed >= result.total
                  ? MUNGCHI.best
                  : result.passed >= 5
                    ? MUNGCHI.win
                    : MUNGCHI.sing
              }
              alt=""
              className="mx-auto h-24 w-24 object-contain"
            />
            <p className="mt-3 text-[13px] font-bold text-emerald-600">
              {result.passed >= result.total ? "정상 도착!" : "여기까지 올라왔어요"}
            </p>
            <p className="mt-1 text-[44px] font-extrabold tracking-tight text-gray-900">
              {result.height}
              <span className="ml-1 text-[16px] font-bold text-gray-400">칸</span>
            </p>
            <p className="mt-1 text-[14px] font-bold text-gray-500">{result.score}점</p>
            <div className="mt-5 grid grid-cols-3 gap-2 text-[13px]">
              <Stat label="통과" value={`${result.passed}`} />
              <Stat label="미스" value={`${result.missed}`} />
              <Stat label="콤보" value={`${result.maxCombo}`} />
            </div>
            <button
              type="button"
              onClick={() => void begin()}
              className="mt-6 flex h-12 w-full items-center justify-center rounded-full bg-emerald-500 text-[15px] font-bold text-white"
            >
              다시 오르기
            </button>
            <Link href="/challenges" className="mt-3 block text-[13px] font-bold text-brand-500">
              챌린지 목록으로
            </Link>
          </div>
        </main>
      ) : null}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-gray-50 px-2 py-3">
      <p className="text-[11px] font-bold text-gray-400">{label}</p>
      <p className="mt-0.5 text-[18px] font-extrabold text-gray-900">{value}</p>
    </div>
  );
}
