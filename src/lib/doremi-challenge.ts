/** 도레미 계단 오르기 — 음정 맞춰 한 칸씩 올라가기 */

import { midiToFrequency } from "@/lib/pitch/pitchUtils";

export type DoremiNote = {
  solfege: string;
  note: string;
  midi: number;
  frequency: number;
};

/** C4~C5 장음계 (도레미파솔라시도) */
export const DOREMI_SCALE: DoremiNote[] = [
  { solfege: "도", note: "C4", midi: 60, frequency: midiToFrequency(60) },
  { solfege: "레", note: "D4", midi: 62, frequency: midiToFrequency(62) },
  { solfege: "미", note: "E4", midi: 64, frequency: midiToFrequency(64) },
  { solfege: "파", note: "F4", midi: 65, frequency: midiToFrequency(65) },
  { solfege: "솔", note: "G4", midi: 67, frequency: midiToFrequency(67) },
  { solfege: "라", note: "A4", midi: 69, frequency: midiToFrequency(69) },
  { solfege: "시", note: "B4", midi: 71, frequency: midiToFrequency(71) },
  { solfege: "도↑", note: "C5", midi: 72, frequency: midiToFrequency(72) },
];

export const DOREMI_DAY_TARGET = 5;
export const DOREMI_PASS_CENTS = 60;
/** 목표음 유지해야 오르는 시간(초) */
export const DOREMI_HOLD_SEC = 0.45;
/** 한 계단 제한 시간(초) */
export const DOREMI_STEP_TIMEOUT = 5;
export const DOREMI_LIVES = 3;
export const DOREMI_STAIR_COUNT = 15;

export type DoremiStair = {
  id: string;
  /** 음계 인덱스 */
  lane: number;
  /** 지그재그 위치: -1 왼쪽 · 0 가운데 · 1 오른쪽 */
  side: -1 | 0 | 1;
};

export type DoremiRunResult = {
  score: number;
  combo: number;
  maxCombo: number;
  passed: number;
  missed: number;
  total: number;
  height: number;
};

const BEST_KEY = "eum-doremi-best";
const DAYS_KEY = "eum-doremi-days";
const HISTORY_KEY = "eum-doremi-history";

function todayKey(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function nearestDoremiLane(midi: number) {
  let best = 0;
  let bestDist = Infinity;
  DOREMI_SCALE.forEach((n, i) => {
    const d = Math.abs(n.midi - midi);
    if (d < bestDist) {
      bestDist = d;
      best = i;
    }
  });
  return best;
}

/** 초보 친화 계단: 낮은 음부터, 급격한 도약 최소화, 좌우 지그재그 */
export function buildDoremiStairs(count = DOREMI_STAIR_COUNT): DoremiStair[] {
  const easy = [0, 1, 2, 3, 4];
  const stairs: DoremiStair[] = [];
  let prev = 0;
  let side: -1 | 0 | 1 = 0;

  for (let i = 0; i < count; i++) {
    const pool = i < 4 ? [0, 1, 2] : i < 9 ? easy : [...easy, 5, 6, 7];
    let lane = pool[Math.floor(Math.random() * pool.length)]!;
    if (Math.abs(lane - prev) > 2) {
      lane = prev + (lane > prev ? 1 : -1);
      lane = Math.max(0, Math.min(DOREMI_SCALE.length - 1, lane));
    }
    // 지그재그
    if (i === 0) side = 0;
    else if (side === 0) side = Math.random() > 0.5 ? 1 : -1;
    else side = side === 1 ? -1 : 1;

    prev = lane;
    stairs.push({
      id: `s_${i}_${lane}`,
      lane,
      side,
    });
  }
  return stairs;
}

export function getDoremiBest(): number {
  if (typeof window === "undefined") return 0;
  return Number(window.localStorage.getItem(BEST_KEY) || 0);
}

export function getDoremiDayCount(): number {
  if (typeof window === "undefined") return 0;
  try {
    return (JSON.parse(window.localStorage.getItem(DAYS_KEY) || "[]") as string[]).length;
  } catch {
    return 0;
  }
}

export function saveDoremiResult(result: DoremiRunResult) {
  if (typeof window === "undefined") {
    return { best: result.score, isNewBest: true };
  }
  const prevBest = getDoremiBest();
  const isNewBest = result.score > prevBest;
  if (isNewBest) {
    window.localStorage.setItem(BEST_KEY, String(result.score));
  }

  try {
    const history = JSON.parse(window.localStorage.getItem(HISTORY_KEY) || "[]") as unknown[];
    history.unshift({ ...result, createdAt: new Date().toISOString() });
    window.localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(0, 30)));
  } catch {
    /* ignore */
  }

  if (result.passed >= 3) {
    const days = new Set(
      JSON.parse(window.localStorage.getItem(DAYS_KEY) || "[]") as string[],
    );
    days.add(todayKey());
    window.localStorage.setItem(DAYS_KEY, JSON.stringify([...days]));
  }

  return { best: Math.max(prevBest, result.score), isNewBest };
}
