"use client";

import type { ContestEntry } from "@/lib/contest/storage";
import { hasHearted } from "@/lib/contest/storage";

type Props = {
  entry: ContestEntry;
  studentId: string;
  onHeart: (entryId: string) => void;
  onClose: () => void;
};

export function ContestEntryPopup({ entry, studentId, onHeart, onClose }: Props) {
  const liked = hasHearted(entry, studentId);
  const isMine = entry.studentId === studentId;
  const isDemo = entry.mediaUrl.startsWith("demo:");

  return (
    <div
      className="fixed inset-0 z-[80] flex items-end justify-center bg-black/45 px-4 pb-8 sm:items-center"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="w-full max-w-[400px] rounded-[24px] bg-white p-5 shadow-soft"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label={`${entry.nickname} 출품작`}
      >
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-brand-500 text-[16px] font-extrabold text-white">
            {entry.nickname.slice(0, 1)}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[16px] font-extrabold text-gray-900">{entry.nickname}</p>
            {entry.instagram ? (
              <a
                href={`https://instagram.com/${entry.instagram}`}
                target="_blank"
                rel="noreferrer"
                className="text-[13px] font-semibold text-brand-500"
              >
                @{entry.instagram}
              </a>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-50 text-gray-500"
            aria-label="닫기"
          >
            <i className="fa-solid fa-xmark text-[14px]" />
          </button>
        </div>

        {entry.intro ? (
          <p className="mt-3 text-[14px] leading-relaxed text-gray-600">{entry.intro}</p>
        ) : null}

        <div className="mt-4 overflow-hidden rounded-[16px] bg-gray-50">
          {isDemo ? (
            <div className="flex flex-col items-center gap-2 px-4 py-10 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-50 text-brand-500">
                <i
                  className={`fa-solid ${entry.mediaType === "video" ? "fa-video" : "fa-music"} text-[20px]`}
                />
              </div>
              <p className="text-[14px] font-bold text-gray-800">
                {entry.mediaType === "video" ? "데모 영상" : "데모 음원"}
              </p>
              <p className="text-[12px] text-gray-400">미리보기용 테스트 출품작</p>
            </div>
          ) : entry.mediaType === "video" ? (
            <video
              src={entry.mediaUrl}
              controls
              playsInline
              autoPlay
              className="max-h-[320px] w-full bg-black object-contain"
            />
          ) : (
            <div className="px-4 py-5">
              <div className="mb-3 flex items-center gap-2 text-[13px] font-bold text-gray-700">
                <i className="fa-solid fa-music text-brand-500" />
                음원
              </div>
              <audio src={entry.mediaUrl} controls autoPlay className="w-full" />
            </div>
          )}
        </div>

        <div className="mt-4 flex items-center justify-between">
          <p className="text-[12px] font-medium text-gray-400">
            {entry.songTitle} · {entry.artist}
          </p>
          <button
            type="button"
            disabled={isMine || !studentId}
            onClick={() => onHeart(entry.id)}
            className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-[13px] font-bold transition disabled:opacity-40 ${
              liked
                ? "bg-rose-50 text-rose-500"
                : "bg-gray-50 text-gray-600 active:bg-rose-50 active:text-rose-500"
            }`}
            aria-label="하트"
          >
            <i className={`fa-${liked ? "solid" : "regular"} fa-heart`} />
            {entry.heartCount}
          </button>
        </div>
      </div>
    </div>
  );
}
