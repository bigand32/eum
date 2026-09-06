/** 고음 피치 챌린지 — 로컬 캐시 + Supabase 세션 저장 */

import { isSupabaseConfigured } from "@/lib/supabase/config";

export type HighNoteSessionResult = {
  id: string;
  dateKey: string;
  createdAt: string;
  targetNote: string;
  accuracyPct: number;
  avgCentsAbs: number;
  maxHoldSec: number;
  vibratoStability: number;
  onPitchRatio: number;
};

const RESULTS_KEY = "eum-high-note-pitch-results";
const DAYS_KEY = "eum-high-note-pitch-days";

export function todayKey(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function readLocalResults(): HighNoteSessionResult[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(window.localStorage.getItem(RESULTS_KEY) || "[]") as HighNoteSessionResult[];
  } catch {
    return [];
  }
}

function writeLocalResults(results: HighNoteSessionResult[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(RESULTS_KEY, JSON.stringify(results.slice(0, 60)));
  const days = [...new Set(results.map((r) => r.dateKey))].sort();
  window.localStorage.setItem(DAYS_KEY, JSON.stringify(days));
}

function upsertLocal(result: HighNoteSessionResult) {
  const prev = readLocalResults().filter((r) => r.id !== result.id);
  writeLocalResults([result, ...prev]);
}

export function loadHighNoteResults(): HighNoteSessionResult[] {
  return readLocalResults();
}

export function getHighNotePracticeDayCount() {
  if (typeof window === "undefined") return 0;
  try {
    return (JSON.parse(window.localStorage.getItem(DAYS_KEY) || "[]") as string[]).length;
  } catch {
    return 0;
  }
}

export function getHighNoteStreak(now = new Date()) {
  if (typeof window === "undefined") return 0;
  let days: string[] = [];
  try {
    days = JSON.parse(window.localStorage.getItem(DAYS_KEY) || "[]") as string[];
  } catch {
    return 0;
  }
  const set = new Set(days);
  let streak = 0;
  const cursor = new Date(now);
  cursor.setHours(0, 0, 0, 0);
  if (!set.has(todayKey(cursor))) {
    cursor.setDate(cursor.getDate() - 1);
  }
  while (set.has(todayKey(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

type SessionPartial = Omit<HighNoteSessionResult, "id" | "dateKey" | "createdAt">;

/** 로컬 즉시 저장 (오프라인/데모) */
export function saveHighNoteResultLocal(partial: SessionPartial): HighNoteSessionResult {
  const result: HighNoteSessionResult = {
    ...partial,
    id: `hn_${Date.now()}`,
    dateKey: todayKey(),
    createdAt: new Date().toISOString(),
  };
  upsertLocal(result);
  return result;
}

type DbRow = {
  id: string;
  date_key: string;
  created_at: string;
  target_note: string;
  accuracy_pct: number;
  avg_cents_abs: number | string;
  max_hold_sec: number | string;
  vibrato_stability: number | string;
  on_pitch_ratio: number | string;
};

function mapRow(row: DbRow): HighNoteSessionResult {
  return {
    id: row.id,
    dateKey: String(row.date_key).slice(0, 10),
    createdAt: row.created_at,
    targetNote: row.target_note,
    accuracyPct: Number(row.accuracy_pct),
    avgCentsAbs: Number(row.avg_cents_abs),
    maxHoldSec: Number(row.max_hold_sec),
    vibratoStability: Number(row.vibrato_stability),
    onPitchRatio: Number(row.on_pitch_ratio),
  };
}

/** Supabase에서 불러와 로컬 캐시 갱신 */
export async function syncHighNoteResultsFromSupabase(studentId: string) {
  if (!studentId || !isSupabaseConfigured()) {
    return readLocalResults();
  }
  try {
    const { createClient } = await import("@/lib/supabase/client");
    const supabase = createClient();
    const { data, error } = await supabase
      .from("high_note_pitch_sessions")
      .select("*")
      .eq("student_id", studentId)
      .order("created_at", { ascending: false })
      .limit(60);
    if (error) throw error;
    const remote = (data as DbRow[] | null)?.map(mapRow) ?? [];
    if (remote.length > 0) {
      writeLocalResults(remote);
      return remote;
    }
    return readLocalResults();
  } catch (err) {
    console.warn("[high-note] sync failed, using local cache", err);
    return readLocalResults();
  }
}

/** 로컬 + Supabase에 세션 저장 */
export async function saveHighNoteResult(
  partial: SessionPartial,
  studentId?: string,
): Promise<HighNoteSessionResult> {
  const local = saveHighNoteResultLocal(partial);

  if (!studentId || !isSupabaseConfigured()) {
    return local;
  }

  try {
    const { createClient } = await import("@/lib/supabase/client");
    const supabase = createClient();
    const { data, error } = await supabase
      .from("high_note_pitch_sessions")
      .insert({
        student_id: studentId,
        date_key: local.dateKey,
        target_note: local.targetNote,
        accuracy_pct: local.accuracyPct,
        avg_cents_abs: local.avgCentsAbs,
        max_hold_sec: local.maxHoldSec,
        vibrato_stability: local.vibratoStability,
        on_pitch_ratio: local.onPitchRatio,
      })
      .select("*")
      .single();

    if (error || !data) throw error ?? new Error("HIGH_NOTE_SAVE_FAILED");

    const remote = mapRow(data as DbRow);
    // 로컬 id를 서버 id로 교체
    const others = readLocalResults().filter((r) => r.id !== local.id && r.id !== remote.id);
    writeLocalResults([remote, ...others]);
    return remote;
  } catch (err) {
    console.warn("[high-note] supabase save failed, kept local", err);
    return local;
  }
}

export { saveHighNoteResultLocal as saveHighNoteResultSync };
