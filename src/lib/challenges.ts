import type { EumDatabase, FeedbackOrder, PracticeRecord } from "@/lib/db/schema";
import { matchesStudentScope } from "@/lib/student-utils";
import { getLongToneDayCount, LONG_TONE_DAY_TARGET } from "@/lib/long-tone";
import { DOREMI_DAY_TARGET, getDoremiDayCount } from "@/lib/doremi-challenge";
import { getHighNotePracticeDayCount } from "@/lib/pitch/highNoteStorage";

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
    (o) =>
      matchesStudentScope(studentId, o.studentId) &&
      o.status !== "cancelled",
  );
}

/** 이번 주(월~일) 연습한 고유 날짜 수 */
export function getWeekPracticeDayCount(
  db: EumDatabase,
  studentId: string,
  now = new Date(),
) {
  const day = now.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  const monday = startOfDay(now);
  monday.setDate(now.getDate() + mondayOffset);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);

  const keys = new Set<string>();
  for (const r of studentPractices(db, studentId)) {
    const at = new Date(r.createdAt);
    if (at >= monday && at <= sunday) keys.add(toDateKey(at));
  }
  return keys.size;
}

/** 최근 N일 연습 고유 일수 */
export function getRecentPracticeDayCount(
  db: EumDatabase,
  studentId: string,
  days: number,
  now = new Date(),
) {
  const start = startOfDay(now);
  start.setDate(start.getDate() - (days - 1));
  const keys = new Set<string>();
  for (const r of studentPractices(db, studentId)) {
    const at = new Date(r.createdAt);
    if (at >= start) keys.add(toDateKey(at));
  }
  return keys.size;
}

/** 이번 달 연습 고유 일수 */
export function getMonthPracticeDayCount(
  db: EumDatabase,
  studentId: string,
  now = new Date(),
) {
  const y = now.getFullYear();
  const m = now.getMonth();
  const keys = new Set<string>();
  for (const r of studentPractices(db, studentId)) {
    const at = new Date(r.createdAt);
    if (at.getFullYear() === y && at.getMonth() === m) keys.add(toDateKey(at));
  }
  return keys.size;
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

export function getLatestFeedbackHref(db: EumDatabase, studentId: string) {
  const orders = studentFeedback(db, studentId).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
  const latest = orders[0];
  if (!latest) return "/search";
  if (latest.status === "completed") return `/feedback/${latest.id}`;
  return `/feedback/${latest.id}`;
}

export type HomeChallengeItem =
  | {
      id: string;
      kind: "steps";
      badge: string;
      title: string;
      subtitle: string;
      step: number;
      totalSteps: number;
      href: string;
      completed: boolean;
    }
  | {
      id: string;
      kind: "action";
      eyebrow: string;
      title: string;
      cta: string;
      href: string;
      icon: string;
      tone: "brand" | "warm";
      completed: boolean;
    }
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

const WEEK_TARGET = 3;
const HIGH_NOTE_TARGET = 7;
const MONTH_TARGET_DAYS = 12;
const BREATH_TARGET = 5;
const WARMUP_TARGET = 7;
const SCALE_TARGET = 5;
const BEGINNER_DAILY_TARGET = 7;
const BREATH_BASICS_TARGET = 5;

export const CHALLENGE_IDS = [
  "practice-week",
  "first-feedback",
  "high-note",
  "consistency",
  "breath",
  "daily-warmup",
  "scale-basics",
  "breath-basics",
  "beginner-daily",
  "long-tone",
  "doremi",
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
  filter: "#루틴" | "#피드백" | "#고음" | "#호흡" | "#스페셜" | "#초보";
  tone: "brand" | "amber" | "sky" | "mint" | "warm";
  icon: string;
  /** 3D clay 일러스트 (public 경로) */
  clayIcon: string;
};

export const CHALLENGE_CATALOG: ChallengeCatalogItem[] = [
  {
    id: "beginner-daily",
    tag: "초보",
    title: "초보 데일리 10분",
    short: "워밍업·호흡·스케일을 한 번에",
    filter: "#초보",
    tone: "mint",
    icon: "fa-music",
    clayIcon: "/challenge-icons/mungchi/idle.png",
  },
  {
    id: "daily-warmup",
    tag: "5분",
    title: "매일 워밍업",
    short: "허밍·립트릴·사이렌으로 몸 풀기",
    filter: "#초보",
    tone: "warm",
    icon: "fa-fire",
    clayIcon: "/challenge-icons/mungchi/sing.png",
  },
  {
    id: "scale-basics",
    tag: "스케일",
    title: "스케일 기초",
    short: "도레미로 음정·음역 익히기",
    filter: "#초보",
    tone: "amber",
    icon: "fa-wave-square",
    clayIcon: "/challenge-icons/mungchi/sing.png",
  },
  {
    id: "breath-basics",
    tag: "호흡",
    title: "호흡법 기초",
    short: "복식호흡·박스호흡·S연장",
    filter: "#호흡",
    tone: "sky",
    icon: "fa-wind",
    clayIcon: "/challenge-icons/mungchi/breath.png",
  },
  {
    id: "long-tone",
    tag: "게임",
    title: "롱톤 유지력",
    short: "캐릭터와 함께 긴 음 유지 챌린지",
    filter: "#호흡",
    tone: "mint",
    icon: "fa-wave-square",
    clayIcon: "/challenge-icons/mungchi/sing.png",
  },
  {
    id: "doremi",
    tag: "게임",
    title: "도레미 챌린지",
    short: "맞는 음을 부르며 계단을 한 칸씩 올라가요",
    filter: "#초보",
    tone: "warm",
    icon: "fa-music",
    clayIcon: "/challenge-icons/mungchi/sing.png",
  },
  {
    id: "practice-week",
    tag: "주간",
    title: "이번 주 연습일지 3회",
    short: "씨앗을 심고 연습으로 키워요",
    filter: "#루틴",
    tone: "mint",
    icon: "fa-pen",
    clayIcon: "/challenge-icons/mungchi/write.png",
  },
  {
    id: "first-feedback",
    tag: "시작",
    title: "첫 피드백 받기",
    short: "마스터에게 첫 코칭을 받아보세요",
    filter: "#피드백",
    tone: "brand",
    icon: "fa-headphones",
    clayIcon: "/challenge-icons/mungchi/headphones.png",
  },
  {
    id: "high-note",
    tag: "7일",
    title: "고음 안정 챌린지",
    short: "매일 10분 고음 집중 연습",
    filter: "#고음",
    tone: "sky",
    icon: "fa-bolt",
    clayIcon: "/challenge-icons/mungchi/highnote.png",
  },
  {
    id: "consistency",
    tag: "월간",
    title: "이번 달 연습 루틴",
    short: "한 달 목표 12일 연습",
    filter: "#루틴",
    tone: "brand",
    icon: "fa-clipboard-list",
    clayIcon: "/challenge-icons/mungchi/checklist.png",
  },
  {
    id: "breath",
    tag: "미션",
    title: "호흡 트레이닝",
    short: "복식호흡을 기록으로 남겨요",
    filter: "#호흡",
    tone: "sky",
    icon: "fa-wind",
    clayIcon: "/challenge-icons/mungchi/breath.png",
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

export function getChallengeDetailProgress(
  id: ChallengeId,
  db: EumDatabase,
  studentId: string,
  now = new Date(),
): ChallengeDetailProgress {
  if (id === "practice-week") {
    const current = Math.min(getWeekPracticeDayCount(db, studentId, now), WEEK_TARGET);
    const completed = current >= WEEK_TARGET;
    return {
      id,
      percent: Math.round((current / WEEK_TARGET) * 100),
      current,
      target: WEEK_TARGET,
      completed,
      label: completed ? "이번 주 목표 달성!" : `${current}/${WEEK_TARGET}회 작성`,
      ctaHref: "/daily",
      ctaLabel: completed ? "연습일지 보기" : "오늘 연습 기록하기",
    };
  }
  if (id === "first-feedback") {
    const completed = hasAnyFeedback(db, studentId);
    return {
      id,
      percent: completed ? 100 : 20,
      current: completed ? 1 : 0,
      target: 1,
      completed,
      label: completed ? "첫 피드백 완료" : "아직 피드백을 안 받았어요",
      ctaHref: completed ? getLatestFeedbackHref(db, studentId) : "/search",
      ctaLabel: completed ? "피드백 다시 보기" : "마스터 고르기",
    };
  }
  if (id === "high-note") {
    const fromPractice = getRecentPracticeDayCount(db, studentId, HIGH_NOTE_TARGET, now);
    const fromPitch =
      typeof window !== "undefined" ? getHighNotePracticeDayCount() : 0;
    const current = Math.min(Math.max(fromPractice, fromPitch), HIGH_NOTE_TARGET);
    const completed = current >= HIGH_NOTE_TARGET;
    return {
      id,
      percent: Math.round((current / HIGH_NOTE_TARGET) * 100),
      current,
      target: HIGH_NOTE_TARGET,
      completed,
      label: completed ? "7일 챌린지 완료!" : `최근 ${current}/${HIGH_NOTE_TARGET}일 연습`,
      ctaHref: "/challenges/high-note",
      ctaLabel: "피치 챌린지 하기",
    };
  }
  if (id === "consistency") {
    const current = getMonthPracticeDayCount(db, studentId, now);
    const percent = Math.min(100, Math.round((current / MONTH_TARGET_DAYS) * 100));
    const completed = current >= MONTH_TARGET_DAYS;
    return {
      id,
      percent,
      current,
      target: MONTH_TARGET_DAYS,
      completed,
      label: `이번 달 ${current}/${MONTH_TARGET_DAYS}일`,
      ctaHref: "/daily",
      ctaLabel: "연습일지 열기",
    };
  }
  if (id === "breath") {
    const current = Math.min(
      getKeywordPracticeDayCount(db, studentId, ["호흡", "복식", "breath"], 14, now),
      BREATH_TARGET,
    );
    const completed = current >= BREATH_TARGET;
    return {
      id,
      percent: Math.round((current / BREATH_TARGET) * 100),
      current,
      target: BREATH_TARGET,
      completed,
      label: completed
        ? "호흡 미션 완료!"
        : `호흡 키워드 연습 ${current}/${BREATH_TARGET}회`,
      ctaHref: "/daily",
      ctaLabel: "호흡 연습 기록",
    };
  }
  if (id === "daily-warmup") {
    const current = Math.min(
      getKeywordPracticeDayCount(
        db,
        studentId,
        ["워밍업", "허밍", "립트릴", "warmup"],
        14,
        now,
      ),
      WARMUP_TARGET,
    );
    const completed = current >= WARMUP_TARGET;
    return {
      id,
      percent: Math.round((current / WARMUP_TARGET) * 100),
      current,
      target: WARMUP_TARGET,
      completed,
      label: completed ? "워밍업 7일 완료!" : `${current}/${WARMUP_TARGET}일 워밍업`,
      ctaHref: "/daily",
      ctaLabel: "워밍업 기록하기",
    };
  }
  if (id === "scale-basics") {
    const current = Math.min(
      getKeywordPracticeDayCount(db, studentId, ["스케일", "도레미", "scale"], 14, now),
      SCALE_TARGET,
    );
    const completed = current >= SCALE_TARGET;
    return {
      id,
      percent: Math.round((current / SCALE_TARGET) * 100),
      current,
      target: SCALE_TARGET,
      completed,
      label: completed ? "스케일 기초 완료!" : `${current}/${SCALE_TARGET}회 스케일`,
      ctaHref: "/daily",
      ctaLabel: "스케일 연습 기록",
    };
  }
  if (id === "breath-basics") {
    const current = Math.min(
      getKeywordPracticeDayCount(
        db,
        studentId,
        ["복식", "박스호흡", "호흡법", "breath"],
        14,
        now,
      ),
      BREATH_BASICS_TARGET,
    );
    const completed = current >= BREATH_BASICS_TARGET;
    return {
      id,
      percent: Math.round((current / BREATH_BASICS_TARGET) * 100),
      current,
      target: BREATH_BASICS_TARGET,
      completed,
      label: completed
        ? "호흡법 기초 완료!"
        : `${current}/${BREATH_BASICS_TARGET}회 호흡법`,
      ctaHref: "/daily",
      ctaLabel: "호흡법 기록하기",
    };
  }
  if (id === "long-tone") {
    const current = Math.min(getLongToneDayCount(), LONG_TONE_DAY_TARGET);
    const completed = current >= LONG_TONE_DAY_TARGET;
    return {
      id,
      percent: Math.round((current / LONG_TONE_DAY_TARGET) * 100),
      current,
      target: LONG_TONE_DAY_TARGET,
      completed,
      label: completed
        ? "롱톤 7일 챌린지 완료!"
        : `${current}/${LONG_TONE_DAY_TARGET}일 롱톤 기록`,
      ctaHref: "/challenges/long-tone",
      ctaLabel: "롱톤 게임 하기",
    };
  }
  if (id === "doremi") {
    const current = Math.min(getDoremiDayCount(), DOREMI_DAY_TARGET);
    const completed = current >= DOREMI_DAY_TARGET;
    return {
      id,
      percent: Math.round((current / DOREMI_DAY_TARGET) * 100),
      current,
      target: DOREMI_DAY_TARGET,
      completed,
      label: completed
        ? "도레미 5일 챌린지 완료!"
        : `${current}/${DOREMI_DAY_TARGET}일 도레미 플레이`,
      ctaHref: "/challenges/doremi",
      ctaLabel: "도레미 챌린지 하기",
    };
  }
  // beginner-daily
  const current = Math.min(
    getKeywordPracticeDayCount(
      db,
      studentId,
      ["데일리", "발성", "루틴", "daily"],
      14,
      now,
    ),
    BEGINNER_DAILY_TARGET,
  );
  const completed = current >= BEGINNER_DAILY_TARGET;
  return {
    id: "beginner-daily",
    percent: Math.round((current / BEGINNER_DAILY_TARGET) * 100),
    current,
    target: BEGINNER_DAILY_TARGET,
    completed,
    label: completed
      ? "데일리 루틴 7일 완료!"
      : `${current}/${BEGINNER_DAILY_TARGET}일 데일리`,
    ctaHref: "/daily",
    ctaLabel: "데일리 연습 기록",
  };
}

export function buildHomeChallenges(
  db: EumDatabase,
  studentId: string,
  now = new Date(),
): HomeChallengeItem[] {
  const weekDays = getWeekPracticeDayCount(db, studentId, now);
  const weekDone = Math.min(weekDays, WEEK_TARGET);
  const weekComplete = weekDays >= WEEK_TARGET;

  const feedbackDone = hasAnyFeedback(db, studentId);
  const highNoteDays = getRecentPracticeDayCount(db, studentId, HIGH_NOTE_TARGET, now);
  const highNoteComplete = highNoteDays >= HIGH_NOTE_TARGET;

  const monthDays = getMonthPracticeDayCount(db, studentId, now);
  const monthPercent = Math.min(
    100,
    Math.round((monthDays / MONTH_TARGET_DAYS) * 100),
  );
  const monthComplete = monthDays >= MONTH_TARGET_DAYS;

  const breathDays = getKeywordPracticeDayCount(
    db,
    studentId,
    ["호흡", "복식", "breath"],
    14,
    now,
  );
  const breathComplete = breathDays >= BREATH_TARGET;

  const items: HomeChallengeItem[] = [
    {
      id: "practice-week",
      kind: "steps",
      badge: weekComplete ? "주간 미션 완료" : "주간 미션",
      title: "이번 주 연습일지 3회 작성",
      subtitle: weekComplete
        ? "이번 주 목표를 달성했어요!"
        : `${weekDone}/${WEEK_TARGET}회 작성 · 꾸준한 기록이 성장의 시작이에요`,
      step: weekComplete ? WEEK_TARGET + 1 : weekDone + 1,
      totalSteps: WEEK_TARGET,
      href: "/challenges/practice-week",
      completed: weekComplete,
    },
  ];

  if (!feedbackDone) {
    items.push({
      id: "first-feedback",
      kind: "action",
      eyebrow: "첫 피드백 챌린지",
      title: "연습 영상 올리고\n마스터 피드백 받기",
      cta: "피드백 요청하기",
      href: "/challenges/first-feedback",
      icon: "fa-microphone-lines",
      tone: "brand",
      completed: false,
    });
  } else {
    items.push({
      id: "first-feedback",
      kind: "action",
      eyebrow: "첫 피드백 완료",
      title: "피드백을 받아봤어요\n이어서 연습해 볼까요?",
      cta: "챌린지 보기",
      href: "/challenges/first-feedback",
      icon: "fa-check",
      tone: "warm",
      completed: true,
    });
  }

  items.push(
    {
      id: "high-note",
      kind: "link",
      title: "고음 안정 7일 챌린지",
      subtitle: highNoteComplete
        ? "7일 연속 연습 달성!"
        : `최근 ${highNoteDays}/${HIGH_NOTE_TARGET}일 연습 · 매일 10분 고음 집중`,
      href: "/challenges/high-note",
      icon: "fa-bolt",
      iconTone: highNoteComplete
        ? "bg-green-100 text-green-600"
        : "bg-amber-100 text-amber-600",
      completed: highNoteComplete,
    },
    {
      id: "consistency",
      kind: "meter",
      label: "연습 루틴",
      title: "이번 달 연습 달성률",
      percent: monthPercent,
      href: "/challenges/consistency",
      detail: `목표 ${MONTH_TARGET_DAYS}일 중 ${monthDays}일 연습`,
      completed: monthComplete,
    },
    {
      id: "breath",
      kind: "link",
      title: "호흡 트레이닝 미션",
      subtitle: breathComplete
        ? "호흡 미션 완료!"
        : `제목에 '호흡' 넣고 연습 ${breathDays}/${BREATH_TARGET}회`,
      href: "/challenges/breath",
      icon: "fa-wind",
      iconTone: breathComplete
        ? "bg-green-100 text-green-600"
        : "bg-sky-100 text-sky-600",
      completed: breathComplete,
    },
  );

  // 진행 중을 위로, 완료는 아래로
  return items.sort((a, b) => Number(a.completed) - Number(b.completed));
}
