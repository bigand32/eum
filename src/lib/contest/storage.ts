/** 챌린지 대회 — 로컬 저장 (엔트리·하트·프로필) */

import { contestDateKey } from "@/lib/contest/songs";

export type ContestEntry = {
  id: string;
  studentId: string;
  dateKey: string;
  songTitle: string;
  artist: string;
  mediaUrl: string;
  mediaType: "audio" | "video";
  nickname: string;
  /** 인스타 아이디 (선택, @ 없이 저장) */
  instagram: string | null;
  intro: string;
  heartCount: number;
  /** 하트 누른 studentId 목록 */
  heartBy: string[];
  createdAt: string;
};

export type ContestProfileDraft = {
  nickname: string;
  instagram: string;
  intro: string;
};

const ENTRIES_KEY = "eum-contest-entries";
const PROFILE_KEY = "eum-contest-profile";

function readEntries(): ContestEntry[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(window.localStorage.getItem(ENTRIES_KEY) || "[]") as ContestEntry[];
  } catch {
    return [];
  }
}

function writeEntries(entries: ContestEntry[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(ENTRIES_KEY, JSON.stringify(entries.slice(0, 200)));
}

export function getContestProfile(): ContestProfileDraft | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(PROFILE_KEY);
    return raw ? (JSON.parse(raw) as ContestProfileDraft) : null;
  } catch {
    return null;
  }
}

export function saveContestProfile(profile: ContestProfileDraft) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(
    PROFILE_KEY,
    JSON.stringify({
      nickname: profile.nickname.trim(),
      instagram: profile.instagram.trim().replace(/^@/, ""),
      intro: profile.intro.trim(),
    }),
  );
}

export function listContestEntries(dateKey = contestDateKey()): ContestEntry[] {
  return readEntries()
    .filter((e) => e.dateKey === dateKey)
    .sort((a, b) => {
      if (b.heartCount !== a.heartCount) return b.heartCount - a.heartCount;
      return b.createdAt.localeCompare(a.createdAt);
    });
}

/** 1~3위 고정 + 나머지 목록 */
export function splitContestLeaderboard(entries: ContestEntry[]) {
  const ranked = [...entries];
  return {
    top3: ranked.slice(0, 3),
    rest: ranked.slice(3),
  };
}

export function getMyContestEntry(studentId: string, dateKey = contestDateKey()) {
  if (!studentId) return null;
  return readEntries().find((e) => e.studentId === studentId && e.dateKey === dateKey) ?? null;
}

export function submitContestEntry(input: {
  studentId: string;
  dateKey: string;
  songTitle: string;
  artist: string;
  mediaUrl: string;
  mediaType: "audio" | "video";
  nickname: string;
  instagram: string;
  intro: string;
}): ContestEntry {
  const entries = readEntries().filter(
    (e) => !(e.studentId === input.studentId && e.dateKey === input.dateKey),
  );
  const entry: ContestEntry = {
    id: `ce_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    studentId: input.studentId,
    dateKey: input.dateKey,
    songTitle: input.songTitle,
    artist: input.artist,
    mediaUrl: input.mediaUrl,
    mediaType: input.mediaType,
    nickname: input.nickname.trim(),
    instagram: input.instagram.trim().replace(/^@/, "") || null,
    intro: input.intro.trim(),
    heartCount: 0,
    heartBy: [],
    createdAt: new Date().toISOString(),
  };
  writeEntries([entry, ...entries]);
  saveContestProfile({
    nickname: entry.nickname,
    instagram: entry.instagram ?? "",
    intro: entry.intro,
  });
  return entry;
}

/** 하트 토글. 본인 글에는 불가. 반환: 갱신된 엔트리 또는 null */
export function toggleContestHeart(
  entryId: string,
  voterStudentId: string,
): ContestEntry | null {
  const entries = readEntries();
  const idx = entries.findIndex((e) => e.id === entryId);
  if (idx < 0) return null;
  const entry = entries[idx];
  if (entry.studentId === voterStudentId) return entry;

  const liked = entry.heartBy.includes(voterStudentId);
  const heartBy = liked
    ? entry.heartBy.filter((id) => id !== voterStudentId)
    : [...entry.heartBy, voterStudentId];
  const next: ContestEntry = {
    ...entry,
    heartBy,
    heartCount: heartBy.length,
  };
  entries[idx] = next;
  writeEntries(entries);
  return next;
}

export function hasHearted(entry: ContestEntry, studentId: string) {
  return entry.heartBy.includes(studentId);
}

const DEMO_SEEDED_KEY = "eum-contest-demo-seeded";

/** 이번 달 출품이 없으면 테스트용 목록을 한 번 심음 */
export function ensureDemoContestEntries(input: {
  monthKey: string;
  songTitle: string;
  artist: string;
}) {
  if (typeof window === "undefined") return;
  const seeded = window.localStorage.getItem(DEMO_SEEDED_KEY);
  if (seeded === input.monthKey) {
    // 이미 이번 달 시드함 — 실제 유저 출품만 있으면 그대로
    const existing = listContestEntries(input.monthKey);
    if (existing.length > 0) return;
  }

  if (listContestEntries(input.monthKey).length > 0) {
    window.localStorage.setItem(DEMO_SEEDED_KEY, input.monthKey);
    return;
  }

  const demos: Omit<ContestEntry, "id" | "createdAt">[] = [
    {
      studentId: "demo_sori",
      dateKey: input.monthKey,
      songTitle: input.songTitle,
      artist: input.artist,
      mediaUrl: "demo:audio",
      mediaType: "audio",
      nickname: "소리",
      instagram: "sori_vocal",
      intro: "감성 발라드 좋아해요",
      heartCount: 128,
      heartBy: Array.from({ length: 128 }, (_, i) => `v${i}`),
    },
    {
      studentId: "demo_mina",
      dateKey: input.monthKey,
      songTitle: input.songTitle,
      artist: input.artist,
      mediaUrl: "demo:video",
      mediaType: "video",
      nickname: "미나",
      instagram: "mina.sing",
      intro: "고음 연습 중 · 피드백 환영",
      heartCount: 96,
      heartBy: Array.from({ length: 96 }, (_, i) => `v${i}`),
    },
    {
      studentId: "demo_jun",
      dateKey: input.monthKey,
      songTitle: input.songTitle,
      artist: input.artist,
      mediaUrl: "demo:audio",
      mediaType: "audio",
      nickname: "준",
      instagram: null,
      intro: "남자 음역으로 불러봤어요",
      heartCount: 74,
      heartBy: Array.from({ length: 74 }, (_, i) => `v${i}`),
    },
    {
      studentId: "demo_hae",
      dateKey: input.monthKey,
      songTitle: input.songTitle,
      artist: input.artist,
      mediaUrl: "demo:audio",
      mediaType: "audio",
      nickname: "해린",
      instagram: "haerin.voice",
      intro: "첫 콘테스트 도전!",
      heartCount: 41,
      heartBy: Array.from({ length: 41 }, (_, i) => `v${i}`),
    },
    {
      studentId: "demo_teo",
      dateKey: input.monthKey,
      songTitle: input.songTitle,
      artist: input.artist,
      mediaUrl: "demo:video",
      mediaType: "video",
      nickname: "테오",
      instagram: "teo_official",
      intro: "호흡에 신경 썼어요",
      heartCount: 28,
      heartBy: Array.from({ length: 28 }, (_, i) => `v${i}`),
    },
    {
      studentId: "demo_yuna",
      dateKey: input.monthKey,
      songTitle: input.songTitle,
      artist: input.artist,
      mediaUrl: "demo:audio",
      mediaType: "audio",
      nickname: "유나",
      instagram: null,
      intro: "연습실에서 한 번 녹음했어요",
      heartCount: 12,
      heartBy: Array.from({ length: 12 }, (_, i) => `v${i}`),
    },
  ];

  const now = Date.now();
  const entries: ContestEntry[] = demos.map((d, i) => ({
    ...d,
    id: `demo_${input.monthKey}_${i}`,
    createdAt: new Date(now - i * 36_000_00).toISOString(),
  }));

  const others = readEntries().filter((e) => e.dateKey !== input.monthKey);
  writeEntries([...entries, ...others]);
  window.localStorage.setItem(DEMO_SEEDED_KEY, input.monthKey);
}
