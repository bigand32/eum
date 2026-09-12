"use client";

import type { ContestEntry } from "@/lib/contest/storage";

const AVATAR_TONES = [
  "from-brand-400 to-brand-600",
  "from-violet-400 to-brand-500",
  "from-fuchsia-400 to-brand-500",
  "from-indigo-400 to-brand-600",
] as const;

export function contestAvatarTone(name: string) {
  let n = 0;
  for (let i = 0; i < name.length; i++) n += name.charCodeAt(i);
  return AVATAR_TONES[n % AVATAR_TONES.length];
}

/** 데모 출품용 썸네일 (실제 업로드 전 미리보기) */
const DEMO_THUMBS = [
  "https://images.unsplash.com/photo-1516280440614-6697288d5d38?w=600&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=600&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1514320291840-3092121d7899?w=600&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=600&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1459749411175-047f1d0b7e11?w=600&auto=format&fit=crop",
];

export function contestThumbUrl(entry: ContestEntry) {
  if (!entry.mediaUrl.startsWith("demo:")) return null;
  let n = 0;
  for (let i = 0; i < entry.id.length; i++) n += entry.id.charCodeAt(i);
  return DEMO_THUMBS[n % DEMO_THUMBS.length];
}

type CircleProps = {
  entries: ContestEntry[];
  onSelect: (entry: ContestEntry) => void;
};

/** TOP 3 — 2위 · 1위 · 3위, 1위만 더 위·크게 */
export function ContestRankCircles({ entries, onSelect }: CircleProps) {
  const first = entries[0];
  const second = entries[1];
  const third = entries[2];
  if (!first) return null;

  const slots: { entry: ContestEntry; rank: 1 | 2 | 3 }[] = [
    ...(second ? [{ entry: second, rank: 2 as const }] : []),
    { entry: first, rank: 1 },
    ...(third ? [{ entry: third, rank: 3 as const }] : []),
  ];

  return (
    <div className="flex items-end justify-around gap-1 rounded-[24px] bg-white px-2 pb-5 pt-4 shadow-soft">
      {slots.map(({ entry, rank }) => {
        const isFirst = rank === 1;
        return (
          <button
            key={entry.id}
            type="button"
            onClick={() => onSelect(entry)}
            className={`flex w-[30%] flex-col items-center text-center active:opacity-90 ${
              isFirst ? "-translate-y-3" : ""
            }`}
          >
            <span
              className={`mb-2 font-bold text-brand-500 ${
                isFirst ? "text-[13px]" : "text-[11px]"
              }`}
            >
              #{rank}
            </span>
            <div
              className={`flex items-center justify-center rounded-full bg-gradient-to-br ${contestAvatarTone(
                entry.nickname,
              )} font-extrabold text-white shadow-[0_8px_20px_rgba(68,1,169,0.16)] ${
                isFirst
                  ? "h-[88px] w-[88px] text-[30px] ring-[3px] ring-brand-200"
                  : "h-[68px] w-[68px] text-[24px] ring-[3px] ring-brand-50"
              }`}
            >
              {entry.nickname.slice(0, 1)}
            </div>
            <p
              className={`mt-2.5 w-full truncate font-extrabold text-gray-900 ${
                isFirst ? "text-[14px]" : "text-[13px]"
              }`}
            >
              {entry.nickname}
            </p>
            {entry.instagram ? (
              <p className="mt-0.5 w-full truncate text-[11px] font-semibold text-gray-400">
                @{entry.instagram}
              </p>
            ) : (
              <p className="mt-0.5 text-[11px] font-medium text-gray-300">—</p>
            )}
          </button>
        );
      })}
    </div>
  );
}
