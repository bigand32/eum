/** 롱톤·호흡 유지력 — 로컬 기록 */

export type LongToneRecord = {
  id: string;
  seconds: number;
  createdAt: string;
  goalSec: number;
  finished: boolean;
};

const BEST_KEY = "eum-long-tone-best";
const HISTORY_KEY = "eum-long-tone-history";
const DAYS_KEY = "eum-long-tone-days";

function todayKey(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function getLongToneBest(): number {
  if (typeof window === "undefined") return 0;
  return Number(window.localStorage.getItem(BEST_KEY) || 0);
}

export function getLongToneHistory(): LongToneRecord[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(window.localStorage.getItem(HISTORY_KEY) || "[]") as LongToneRecord[];
  } catch {
    return [];
  }
}

export function getLongToneDayCount(): number {
  if (typeof window === "undefined") return 0;
  try {
    const days = JSON.parse(window.localStorage.getItem(DAYS_KEY) || "[]") as string[];
    return days.length;
  } catch {
    return 0;
  }
}

export function saveLongToneAttempt(seconds: number, goalSec: number) {
  if (typeof window === "undefined") return { best: seconds, isNewBest: true };
  const finished = seconds >= goalSec;
  const prevBest = getLongToneBest();
  const isNewBest = seconds > prevBest;
  if (isNewBest) {
    window.localStorage.setItem(BEST_KEY, String(Math.floor(seconds)));
  }

  const record: LongToneRecord = {
    id: `lt_${Date.now()}`,
    seconds: Math.floor(seconds * 10) / 10,
    createdAt: new Date().toISOString(),
    goalSec,
    finished,
  };
  const history = [record, ...getLongToneHistory()].slice(0, 40);
  window.localStorage.setItem(HISTORY_KEY, JSON.stringify(history));

  if (seconds >= 5) {
    const days = new Set(
      JSON.parse(window.localStorage.getItem(DAYS_KEY) || "[]") as string[],
    );
    days.add(todayKey());
    window.localStorage.setItem(DAYS_KEY, JSON.stringify([...days]));
  }

  return { best: Math.max(prevBest, Math.floor(seconds)), isNewBest, record };
}

/** 개인 최고에 맞춰 다음 목표 초 */
export function suggestLongToneGoal(best: number) {
  if (best < 10) return 10;
  if (best < 15) return 15;
  if (best < 20) return 20;
  if (best < 30) return 30;
  return Math.min(60, Math.ceil((best + 5) / 5) * 5);
}

export const LONG_TONE_DAY_TARGET = 7;
