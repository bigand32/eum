"use client";

import { useEffect, useRef } from "react";
import { AppImage } from "@/components/AppImage";
import type { ContestEntry } from "@/lib/contest/storage";
import { hasHearted } from "@/lib/contest/storage";
import { contestThumbUrl } from "@/components/ContestRankCircles";

type Props = {
  entry: ContestEntry;
  studentId: string;
  onHeart: (entryId: string) => void;
  onOpen: (entry: ContestEntry) => void;
};

function MediaThumb({ entry }: { entry: ContestEntry }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const demoThumb = contestThumbUrl(entry);

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    el.currentTime = 0.1;
  }, [entry.mediaUrl]);

  if (demoThumb) {
    return (
      <>
        <AppImage
          src={demoThumb}
          alt=""
          fill
          className="object-cover"
          sizes="(max-width: 430px) 50vw, 200px"
        />
        <span className="absolute inset-0 flex items-center justify-center">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-black/45 text-white backdrop-blur-sm">
            <i
              className={`fa-solid ${entry.mediaType === "video" ? "fa-play" : "fa-music"} text-[14px]`}
            />
          </span>
        </span>
      </>
    );
  }

  if (entry.mediaType === "video") {
    return (
      <>
        <video
          ref={videoRef}
          src={entry.mediaUrl}
          muted
          playsInline
          preload="metadata"
          className="absolute inset-0 h-full w-full object-cover"
        />
        <span className="absolute inset-0 flex items-center justify-center">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-black/45 text-white backdrop-blur-sm">
            <i className="fa-solid fa-play text-[14px]" />
          </span>
        </span>
      </>
    );
  }

  return (
    <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-gray-700 to-gray-900">
      <i className="fa-solid fa-music text-[28px] text-white/80" />
    </div>
  );
}

export function ContestEntryCard({ entry, studentId, onHeart, onOpen }: Props) {
  const liked = hasHearted(entry, studentId);
  const isMine = entry.studentId === studentId;

  return (
    <article className="relative aspect-[4/5] overflow-hidden rounded-[20px] bg-gray-900 shadow-soft">
      <button
        type="button"
        onClick={() => onOpen(entry)}
        className="absolute inset-0"
        aria-label={`${entry.nickname} 출품작 보기`}
      >
        <span className="absolute inset-0">
          <MediaThumb entry={entry} />
        </span>
        <span className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/15 to-transparent" />
      </button>

      <button
        type="button"
        disabled={isMine || !studentId}
        onClick={() => onHeart(entry.id)}
        className={`absolute top-3 right-3 z-10 inline-flex items-center gap-1 rounded-full px-2.5 py-1.5 text-[12px] font-bold backdrop-blur-md transition disabled:opacity-40 ${
          liked ? "bg-rose-500/90 text-white" : "bg-black/35 text-white"
        }`}
        aria-label="하트"
      >
        <i className={`fa-${liked ? "solid" : "regular"} fa-heart`} />
        {entry.heartCount}
      </button>

      <button
        type="button"
        onClick={() => onOpen(entry)}
        className="absolute right-3 bottom-3 left-3 z-10 flex items-center gap-2.5 text-left"
      >
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-500 text-[13px] font-extrabold text-white ring-2 ring-white">
          {entry.nickname.slice(0, 1)}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[14px] font-extrabold text-white">{entry.nickname}</p>
          {entry.instagram ? (
            <p className="truncate text-[12px] font-semibold text-white/75">@{entry.instagram}</p>
          ) : (
            <p className="truncate text-[12px] font-medium text-white/55">출품작 보기</p>
          )}
        </div>
      </button>
    </article>
  );
}
