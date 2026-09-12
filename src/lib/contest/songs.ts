/** 월간 챌린지 대회 — 곡·가수 지정 (한 달 하나) */

export type ContestSong = {
  songTitle: string;
  artist: string;
  hint?: string;
  /** 공식 MV 유튜브 URL (없으면 검색 링크로 대체) */
  youtubeUrl?: string;
};

/** 월 순환용 곡 목록 */
export const CONTEST_SONG_CATALOG: ContestSong[] = [
  {
    songTitle: "봄날",
    artist: "BTS",
    hint: "감성 보컬 · 호흡 길게",
    youtubeUrl: "https://www.youtube.com/watch?v=xEeFrLSkMm8",
  },
  {
    songTitle: "밤편지",
    artist: "아이유",
    hint: "잔잔한 톤 · 딕션",
    youtubeUrl: "https://www.youtube.com/watch?v=BzYnNdJhZQw",
  },
  {
    songTitle: "좋은 날",
    artist: "아이유",
    hint: "고음 도약 주의",
    youtubeUrl: "https://www.youtube.com/watch?v=2iZZWIxzr_4",
  },
  {
    songTitle: "에잇",
    artist: "아이유",
    hint: "감정 표현",
    youtubeUrl: "https://www.youtube.com/watch?v=TgOu00Mf3kI",
  },
  {
    songTitle: "Dynamite",
    artist: "BTS",
    hint: "경쾌한 리듬",
    youtubeUrl: "https://www.youtube.com/watch?v=gdZLi9oWNZg",
  },
  {
    songTitle: "사건의 지평선",
    artist: "윤하",
    hint: "파워 보컬",
    youtubeUrl: "https://www.youtube.com/watch?v=bN7jPc_tT0Q",
  },
  {
    songTitle: "사랑했어요",
    artist: "김범수",
    hint: "저음~고음 연결",
    youtubeUrl: "https://www.youtube.com/watch?v=Y7Zi1_1x_8Y",
  },
  {
    songTitle: "그대라는 시",
    artist: "태연",
    hint: "소프트 톤",
    youtubeUrl: "https://www.youtube.com/watch?v=4iFVZJG5qkw",
  },
  {
    songTitle: "밤편지",
    artist: "아이유",
    hint: "속삭이듯",
    youtubeUrl: "https://www.youtube.com/watch?v=BzYnNdJhZQw",
  },
  {
    songTitle: "오늘도 빛나는 너에게",
    artist: "마크튭",
    hint: "따뜻하게",
    youtubeUrl: "https://www.youtube.com/watch?v=VQIrBXnQT4Y",
  },
  {
    songTitle: "썸 탈꺼야",
    artist: "볼빨간사춘기",
    hint: "경쾌·또렷한 발음",
    youtubeUrl: "https://www.youtube.com/watch?v=byKNCzR-psk",
  },
  {
    songTitle: "첫 눈",
    artist: "EXO",
    hint: "감성 하모니",
    youtubeUrl: "https://www.youtube.com/watch?v=eQTGhP0EIhU",
  },
];

/** YYYY-MM */
export function contestMonthKey(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

/** @deprecated 월 키와 동일하게 사용 */
export function contestDateKey(d = new Date()) {
  return contestMonthKey(d);
}

export function getContestYoutubeUrl(song: ContestSong) {
  if (song.youtubeUrl) return song.youtubeUrl;
  const q = encodeURIComponent(`${song.artist} ${song.songTitle} official MV`);
  return `https://www.youtube.com/results?search_query=${q}`;
}

/** 이번 달 고정 곡 */
export function getMonthsContestSong(d = new Date()): ContestSong & {
  monthKey: string;
  dateKey: string;
} {
  const monthKey = contestMonthKey(d);
  const monthIndex = d.getFullYear() * 12 + d.getMonth();
  const song = CONTEST_SONG_CATALOG[monthIndex % CONTEST_SONG_CATALOG.length];
  return { ...song, monthKey, dateKey: monthKey };
}

/** 하위 호환 별칭 */
export function getTodaysContestSong(d = new Date()) {
  return getMonthsContestSong(d);
}

export function formatContestMonthLabel(monthKey: string) {
  const [y, m] = monthKey.split("-");
  return `${y}년 ${Number(m)}월`;
}

/** @deprecated */
export function formatContestDateLabel(dateKey: string) {
  if (/^\d{4}-\d{2}$/.test(dateKey)) return formatContestMonthLabel(dateKey);
  const [, m, day] = dateKey.split("-");
  return `${Number(m)}월 ${Number(day)}일`;
}
