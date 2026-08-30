"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { loadFeedbackOrder, markFeedbackInReview, saveCompletedFeedbackOrder } from "@/lib/db/api";
import { useDb } from "@/lib/db/use-db";
import type { FeedbackOrder } from "@/lib/db/schema";
import { getStudentName } from "@/lib/master-utils";
import { TimestampComment, formatTime } from "@/lib/timestamp-comments";
import { useMediaPlayer } from "@/lib/use-media-player";

export function MasterFeedbackEditor({ orderId }: { orderId: string }) {
  const router = useRouter();
  const db = useDb();
  const [order, setOrder] = useState<FeedbackOrder | null>(null);
  const [comments, setComments] = useState<TimestampComment[]>([]);
  const [pendingTime, setPendingTime] = useState<number | null>(null);
  const [commentText, setCommentText] = useState("");
  const [showForm, setShowForm] = useState(false);

  const fallbackDuration = order?.mediaDurationSec ?? 105;
  const { currentTime, duration, playing, togglePlay, seekTo } = useMediaPlayer(
    order?.mediaUrl,
    fallbackDuration,
  );

  useEffect(() => {
    void loadFeedbackOrder(orderId).then((o) => {
      setOrder(o ?? null);
      if (o?.timestampComments.length) setComments(o.timestampComments);
      if (o?.status === "paid") void markFeedbackInReview(orderId);
    });
    const handler = () => {
      void loadFeedbackOrder(orderId).then((o) => setOrder(o ?? null));
    };
    window.addEventListener("eum-db-updated", handler);
    return () => window.removeEventListener("eum-db-updated", handler);
  }, [orderId]);

  if (!order) {
    return (
      <main className="p-6 text-center text-gray-500">
        <p>주문을 찾을 수 없어요.</p>
        <Link href="/master" className="mt-4 inline-block text-brand-500">
          마스터 홈으로
        </Link>
      </main>
    );
  }

  const studentName = getStudentName(db, order.studentId);
  const sorted = [...comments].sort((a, b) => a.time - b.time);

  const submitFeedback = async () => {
    await saveCompletedFeedbackOrder(orderId, {
      timestampComments: sorted,
      masterSummary: "녹음본 잘 들었습니다. 구간별 코멘트를 확인해 주세요!",
    });
    alert(`피드백 ${sorted.length}개를 전송했어요!`);
    router.push(`/feedback/${orderId}`);
  };

  return (
    <>
      <header className="sticky top-0 z-50 flex items-center gap-3 border-b border-gray-100 bg-white/90 px-5 py-4 backdrop-blur-md">
        <Link href="/master" className="text-xl text-gray-800">
          <i className="fa-solid fa-chevron-left" />
        </Link>
        <div className="flex-1">
          <div className="text-[15px] font-bold">구간별 피드백 작성</div>
          <div className="text-[11px] text-gray-500">
            {studentName} 수강생 · {order.mediaLabel}
          </div>
        </div>
      </header>

      <main className="flex flex-col gap-5 px-5 pt-5 pb-28">
        <div className="shadow-soft rounded-[20px] border border-gray-100 bg-white p-4">
          <p className="text-[13px] leading-relaxed text-gray-600">
            &quot;{order.studentMessage}&quot;
          </p>
        </div>

        <div className="shadow-soft rounded-[20px] border border-gray-100 bg-white p-5">
          <div className="mb-4 flex items-center gap-3">
            <button
              type="button"
              onClick={togglePlay}
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-master-500 text-white shadow-sm"
            >
              <i
                className={`fa-solid ${playing ? "fa-pause" : "fa-play"} text-[14px] ${playing ? "" : "ml-0.5"}`}
              />
            </button>
            <div className="flex-1">
              <p className="text-[14px] font-bold text-gray-900">수강생 녹음본</p>
              <p className="tabular-nums text-[12px] text-gray-500">
                {formatTime(currentTime)} / {formatTime(duration)}
              </p>
            </div>
          </div>
          <div
            className="relative mb-1 h-2 cursor-pointer rounded-full bg-surface"
            onClick={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              seekTo(Math.floor(((e.clientX - rect.left) / rect.width) * duration));
            }}
            onKeyDown={() => {}}
            role="slider"
            tabIndex={0}
          >
            <div
              className="h-full rounded-full bg-master-500 transition-all duration-150"
              style={{ width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%` }}
            />
            {sorted.map((c) => (
              <div
                key={`${c.time}-${c.text}`}
                className="marker absolute top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-yellow-400 shadow"
                style={{ left: `${duration > 0 ? (c.time / duration) * 100 : 0}%` }}
              />
            ))}
          </div>
          <button
            type="button"
            onClick={() => {
              if (playing) togglePlay();
              setPendingTime(currentTime);
              setCommentText("");
              setShowForm(true);
            }}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-master-500/40 py-3 text-[14px] font-bold text-master-500 transition hover:bg-indigo-50"
          >
            <i className="fa-solid fa-location-dot" />
            여기에 코멘트
            <span className="rounded-md bg-indigo-100 px-2 py-0.5 text-[13px] font-semibold tabular-nums">
              {formatTime(currentTime)}
            </span>
          </button>
        </div>

        {showForm && (
          <div className="rounded-[20px] border border-indigo-100 bg-indigo-50 p-4">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-[13px] font-bold text-master-500">
                <i className="fa-solid fa-clock mr-1" />
                <span className="tabular-nums">{formatTime(pendingTime ?? 0)}</span> 구간
              </span>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="text-sm text-gray-400 hover:text-gray-600"
                aria-label="닫기"
              >
                <i className="fa-solid fa-xmark" />
              </button>
            </div>
            <textarea
              rows={3}
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder="이 구간에 대한 피드백을 적어 주세요"
              className="w-full resize-none rounded-xl border border-gray-200 bg-white p-3 text-[14px] outline-none placeholder:text-gray-400 focus:border-master-500"
            />
            <button
              type="button"
              onClick={() => {
                const text = commentText.trim();
                if (!text || pendingTime === null) return;
                setComments((prev) => [...prev, { time: pendingTime, text }]);
                setShowForm(false);
              }}
              className="mt-3 w-full rounded-xl bg-gray-900 py-3 text-[14px] font-bold text-white transition hover:bg-gray-800"
            >
              코멘트 추가
            </button>
          </div>
        )}

        <div className="shadow-soft rounded-[20px] bg-gray-900 p-4">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-[12px] font-bold tracking-wide text-gray-400">작성한 구간별 코멘트</p>
            <span className="text-[11px] font-bold text-gray-500">{sorted.length}개</span>
          </div>
          {sorted.length === 0 ? (
            <p className="py-4 text-center text-[13px] text-gray-500">
              재생 중 원하는 위치에서
              <br />「여기에 코멘트」를 눌러 주세요
            </p>
          ) : (
            <div className="flex min-h-[60px] flex-col gap-1">
              {sorted.map((c) => (
                <div key={`${c.time}-${c.text}`} className="group flex items-start gap-3 py-2">
                  <button
                    type="button"
                    onClick={() => seekTo(c.time)}
                    className="shrink-0 rounded bg-sky-950 px-2 py-0.5 text-[12px] font-bold text-sky-400 tabular-nums transition hover:bg-sky-900"
                  >
                    {formatTime(c.time)}
                  </button>
                  <p className="flex-1 text-[13px] leading-snug text-gray-300">{c.text}</p>
                  <button
                    type="button"
                    onClick={() =>
                      setComments((prev) =>
                        prev.filter((item) => !(item.time === c.time && item.text === c.text)),
                      )
                    }
                    className="shrink-0 p-1 text-gray-600 opacity-0 transition group-hover:opacity-100 hover:text-red-400"
                    aria-label="삭제"
                  >
                    <i className="fa-solid fa-trash-can text-[11px]" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <button
          type="button"
          disabled={sorted.length === 0}
          onClick={() => void submitFeedback()}
          className="w-full rounded-xl bg-master-500 py-4 text-[15px] font-bold text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-40"
        >
          피드백 전송하기
        </button>
      </main>
    </>
  );
}
