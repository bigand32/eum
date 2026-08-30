"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { TimestampComment } from "@/lib/db/schema";
import { DEFAULT_COMMENTS, STORAGE_KEY } from "@/lib/timestamp-comments";
import { formatTime } from "@/lib/timestamp-comments";

type TimestampCommentsProps = {
  comments?: TimestampComment[];
  onSeek?: (time: number) => void;
  currentTime?: number;
  compact?: boolean;
};

export function TimestampComments({
  comments: commentsProp,
  onSeek,
  currentTime = 0,
  compact = false,
}: TimestampCommentsProps) {
  const [comments, setComments] = useState<TimestampComment[]>(commentsProp ?? DEFAULT_COMMENTS);

  useEffect(() => {
    if (commentsProp) {
      setComments(commentsProp);
      return;
    }
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) setComments(JSON.parse(saved) as TimestampComment[]);
    } catch {
      setComments(DEFAULT_COMMENTS);
    }
  }, [commentsProp]);

  const sorted = [...comments].sort((a, b) => a.time - b.time);

  return (
    <div
      className={`rounded-[16px] border border-gray-100 bg-surface ${
        compact ? "p-3" : "shadow-soft p-3.5"
      }`}
    >
      <p className="mb-2.5 text-[11px] font-bold tracking-wide text-gray-400">구간별 피드백</p>
      <div className="flex flex-col gap-1.5">
        {sorted.map((c) => {
          const active = Math.abs(currentTime - c.time) < 2;
          const clickable = Boolean(onSeek);

          const row = (
            <>
              <span
                className={`ts-comment__time shrink-0 rounded-md px-2 py-0.5 text-[11px] font-bold tabular-nums ${
                  active ? "bg-brand-500 text-white" : "bg-white text-brand-500"
                }`}
              >
                {formatTime(c.time)}
              </span>
              <span
                className={`ts-comment__text text-[13px] leading-relaxed ${
                  active ? "font-semibold text-gray-900" : "text-gray-700"
                }`}
              >
                {c.text}
              </span>
            </>
          );

          if (!clickable) {
            return (
              <div key={`${c.time}-${c.text}`} className="flex items-start gap-2.5 py-1">
                {row}
              </div>
            );
          }

          return (
            <button
              key={`${c.time}-${c.text}`}
              type="button"
              onClick={() => onSeek?.(c.time)}
              className={`ts-comment flex w-full items-start gap-2.5 rounded-xl px-2 py-2 text-left transition-colors ${
                active ? "bg-white shadow-sm ring-1 ring-brand-100" : "hover:bg-white/70"
              }`}
            >
              {row}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function useAudioPlayer(duration: number) {
  const [currentTime, setCurrentTime] = useState(0);
  const [playing, setPlaying] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
  }, []);

  const togglePlay = useCallback(() => {
    setPlaying((prev) => {
      if (prev) {
        stopTimer();
        return false;
      }
      timerRef.current = setInterval(() => {
        setCurrentTime((t) => {
          if (t + 1 >= duration) {
            stopTimer();
            setPlaying(false);
            return duration;
          }
          return t + 1;
        });
      }, 1000);
      return true;
    });
  }, [duration, stopTimer]);

  const seekTo = useCallback(
    (seconds: number) => {
      setCurrentTime(Math.min(duration, Math.max(0, seconds)));
    },
    [duration],
  );

  useEffect(() => () => stopTimer(), [stopTimer]);

  return { currentTime, playing, togglePlay, seekTo };
}
