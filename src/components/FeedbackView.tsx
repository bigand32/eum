"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ReviewForm } from "@/components/ReviewForm";
import { TimestampComments } from "@/components/TimestampComments";
import { PackagePurchaseControls } from "@/components/PackagePurchaseControls";
import { useStudentId } from "@/lib/auth/use-student-id";
import { loadFeedbackOrder } from "@/lib/db/api";
import { useDb } from "@/lib/db/use-db";
import type { FeedbackOrder } from "@/lib/db/schema";
import { PACKAGE_LEVEL_LABEL } from "@/lib/db/schema";
import {
  formatFeedbackMediaLabel,
  formatMediaDuration,
  isFeedbackVideo,
} from "@/lib/feedback-pricing";
import { useMediaPlayer } from "@/lib/use-media-player";

export function FeedbackView({ orderId }: { orderId: string }) {
  const searchParams = useSearchParams();
  const db = useDb();
  const studentId = useStudentId();
  const justSubmitted = searchParams.get("submitted") === "1";
  const [order, setOrder] = useState<FeedbackOrder | null>(null);
  const [reviewDone, setReviewDone] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoTime, setVideoTime] = useState(0);

  const isVideo = order ? isFeedbackVideo(order) : false;
  const fallbackDuration = order?.mediaDurationSec ?? 105;
  const { currentTime: audioTime, duration, playing, togglePlay, seekTo: seekAudio } =
    useMediaPlayer(isVideo ? undefined : order?.mediaUrl, fallbackDuration);
  const currentTime = isVideo ? videoTime : audioTime;

  const seekTo = (seconds: number) => {
    if (isVideo && videoRef.current) {
      videoRef.current.currentTime = seconds;
      setVideoTime(seconds);
      void videoRef.current.play();
      return;
    }
    seekAudio(seconds);
  };

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
  const recommendedPackage = order.recommendedPackageId
    ? db.masterPackages.find((p) => p.id === order.recommendedPackageId)
    : undefined;
  const isWaiting = order.status === "paid" || order.status === "in_review";
  const comments = order.timestampComments;
  const hasReview = db.studentReviews.some(
    (r) => r.studentId === studentId && r.masterId === order.masterId && r.productLabel.includes("피드백"),
  );
  const showReviewForm = !isWaiting && !hasReview && !reviewDone;

  return (
    <div className="flex h-dvh max-h-dvh flex-col overflow-hidden bg-white">
      <header className="z-50 flex shrink-0 items-center gap-3 border-b border-gray-100 bg-white px-5 py-3">
        <Link href="/reservation" className="text-xl text-gray-800">
          <i className="fa-solid fa-chevron-left" />
        </Link>
        <img src={master?.avatarUrl} alt="" className="h-9 w-9 rounded-full object-cover" />
        <div className="min-w-0 flex-1">
          <div className="truncate text-[15px] font-bold">{master?.title}</div>
          <div className="text-[11px] text-gray-500">
            {isWaiting ? "피드백 대기 중" : "피드백 완료"}
          </div>
        </div>
      </header>

      {/* 영상/음원 고정 — 유튜브·릴스처럼 위에 고정 */}
      <div className="shrink-0 border-b border-gray-100 bg-black">
        {isVideo && order.mediaUrl ? (
          <video
            ref={videoRef}
            src={order.mediaUrl}
            controls
            playsInline
            preload="metadata"
            className="aspect-video w-full bg-black"
            onTimeUpdate={(e) => setVideoTime(e.currentTarget.currentTime)}
          />
        ) : (
          <div className="bg-gray-950 px-5 py-4">
            <div className="mb-2 flex items-center gap-3">
              <button
                type="button"
                onClick={togglePlay}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-500 text-white"
              >
                <i
                  className={`fa-solid ${playing ? "fa-pause" : "fa-play"} text-[12px] ${playing ? "" : "ml-0.5"}`}
                />
              </button>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-bold text-white">
                  {formatFeedbackMediaLabel(order.mediaLabel, false)}
                </p>
                <p className="text-[11px] text-white/50 tabular-nums">
                  {Math.floor(currentTime / 60)}:
                  {String(Math.floor(currentTime % 60)).padStart(2, "0")}
                  {" / "}
                  {Math.floor(duration / 60)}:
                  {String(Math.floor(duration % 60)).padStart(2, "0")}
                </p>
              </div>
            </div>
            <div
              className="h-1.5 cursor-pointer overflow-hidden rounded-full bg-white/20"
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
          </div>
        )}
      </div>

      {/* 채팅·코멘트만 스크롤 */}
      <main className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto overscroll-contain px-4 py-4 pb-10">
        {justSubmitted && (
          <div className="rounded-xl border border-brand-100 bg-brand-50 p-4 text-center text-[13px] font-medium text-brand-600">
            요청이 접수됐어요! 결제가 완료됐어요. 마스터가 피드백을 작성하면 알려드릴게요.
          </div>
        )}

        <div className="flex flex-col items-end gap-1">
          <div className="max-w-[85%] rounded-2xl rounded-tr-sm bg-brand-500 px-3.5 py-3 text-[14px] text-white">
            {order.studentMessage}
          </div>
          <p className="px-1 text-[11px] text-gray-400">
            {formatFeedbackMediaLabel(order.mediaLabel, isVideo)}
          </p>
        </div>

        {isWaiting ? (
          <div className="mt-2 rounded-[20px] border border-gray-100 bg-white p-6 text-center">
            <i className="fa-solid fa-hourglass-half mb-3 text-2xl text-gray-300" />
            <p className="text-[15px] font-bold text-gray-900">마스터 피드백 작성 중</p>
            <p className="mt-1 text-[13px] text-gray-500">완료되면 코멘트를 확인할 수 있어요</p>
          </div>
        ) : (
          <div className="flex gap-2">
            <img src={master?.avatarUrl} alt="" className="h-8 w-8 shrink-0 rounded-full object-cover" />
            <div className="flex min-w-0 max-w-[85%] flex-col gap-2">
              {order.masterSummary && (
                <div className="rounded-2xl rounded-tl-sm border border-gray-200 bg-white p-3.5 text-[14px] leading-relaxed shadow-sm">
                  {order.masterSummary}
                </div>
              )}
              {order.replyMediaUrl ? (
                <div className="overflow-hidden rounded-2xl rounded-tl-sm border border-gray-200 bg-white shadow-sm">
                  <div className="border-b border-gray-100 bg-surface px-3.5 py-2">
                    <p className="text-[11px] font-bold text-gray-500">
                      마스터 {order.replyMediaType === "audio" ? "음성" : "영상"} 답변
                      {order.replyMediaLabel ? ` · ${order.replyMediaLabel}` : ""}
                    </p>
                  </div>
                  {order.replyMediaType === "video" ||
                  (!order.replyMediaType && /\.(mp4|mov|m4v|webm)(\?|#|$)/i.test(order.replyMediaUrl)) ? (
                    <video
                      src={order.replyMediaUrl}
                      controls
                      playsInline
                      preload="metadata"
                      className="aspect-video w-full bg-black"
                    />
                  ) : (
                    <div className="px-3.5 py-3">
                      <audio src={order.replyMediaUrl} controls className="w-full" />
                    </div>
                  )}
                </div>
              ) : null}
              {comments.length > 0 && (
                <TimestampComments
                  comments={comments}
                  currentTime={currentTime}
                  onSeek={(t) => {
                    seekTo(t);
                    if (!isVideo && !playing) togglePlay();
                  }}
                />
              )}
              {recommendedPackage && (
                <div className="overflow-hidden rounded-2xl rounded-tl-sm border border-brand-100 bg-white shadow-sm">
                  <div className="bg-brand-50 px-4 py-3">
                    <p className="text-[11px] font-bold tracking-wide text-brand-500">
                      마스터 추천 온라인 강의
                    </p>
                    <div className="mt-1 flex items-center gap-2">
                      <span className="rounded-md bg-gray-900 px-1.5 py-0.5 text-[10px] font-bold text-white">
                        {PACKAGE_LEVEL_LABEL[recommendedPackage.level]}
                      </span>
                      <span className="text-[14px] font-bold text-gray-900">
                        {recommendedPackage.title}
                      </span>
                    </div>
                  </div>
                  <div className="space-y-1.5 px-4 py-3">
                    {recommendedPackage.weeks.length === 0 ? (
                      <p className="text-[12px] text-gray-500">커리큘럼은 구매 후 확인할 수 있어요</p>
                    ) : (
                      recommendedPackage.weeks.slice(0, 3).map((week) => (
                      <div key={week.week} className="flex items-center gap-2 text-[12px] text-gray-600">
                        <span className="font-bold text-gray-400">{week.week}주</span>
                        <span className="flex-1 truncate">{week.title}</span>
                        <span className="tabular-nums text-gray-400">
                          {week.durationSec > 0
                            ? formatMediaDuration(week.durationSec)
                            : ""}
                        </span>
                      </div>
                      ))
                    )}
                    {recommendedPackage.weeks.length > 3 && (
                      <p className="text-[11px] text-gray-400">
                        외 {recommendedPackage.weeks.length - 3}주차
                      </p>
                    )}
                  </div>
                  <div className="border-t border-gray-100 bg-surface/60 px-4 py-3">
                    <PackagePurchaseControls pkg={recommendedPackage} compact />
                  </div>
                </div>
              )}
              <div className="grid grid-cols-3 gap-1.5 pt-2">
                <Link
                  href={`/masters/${order.masterId}/feedback?extra=1`}
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
