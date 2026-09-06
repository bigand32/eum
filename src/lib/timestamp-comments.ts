export type TimestampComment = {
  time: number;
  text: string;
};

export const DEFAULT_COMMENTS: TimestampComment[] = [
  { time: 12, text: "인트로 — 후두가 살짝 올라가 있어요." },
  { time: 45, text: "고음 진입 — 배 압력이 풀려요." },
];

export function formatTime(seconds: number) {
  const sec = Math.max(0, Math.floor(seconds));
  return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, "0")}`;
}
