"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { ReviewForm } from "@/components/ReviewForm";
import { TimestampComments } from "@/components/TimestampComments";
import { useStudentId } from "@/lib/auth/use-student-id";
import { loadFeedbackOrder } from "@/lib/db/api";
import { useDb } from "@/lib/db/use-db";
import type { FeedbackOrder } from "@/lib/db/schema";
import { useMediaPlayer } from "@/lib/use-media-player";

export function FeedbackView({ orderId }: { orderId: string }) {
  const searchParams = useSearchParams();
  const db = useDb();
  const studentId = useStudentId();
  const justSubmitted = searchParams.get("submitted") === "1";
  const [order, setOrder] = useState<FeedbackOrder | null>(null);
  const [reviewDone, setReviewDone] = useState(false);

  const fallbackDuration = order?.mediaDurationSec ?? 105;
  const { currentTime, duration, playing, togglePlay, seekTo } = useMediaPlayer(
    order?.mediaUrl,
    fallbackDuration,
  );

  useEffect(() => {
    void loadFeedbackOrder(orderId).then((o) => setOrder(o ?? null));
    const handler = () => {
      void loadFeedbackOrder(orderId).then((o) => setOrder(o ?? null));
    };
    window.addEventListener("eum-db-updated", handler);
    return () => window.removeEventListener("eum-db-updated", handler);
  }, [orderId]);

  if (!order) {
    return (
      <main className="p-6 text-center text-gray-500">
        피드백을 찾을 수 없어요.
        <Link href="/reservation" className="mt-4 block text-brand-500">
          예약 내역으로
        </Link>
      </main>
    );
  }

  const master = db.masters.find((m) => m.id === order.masterId);
  const isWaiting = order.status === "paid" || order.status === "in_review";
  const comments = order.timestampComments;
  const hasReview = db.studentReviews.some(
    (r) => r.studentId === studentId && r.masterId === order.masterId && r.productLabel.includes("피드백"),
  );
  const showReviewForm = !isWaiting && !hasReview && !reviewDone;

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-50 flex items-center gap-3 border-b border-gray-100 bg-white/90 px-5 py-4 backdrop-blur-md">
        <Link href="/reservation" className="text-xl text-gray-800">
          <i className="fa-solid fa-chevron-left" />
        </Link>
        <img src={master?.avatarUrl} alt="" className="h-9 w-9 rounded-full object-cover" />
        <div className="flex-1">
          <div className="text-[15px] font-bold">{master?.title}</div>
          <div className="text-[11px] text-gray-500">
            {isWaiting ? "피드백 대기 중" : "피드백 완료"}
          </div>
        </div>
      </header>

      <main className="flex flex-1 flex-col gap-4 overflow-y-auto p-4 pb-24">
        {justSubmitted && (
          <div className="rounded-xl border border-brand-100 bg-brand-50 p-4 text-center text-[13px] font-medium text-brand-600">
            요청이 접수됐어요! 결제가 완료됐어요. 마스터가 피드백을 작성하면 알려드릴게요.
          </div>
        )}

        <div className="flex flex-col items-end gap-1">
          <div className="max-w-[80%] rounded-2xl rounded-tr-sm bg-brand-500 p-3 text-[14px] text-white">
            {order.studentMessage}
          </div>
          <div className="w-full max-w-[280px] rounded-2xl rounded-tr-sm border border-brand-100 bg-brand-50 p-3">
            <div className="mb-2 flex items-center gap-3">
              <button
                type="button"
                onClick={togglePlay}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-500 text-white"
              >
                <i
                  className={`fa-solid ${playing ? "fa-pause" : "fa-play"} text-[12px] ${playing ? "" : "ml-0.5"}`}
                />
              </button>
              <div
                className="h-1.5 flex-1 cursor-pointer overflow-hidden rounded-full bg-brand-200"
                onClick={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  seekTo(Math.floor(((e.clientX - rect.left) / rect.width) * duration));
                }}
                onKeyDown={() => {}}
                role="slider"
                tabIndex={0}
              >
                <div
                  className="h-full bg-brand-500"
                  style={{ width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%` }}
                />
              </div>
              <span className="shrink-0 text-[11px] font-semibold text-brand-600 tabular-nums">
                {Math.floor(currentTime / 60)}:{String(Math.floor(currentTime % 60)).padStart(2, "0")}
              </span>
            </div>
            <p className="text-[11px] font-medium text-brand-400">내 녹음 · {order.mediaLabel}</p>
          </div>
        </div>

        {isWaiting ? (
          <div className="mt-6 rounded-[20px] border border-gray-100 bg-white p-6 text-center">
            <i className="fa-solid fa-hourglass-half mb-3 text-2xl text-gray-300" />
            <p className="text-[15px] font-bold text-gray-900">마스터 피드백 작성 중</p>
            <p className="mt-1 text-[13px] text-gray-500">완료되면 구간별 코멘트를 확인할 수 있어요</p>
          </div>
        ) : (
          <div className="flex gap-2">
            <img src={master?.avatarUrl} alt="" className="mb-5 h-8 w-8 rounded-full" />
            <div className="flex max-w-[85%] flex-col gap-2">
              {order.masterSummary && (
                <div className="shadow-sm rounded-2xl rounded-tl-sm border border-gray-200 bg-white p-3.5 text-[14px] leading-relaxed">
                  {order.masterSummary}
                </div>
              )}
              {comments.length > 0 && (
                <TimestampComments
                  comments={comments}
                  currentTime={currentTime}
                  onSeek={(t) => {
                    seekTo(t);
                    if (!playing) togglePlay();
                  }}
                />
              )}
              <div className="grid grid-cols-3 gap-1.5 pt-2">
                <Link
                  href={`/masters/${order.masterId}/feedback`}
                  className="rounded-lg border border-gray-200 bg-white px-2 py-2 text-center text-[11px] font-bold leading-tight text-gray-700"
                >
                  추가 피드백
                </Link>
                <Link
                  href={`/masters/${order.masterId}/reservation?type=phone`}
                  className="rounded-lg border border-brand-200 bg-brand-50 px-2 py-2 text-center text-[11px] font-bold leading-tight text-brand-600"
                >
                  전화 상담
                </Link>
                <Link
                  href={`/masters/${order.masterId}/reservation?type=visit`}
                  className="rounded-lg border border-brand-200 bg-brand-50 px-2 py-2 text-center text-[11px] font-bold leading-tight text-brand-600"
                >
                  방문 상담
                </Link>
              </div>
            </div>
          </div>
        )}

        {showReviewForm && (
          <ReviewForm
            studentId={studentId}
            masterId={order.masterId}
            productLabel={`음성/영상 피드백 · ${order.mediaLabel}`}
            onDone={() => setReviewDone(true)}
          />
        )}
      </main>
    </div>
  );
}
