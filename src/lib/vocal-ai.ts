/** AI 보컬 분석 — 목업 점수 + Supabase 히스토리/Pro (로컬 캐시 병행) */

import { isSupabaseConfigured } from "@/lib/supabase/config";

export type VocalAiTier = "free" | "pro";

export type VocalAiScores = {
  overall: number;
  pitch: number;
  rhythm: number;
  range: number;
  vibrato: number;
  breath: number;
  diction: number;
};

export type VocalAiReport = {
  id: string;
  createdAt: string;
  title: string;
  durationSec: number;
  scores: VocalAiScores;
  rangeLabel: string;
  summary: string;
  strengths: string[];
  improvements: string[];
  /** Pro 전용 디테일 */
  proTips: string[];
};

export const VOCAL_AI_PRO_PRICE_LABEL = "월 9,900원";

export const VOCAL_AI_FEATURES = {
  free: [
    "종합 점수",
    "음정 · 박자 · 음역대 기본 분석",
    "한 줄 요약 리포트",
  ],
  pro: [
    "바이브레이토 · 호흡 · 발음 정밀 분석",
    "구간별 코멘트",
    "히스토리 트래킹 · 성장 그래프",
    "고급 리포트 무제한",
  ],
} as const;

function clampScore(n: number) {
  return Math.max(55, Math.min(96, Math.round(n)));
}

/** 실제 모델 연동 전: 녹음 메타로 자연스러운 점수 생성 */
export function generateMockVocalReport(input: {
  title?: string;
  durationSec: number;
  seed?: number;
}): VocalAiReport {
  const seed = input.seed ?? Date.now() % 1000;
  const wobble = (base: number, spread: number) =>
    clampScore(base + ((seed * 17 + spread * 13) % (spread * 2)) - spread);

  const pitch = wobble(78, 12);
  const rhythm = wobble(74, 14);
  const range = wobble(70, 15);
  const vibrato = wobble(66, 16);
  const breath = wobble(72, 13);
  const diction = wobble(76, 12);
  const overall = clampScore(
    pitch * 0.28 + rhythm * 0.22 + range * 0.15 + vibrato * 0.1 + breath * 0.15 + diction * 0.1,
  );

  const rangeLabel =
    range >= 85 ? "넓은 편 (약 1.5옥타브+)" : range >= 70 ? "평균 (약 1~1.3옥타브)" : "좁은 편 — 스트레칭 추천";

  const strengths: string[] = [];
  const improvements: string[] = [];
  if (pitch >= 80) strengths.push("음정 중심이 비교적 안정적이에요");
  else improvements.push("스케일 연습으로 음정 중심을 잡아보세요");
  if (rhythm >= 78) strengths.push("박자 감각이 좋아요");
  else improvements.push("메트로놈 60~80에 맞춰 한 소절만 반복해 보세요");
  if (breath >= 75) strengths.push("호흡 지지가 느껴져요");
  else improvements.push("프레이즈 앞 복식호흡을 한 번 더 챙기면 좋아요");
  if (diction >= 78) strengths.push("발음이 또렷한 편이에요");
  else improvements.push("자음을 살짝 과장해 읽어보면 발음이 살아나요");
  if (vibrato < 70) improvements.push("바이브는 의도적으로 넣기보다, 먼저 곧은 음을 유지해 보세요");
  else strengths.push("자연스러운 바이브 흔들림이 있어요");

  return {
    id: `vai_${Date.now()}`,
    createdAt: new Date().toISOString(),
    title: input.title?.trim() || "내 보컬 분석",
    durationSec: input.durationSec,
    scores: { overall, pitch, rhythm, range, vibrato, breath, diction },
    rangeLabel,
    summary:
      overall >= 85
        ? "전체적으로 안정적인 녹음이에요. 디테일만 다듬으면 무대감이 살아납니다."
        : overall >= 70
          ? "기본기는 잡혀 있어요. 약한 항목만 루틴에 넣으면 금방 올라갑니다."
          : "오늘은 컨디션·루틴 점검 데이로 보기 좋아요. 짧은 워밍업부터 다시 시작해 보세요.",
    strengths: strengths.slice(0, 3),
    improvements: improvements.slice(0, 3),
    proTips: [
      "바이브 주기: 평균보다 약간 빠른 편 → 곧은 음을 2초 유지한 뒤 넣으면 컨트롤이 쉬워져요.",
      "호흡: 프레이즈 끝에서 압이 떨어지는 구간이 있어요. S 연장 호흡 루틴을 추천합니다.",
      "발음: /ㅅ/, /ㅈ/ 마찰음이 뭉개지는 타이밍이 있습니다. 가사만 리듬 읽기 1회 추가해 보세요.",
      "히스토리: 같은 곡을 주 2회 올리면 음정 편차 추이를 그래프로 보여드릴 수 있어요.",
    ],
  };
}

const PRO_KEY = "eum-vocal-ai-pro";
const HISTORY_KEY = "eum-vocal-ai-history";

type DbVocalAiReport = {
  id: string;
  created_at: string;
  title: string;
  duration_sec: number;
  scores: VocalAiScores;
  range_label: string;
  summary: string;
  strengths: string[];
  improvements: string[];
  pro_tips: string[];
};

function mapReport(row: DbVocalAiReport): VocalAiReport {
  return {
    id: row.id,
    createdAt: row.created_at,
    title: row.title,
    durationSec: row.duration_sec,
    scores: row.scores,
    rangeLabel: row.range_label,
    summary: row.summary,
    strengths: row.strengths ?? [],
    improvements: row.improvements ?? [],
    proTips: row.pro_tips ?? [],
  };
}

function readLocalHistory(): VocalAiReport[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as VocalAiReport[];
  } catch {
    return [];
  }
}

function writeLocalHistory(reports: VocalAiReport[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(HISTORY_KEY, JSON.stringify(reports.slice(0, 30)));
}

function readLocalPro(): boolean {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(PRO_KEY) === "1";
}

function writeLocalPro(on: boolean) {
  if (typeof window === "undefined") return;
  if (on) window.localStorage.setItem(PRO_KEY, "1");
  else window.localStorage.removeItem(PRO_KEY);
}

/** @deprecated syncVocalAiFromSupabase 사용 권장 */
export function isProUnlocked(): boolean {
  return readLocalPro();
}

/** @deprecated setVocalAiPro 사용 권장 */
export function setProUnlocked(on: boolean) {
  writeLocalPro(on);
}

/** @deprecated loadVocalAiHistoryAsync 사용 권장 */
export function loadVocalAiHistory(): VocalAiReport[] {
  return readLocalHistory();
}

/** @deprecated saveVocalAiReportAsync 사용 권장 */
export function saveVocalAiReport(report: VocalAiReport) {
  const prev = readLocalHistory();
  writeLocalHistory([report, ...prev]);
}

export async function syncVocalAiFromSupabase(studentId?: string): Promise<{
  pro: boolean;
  history: VocalAiReport[];
}> {
  const localPro = readLocalPro();
  const localHistory = readLocalHistory();

  if (!studentId || !isSupabaseConfigured()) {
    return { pro: localPro, history: localHistory };
  }

  try {
    const { createClient } = await import("@/lib/supabase/client");
    const supabase = createClient();

    const [{ data: student }, { data: rows, error }] = await Promise.all([
      supabase.from("students").select("vocal_ai_pro").eq("id", studentId).maybeSingle(),
      supabase
        .from("vocal_ai_reports")
        .select("*")
        .eq("student_id", studentId)
        .order("created_at", { ascending: false })
        .limit(30),
    ]);

    if (error) throw error;

    const remotePro = Boolean(student?.vocal_ai_pro);
    const remoteHistory = (rows as DbVocalAiReport[] | null)?.map(mapReport) ?? [];

    // 로컬에만 있던 Pro를 서버로 승격
    if (localPro && !remotePro) {
      await supabase.from("students").update({ vocal_ai_pro: true }).eq("id", studentId);
    }
    const pro = remotePro || localPro;
    writeLocalPro(pro);

    if (remoteHistory.length > 0) {
      writeLocalHistory(remoteHistory);
      return { pro, history: remoteHistory };
    }
    return { pro, history: localHistory };
  } catch (err) {
    console.warn("[vocal-ai] sync failed, using local", err);
    return { pro: localPro, history: localHistory };
  }
}

export async function setVocalAiPro(on: boolean, studentId?: string) {
  writeLocalPro(on);
  if (!studentId || !isSupabaseConfigured()) return;
  try {
    const { createClient } = await import("@/lib/supabase/client");
    const supabase = createClient();
    const { error } = await supabase
      .from("students")
      .update({ vocal_ai_pro: on })
      .eq("id", studentId);
    if (error) throw error;
  } catch (err) {
    console.warn("[vocal-ai] pro save failed, kept local", err);
  }
}

export async function saveVocalAiReportAsync(
  report: VocalAiReport,
  studentId?: string,
): Promise<VocalAiReport> {
  const prev = readLocalHistory();
  writeLocalHistory([report, ...prev]);

  if (!studentId || !isSupabaseConfigured()) {
    return report;
  }

  try {
    const { createClient } = await import("@/lib/supabase/client");
    const supabase = createClient();
    const { data, error } = await supabase
      .from("vocal_ai_reports")
      .insert({
        student_id: studentId,
        title: report.title,
        duration_sec: report.durationSec,
        scores: report.scores,
        range_label: report.rangeLabel,
        summary: report.summary,
        strengths: report.strengths,
        improvements: report.improvements,
        pro_tips: report.proTips,
      })
      .select("*")
      .single();

    if (error || !data) throw error ?? new Error("VOCAL_AI_SAVE_FAILED");
    const remote = mapReport(data as DbVocalAiReport);
    const others = readLocalHistory().filter((r) => r.id !== report.id && r.id !== remote.id);
    writeLocalHistory([remote, ...others]);
    return remote;
  } catch (err) {
    console.warn("[vocal-ai] report save failed, kept local", err);
    return report;
  }
}
