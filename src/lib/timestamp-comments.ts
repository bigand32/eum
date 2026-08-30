export type TimestampComment = {
  time: number;
  text: string;
};

export const STORAGE_KEY = "eum_timestamp_comments";

export const DEFAULT_COMMENTS: TimestampComment[] = [
  { time: 12, text: "인트로 — 후두가 살짝 올라가 있어요." },
  { time: 45, text: "고음 진입 — 배 압력이 풀려요." },
];

export function formatTime(seconds: number) {
  const sec = Math.max(0, Math.floor(seconds));
  return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, "0")}`;
}

export function saveComments(comments: TimestampComment[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(comments));
}

export function loadComments(): TimestampComment[] {
  if (typeof window === "undefined") return DEFAULT_COMMENTS;
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? (JSON.parse(saved) as TimestampComment[]) : DEFAULT_COMMENTS;
  } catch {
    return DEFAULT_COMMENTS;
  }
}
