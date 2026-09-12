import type { EumDatabase, FeedbackOrder, PracticeRecord } from "@/lib/db/schema";
import { matchesStudentScope } from "@/lib/student-utils";

function toDateKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function startOfDay(d: Date) {
  const next = new Date(d);
  next.setHours(0, 0, 0, 0);
  return next;
}

function studentPractices(db: EumDatabase, studentId: string): PracticeRecord[] {
  return db.practiceRecords.filter((r) => matchesStudentScope(studentId, r.studentId));
}

function studentFeedback(db: EumDatabase, studentId: string): FeedbackOrder[] {
  return db.feedbackOrders.filter(
    (o) => matchesStudentScope(studentId, o.studentId) && o.status !== "cancelled",
  );
}

/** 제목/메모에 키워드가 있는 최근 연습 일수 */
export function getKeywordPracticeDayCount(
  db: EumDatabase,
  studentId: string,
  keywords: string[],
  days = 7,
  now = new Date(),
) {
  const start = startOfDay(now);
  start.setDate(start.getDate() - (days - 1));
  const keys = new Set<string>();
  for (const r of studentPractices(db, studentId)) {
    const at = new Date(r.createdAt);
    if (at < start) continue;
    const hay = `${r.title} ${r.memo ?? ""}`.toLowerCase();
    if (keywords.some((k) => hay.includes(k.toLowerCase()))) {
      keys.add(toDateKey(at));
    }
  }
  return keys.size;
}

export function hasAnyFeedback(db: EumDatabase, studentId: string) {
  return studentFeedback(db, studentId).length > 0;
}

export type HomeChallengeItem =
  | {
      id: string;
      kind: "link";
      title: string;
      subtitle: string;
      href: string;
      icon: string;
      iconTone: string;
      completed: boolean;
    }
  | {
      id: string;
      kind: "meter";
      label: string;
      title: string;
      percent: number;
      href: string;
      detail: string;
      completed: boolean;
    };

const VOCAL_SCALE_TARGET = 5;
const BREATH_EXTEND_TARGET = 5;

export const CHALLENGE_IDS = [
  "five-scale",
  "nine-scale",
  "passaggio-15",
  "octave-repeat",
  "arpeggio-1538",
  "breath-extend",
] as const;

export type ChallengeId = (typeof CHALLENGE_IDS)[number];

export function isChallengeId(id: string): id is ChallengeId {
  return (CHALLENGE_IDS as readonly string[]).includes(id);
}

export type ChallengeCatalogItem = {
  id: ChallengeId;
  tag: string;
  title: string;
  short: string;
  filter: "#발성" | "#호흡";
  tone: "brand" | "amber" | "sky" | "mint" | "warm";
  icon: string;
};

export const CHALLENGE_CATALOG: ChallengeCatalogItem[] = [
  {
    id: "five-scale",
    tag: "발성",
    title: "5스케일 연습",
    short: "상행·하행으로 음감과 정확도 키우기",
    filter: "#발성",
    tone: "amber",
    icon: "fa-chart-line",
  },
  {
    id: "nine-scale",
    tag: "발성",
    title: "9스케일 연습",
    short: "메이저 스케일로 성구전환 부드럽게",
    filter: "#발성",
    tone: "warm",
    icon: "fa-wave-square",
  },
  {
    id: "passaggio-15",
    tag: "발성",
    title: "1.5스케일 · 성구전환",
    short: "도약과 연결로 자연스러운 전환",
    filter: "#발성",
    tone: "brand",
    icon: "fa-exchange",
  },
  {
    id: "octave-repeat",
    tag: "발성",
    title: "옥타브 리핏",
    short: "파사지오 구간 연결 · 소리 강화",
    filter: "#발성",
    tone: "mint",
    icon: "fa-redo",
  },
  {
    id: "arpeggio-1538",
    tag: "워밍업",
    title: "아르페지오 목풀기",
    short: "1-5-3-8-5-3-1로 부드럽게",
    filter: "#발성",
    tone: "sky",
    icon: "fa-music",
  },
  {
    id: "breath-extend",
    tag: "호흡",
    title: "호흡 연습",
    short: "숨 끊기면 떨어져요 · 20·30·40초",
    filter: "#호흡",
    tone: "sky",
    icon: "fa-wind",
  },
];

export type ChallengeDetailProgress = {
  id: ChallengeId;
  percent: number;
  current: number;
  target: number;
  completed: boolean;
  label: string;
  ctaHref: string;
  ctaLabel: string;
};

const ROUTINE_PROGRESS: Record<
  ChallengeId,
  { keywords: string[]; label: string; target: number }
> = {
  "five-scale": {
    keywords: ["5스케일", "스케일", "발성"],
    label: "5스케일",
    target: VOCAL_SCALE_TARGET,
  },
  "nine-scale": {
    keywords: ["9스케일", "성구전환", "스케일"],
    label: "9스케일",
    target: VOCAL_SCALE_TARGET,
  },
  "passaggio-15": {
    keywords: ["1.5스케일", "성구전환", "발성"],
    label: "성구전환",
    target: VOCAL_SCALE_TARGET,
  },
  "octave-repeat": {
    keywords: ["옥타브", "리핏", "파사지오"],
    label: "옥타브 리핏",
    target: VOCAL_SCALE_TARGET,
  },
  "arpeggio-1538": {
    keywords: ["아르페지오", "1538531", "목풀기"],
    label: "아르페지오",
    target: VOCAL_SCALE_TARGET,
  },
  "breath-extend": {
    keywords: ["호흡늘리기", "흉복식", "호흡"],
    label: "호흡 늘리기",
    target: BREATH_EXTEND_TARGET,
  },
};

export function getChallengeDetailProgress(
  id: ChallengeId,
  db: EumDatabase,
  studentId: string,
  now = new Date(),
): ChallengeDetailProgress {
  const mapped = ROUTINE_PROGRESS[id];
  const current = Math.min(
    getKeywordPracticeDayCount(db, studentId, mapped.keywords, 14, now),
    mapped.target,
  );
  const completed = current >= mapped.target;
  return {
    id,
    percent: Math.round((current / mapped.target) * 100),
    current,
    target: mapped.target,
    completed,
    label: completed
      ? `${mapped.label} 완료!`
      : `${current}/${mapped.target}회 ${mapped.label}`,
    ctaHref: "/daily",
    ctaLabel: `${mapped.label} 기록하기`,
  };
}

export function buildHomeChallenges(
  db: EumDatabase,
  studentId: string,
  now = new Date(),
): HomeChallengeItem[] {
  return CHALLENGE_CATALOG.map((item) => {
    const progress = getChallengeDetailProgress(item.id, db, studentId, now);
    return {
      id: item.id,
      kind: "link" as const,
      title: item.title,
      subtitle: progress.label,
      href: `/challenges/${item.id}`,
      icon: item.icon,
      iconTone: progress.completed
        ? "bg-emerald-50 text-emerald-600"
        : "bg-brand-50 text-brand-500",
      completed: progress.completed,
    };
  }).sort((a, b) => Number(a.completed) - Number(b.completed));
}
