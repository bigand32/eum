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

export type LiveVocalMetrics = {
  /** 감지된 피치 Hz 샘플 (무음 제외) */
  pitchHz: number[];
  /** RMS 샘플 (시간순) */
  rms: number[];
  durationSec: number;
};

/** 녹음 중 실측값 → 리포트 점수 */
export function generateVocalReportFromMetrics(input: {
  title?: string;
  metrics: LiveVocalMetrics;
}): VocalAiReport {
  const { pitchHz, rms, durationSec } = input.metrics;
  const seed = Math.round(durationSec * 17 + pitchHz.length);

  const pitch = scorePitchStability(pitchHz);
  const range = scorePitchRange(pitchHz);
  const breath = scoreBreathSupport(rms);
  const rhythm = scoreRhythmRough(rms, durationSec);
  const vibrato = scoreVibratoRough(pitchHz);
  const diction = clampScore(70 + (seed % 12) - 4); // STT 전엔 추정
  const overall = clampScore(
    pitch * 0.3 + rhythm * 0.18 + range * 0.15 + vibrato * 0.1 + breath * 0.17 + diction * 0.1,
  );

  const rangeLabel =
    range >= 85
      ? "넓은 편 (약 1.5옥타브+)"
      : range >= 70
        ? "평균 (약 1~1.3옥타브)"
        : "좁은 편 — 스트레칭 추천";

  const strengths: string[] = [];
  const improvements: string[] = [];
  if (pitchHz.length < 8) {
    improvements.push("목소리가 짧게 잡혔어요. 조금 더 가까이, 또렷하게 불러 보세요");
  }
  if (pitch >= 80) strengths.push("음정 중심이 비교적 안정적이에요");
  else improvements.push("스케일 연습으로 음정 중심을 잡아보세요");
  if (rhythm >= 78) strengths.push("소리의 끊김·리듬감이 좋아요");
  else improvements.push("한 소절을 일정한 크기로 이어 불러 보세요");
  if (breath >= 75) strengths.push("호흡 지지가 느껴져요");
  else improvements.push("프레이즈 앞 복식호흡을 한 번 더 챙기면 좋아요");
  if (range >= 80) strengths.push("음역을 넓게 쓰고 있어요");
  else if (range < 70) improvements.push("워밍업 스케일로 음역을 살짝 열어보세요");
  if (vibrato < 70) improvements.push("바이브는 의도적으로 넣기보다, 먼저 곧은 음을 유지해 보세요");
  else strengths.push("자연스러운 바이브 흔들림이 있어요");

  while (strengths.length < 1) strengths.push("오늘도 연습한 것 자체가 좋아요");
  while (improvements.length < 1) improvements.push("짧은 구간만 반복해도 금방 올라가요");

  return {
    id: `vai_${Date.now()}`,
    createdAt: new Date().toISOString(),
    title: input.title?.trim() || "내 보컬 분석",
    durationSec,
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
      "바이브 주기: 곧은 음을 2초 유지한 뒤 넣으면 컨트롤이 쉬워져요.",
      "호흡: 프레이즈 끝에서 압이 떨어지는 구간이 있으면 S 연장 호흡 루틴을 추천해요.",
      "아이폰은 스피커·잡음에 민감해요. 조용한 곳·유선 이어폰 마이크가 더 안정적이에요.",
      "히스토리: 같은 곡을 주 2회 올리면 음정 편차 추이를 그래프로 보여드릴 수 있어요.",
    ],
  };
}

function scorePitchStability(hz: number[]) {
  if (hz.length < 5) return 62;
  // 인접 프레임 센트 편차 평균
  let sum = 0;
  let n = 0;
  for (let i = 1; i < hz.length; i++) {
    const cents = 1200 * Math.log2(hz[i] / hz[i - 1]);
    if (Math.abs(cents) < 400) {
      sum += Math.abs(cents);
      n++;
    }
  }
  if (!n) return 65;
  const avg = sum / n;
  // 작을수록 안정 → 높은 점수
  return clampScore(96 - avg * 1.1);
}

function scorePitchRange(hz: number[]) {
  if (hz.length < 5) return 60;
  const min = Math.min(...hz);
  const max = Math.max(...hz);
  const semis = 12 * Math.log2(max / min);
  if (semis >= 18) return clampScore(90);
  if (semis >= 12) return clampScore(82);
  if (semis >= 7) return clampScore(72);
  return clampScore(62 + semis * 1.2);
}

function scoreBreathSupport(rms: number[]) {
  if (rms.length < 8) return 64;
  const voiced = rms.filter((v) => v > 0.015);
  if (voiced.length < 5) return 60;
  const mean = voiced.reduce((a, b) => a + b, 0) / voiced.length;
  let varSum = 0;
  for (const v of voiced) varSum += (v - mean) ** 2;
  const std = Math.sqrt(varSum / voiced.length);
  const cv = std / Math.max(mean, 1e-6);
  // 너무 작아도(거의 안 들림)·너무 흔들려도 감점
  const level = Math.min(1, mean / 0.08);
  return clampScore(58 + level * 28 - cv * 40);
}

function scoreRhythmRough(rms: number[], durationSec: number) {
  if (rms.length < 10 || durationSec < 3) return 66;
  // RMS onset 간격의 규칙성
  const thr = 0.03;
  const onsets: number[] = [];
  for (let i = 1; i < rms.length; i++) {
    if (rms[i] > thr && rms[i - 1] <= thr) onsets.push(i);
  }
  if (onsets.length < 3) return 70;
  const gaps: number[] = [];
  for (let i = 1; i < onsets.length; i++) gaps.push(onsets[i] - onsets[i - 1]);
  const mean = gaps.reduce((a, b) => a + b, 0) / gaps.length;
  let varSum = 0;
  for (const g of gaps) varSum += (g - mean) ** 2;
  const cv = Math.sqrt(varSum / gaps.length) / Math.max(mean, 1);
  return clampScore(92 - cv * 55);
}

function scoreVibratoRough(hz: number[]) {
  if (hz.length < 12) return 65;
  // 짧은 주기 흔들림 존재 여부
  let flips = 0;
  for (let i = 2; i < hz.length; i++) {
    const d1 = hz[i - 1] - hz[i - 2];
    const d2 = hz[i] - hz[i - 1];
    if (d1 * d2 < 0 && Math.abs(d1) + Math.abs(d2) > 0.5) flips++;
  }
  const rate = flips / hz.length;
  if (rate > 0.08 && rate < 0.35) return clampScore(78 + rate * 40);
  if (rate >= 0.35) return clampScore(70);
  return clampScore(64);
}

/** 실제 모델 연동 전: 녹음 메타로 자연스러운 점수 생성 */
export function generateMockVocalReport(input: {
  title?: string;
  durationSec: number;
  seed?: number;
}): VocalAiReport {
  return generateVocalReportFromMetrics({
    title: input.title,
    metrics: {
      durationSec: input.durationSec,
      pitchHz: [],
      rms: Array.from({ length: 20 }, (_, i) => 0.04 + ((input.seed ?? 1) % 7) * 0.002 + (i % 3) * 0.01),
    },
  });
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
