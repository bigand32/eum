/** 호흡 공 띄우기 — 로컬 기록 */

export type BreathBallRecord = {
  id: string;
  seconds: number;
  goalSec: number;
  finished: boolean;
  createdAt: string;
};

const BEST_KEY = "eum-breath-ball-best";
const HISTORY_KEY = "eum-breath-ball-history";
const DAYS_KEY = "eum-breath-ball-days";

function todayKey(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function getBreathBallBest(): number {
  if (typeof window === "undefined") return 0;
  return Number(window.localStorage.getItem(BEST_KEY) || 0);
}

export function getBreathBallHistory(): BreathBallRecord[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(window.localStorage.getItem(HISTORY_KEY) || "[]") as BreathBallRecord[];
  } catch {
    return [];
  }
}

export function getBreathBallDayCount(): number {
  if (typeof window === "undefined") return 0;
  try {
    return (JSON.parse(window.localStorage.getItem(DAYS_KEY) || "[]") as string[]).length;
  } catch {
    return 0;
  }
}

export function saveBreathBallAttempt(seconds: number, goalSec: number) {
  if (typeof window === "undefined") {
    return { best: seconds, isNewBest: true };
  }
  const finished = seconds >= goalSec;
  const prevBest = getBreathBallBest();
  const isNewBest = seconds > prevBest;
  if (isNewBest) {
    window.localStorage.setItem(BEST_KEY, String(Math.floor(seconds * 10) / 10));
  }

  const record: BreathBallRecord = {
    id: `bb_${Date.now()}`,
    seconds: Math.floor(seconds * 10) / 10,
    goalSec,
    finished,
    createdAt: new Date().toISOString(),
  };
  const history = [record, ...getBreathBallHistory()].slice(0, 40);
  window.localStorage.setItem(HISTORY_KEY, JSON.stringify(history));

  if (seconds >= 8) {
    const days = new Set(
      JSON.parse(window.localStorage.getItem(DAYS_KEY) || "[]") as string[],
    );
    days.add(todayKey());
    window.localStorage.setItem(DAYS_KEY, JSON.stringify([...days]));
  }

  return {
    best: Math.max(prevBest, Math.floor(seconds * 10) / 10),
    isNewBest,
    record,
  };
}

/** 20 → 30 → 40초 단계 */
export function suggestBreathBallGoal(best: number) {
  if (best < 20) return 20;
  if (best < 30) return 30;
  if (best < 40) return 40;
  return Math.min(60, Math.ceil((best + 5) / 5) * 5);
}

export const BREATH_BALL_GOALS = [20, 30, 40] as const;
