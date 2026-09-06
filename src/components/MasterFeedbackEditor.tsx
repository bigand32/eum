"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { loadFeedbackOrder, markFeedbackInReview, saveCompletedFeedbackOrder } from "@/lib/db/api";
import { useDb } from "@/lib/db/use-db";
import type { FeedbackOrder } from "@/lib/db/schema";
import { PACKAGE_LEVEL_LABEL } from "@/lib/db/schema";
import {
  formatFeedbackMediaLabel,
  getMediaDuration,
  isMediaDurationOverLimit,
  mediaDurationLimitMessage,
  isFeedbackVideo,
  isMediaFile,
  isVideoFile,
} from "@/lib/feedback-pricing";
import {
  enqueueFeedbackMediaProcessing,
  formatFileSize,
  uploadFeedbackMedia,
} from "@/lib/feedback-media";
import { getStudentName } from "@/lib/master-utils";
import { TimestampComment, formatTime } from "@/lib/timestamp-comments";
import { useMediaPlayer } from "@/lib/use-media-player";
import { useSession } from "@/lib/auth/use-session";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export function MasterFeedbackEditor({ orderId }: { orderId: string }) {
  const router = useRouter();
  const db = useDb();
  const { session } = useSession();
  const [order, setOrder] = useState<FeedbackOrder | null>(null);
  const [comments, setComments] = useState<TimestampComment[]>([]);
  const [pendingTime, setPendingTime] = useState<number | null>(null);
  const [commentText, setCommentText] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [recommendedPackageId, setRecommendedPackageId] = useState<string>("");
  const [masterSummary, setMasterSummary] = useState(
    "녹음본 잘 들었습니다. 코멘트를 확인해 주세요!",
  );
  const [replyFileName, setReplyFileName] = useState<string | null>(null);
  const [replyFileSizeLabel, setReplyFileSizeLabel] = useState<string | null>(null);
  const [replyPreviewUrl, setReplyPreviewUrl] = useState<string | null>(null);
  const [replyIsVideo, setReplyIsVideo] = useState(false);
  const [replyError, setReplyError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);
  const replyFileRef = useRef<File | null>(null);
  const replyPreviewBlobRef = useRef(false);
  const replyInputRef = useRef<HTMLInputElement>(null);
  const replyCameraRef = useRef<HTMLInputElement>(null);
  const [videoTime, setVideoTime] = useState(0);
  const [videoDuration, setVideoDuration] = useState(105);

  const isVideo = order ? isFeedbackVideo(order) : false;
  const fallbackDuration = order?.mediaDurationSec ?? 105;
  const { currentTime: audioTime, duration: audioDuration, playing, togglePlay, seekTo: seekAudio } =
    useMediaPlayer(isVideo ? undefined : order?.mediaUrl, fallbackDuration);
  const currentTime = isVideo ? videoTime : audioTime;
  const duration = isVideo ? videoDuration : audioDuration;

  const seekTo = (seconds: number) => {
    if (isVideo && videoRef.current) {
      videoRef.current.currentTime = seconds;
      setVideoTime(seconds);
      return;
    }
    seekAudio(seconds);
  };

  const handleTogglePlay = () => {
    if (isVideo && videoRef.current) {
      if (videoRef.current.paused) void videoRef.current.play();
      else videoRef.current.pause();
      return;
    }
    togglePlay();
  };

  const clearReplyMedia = () => {
    if (replyPreviewBlobRef.current && replyPreviewUrl) {
      URL.revokeObjectURL(replyPreviewUrl);
    }
    replyPreviewBlobRef.current = false;
    replyFileRef.current = null;
    setReplyPreviewUrl(null);
    setReplyIsVideo(false);
    setReplyFileName(null);
    setReplyFileSizeLabel(null);
    setReplyError(null);
    if (replyInputRef.current) replyInputRef.current.value = "";
    if (replyCameraRef.current) replyCameraRef.current.value = "";
  };

  const handleReplyFile = async (file?: File | null) => {
    if (!file) return;
    setReplyError(null);
    if (!isMediaFile(file)) {
      setReplyError("영상 또는 음성 파일만 첨부할 수 있어요");
      return;
    }
    try {
      const durationSec = await getMediaDuration(file);
      if (!Number.isFinite(durationSec) || durationSec <= 0) {
        setReplyError("파일을 읽지 못했어요. 다른 파일을 시도해 주세요");
        return;
      }
      if (isMediaDurationOverLimit(Math.ceil(durationSec))) {
        setReplyError(mediaDurationLimitMessage());
        return;
      }
    } catch {
      // duration probe 실패해도 업로드는 허용
    }

    if (replyPreviewBlobRef.current && replyPreviewUrl) {
      URL.revokeObjectURL(replyPreviewUrl);
    }
    const url = URL.createObjectURL(file);
    replyPreviewBlobRef.current = true;
    replyFileRef.current = file;
    setReplyPreviewUrl(url);
    setReplyIsVideo(isVideoFile(file));
    setReplyFileName(file.name);
    setReplyFileSizeLabel(formatFileSize(file.size));
  };

  useEffect(() => {
    void loadFeedbackOrder(orderId).then((o) => {
      setOrder(o ?? null);
      if (o?.timestampComments.length) setComments(o.timestampComments);
      if (o?.masterSummary) setMasterSummary(o.masterSummary);
      if (o?.status === "paid") void markFeedbackInReview(orderId);
    });
    const handler = () => {
      void loadFeedbackOrder(orderId).then((o) => setOrder(o ?? null));
    };
    window.addEventListener("eum-db-updated", handler);
    return () => window.removeEventListener("eum-db-updated", handler);
  }, [orderId]);

  useEffect(
    () => () => {
      if (replyPreviewBlobRef.current && replyPreviewUrl) {
        URL.revokeObjectURL(replyPreviewUrl);
      }
    },
    [replyPreviewUrl],
  );

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
  const packages = db.masterPackages.filter(
    (p) => p.masterId === order.masterId && p.isActive,
  );
  const canSubmit =
    sorted.length > 0 || Boolean(replyPreviewUrl) || masterSummary.trim().length > 0;

  const submitFeedback = async () => {
    if (submitting) return;
    const summary = masterSummary.trim() || "피드백을 확인해 주세요!";
    setSubmitting(true);
    setUploadProgress(0);
    setReplyError(null);
    try {
      let replyMediaUrl: string | undefined;
      let replyMediaType: "audio" | "video" | undefined;
      let replyMediaLabel: string | undefined;
      const file = replyFileRef.current;

      if (file) {
        const authUserId = session?.id;
        if (!authUserId && isSupabaseConfigured()) {
          throw new Error("AUTH_REQUIRED");
        }
        const uploadUserId = authUserId || order.masterId;
        const uploadResult = await uploadFeedbackMedia(uploadUserId, file, (percent) =>
          setUploadProgress(Math.max(5, Math.round(percent * 0.9))),
        );
        replyMediaUrl = uploadResult.publicUrl;
        replyMediaType = isVideoFile(file) ? "video" : "audio";
        replyMediaLabel = formatFeedbackMediaLabel(
          file.name.replace(/\.[^.]+$/, "") || (replyMediaType === "video" ? "영상 피드백" : "음성 피드백"),
          replyMediaType === "video",
        );

        if (uploadResult.needsProcessing && uploadResult.storagePath) {
          const supabase = createClient();
          const {
            data: { session: live },
          } = await supabase.auth.getSession();
          if (live?.access_token) {
            enqueueFeedbackMediaProcessing(
              live.access_token,
              uploadResult.storagePath,
              replyMediaType,
              orderId,
            );
          }
        }
        setUploadProgress(100);
      }

      await saveCompletedFeedbackOrder(orderId, {
        timestampComments: sorted,
        masterSummary: summary,
        recommendedPackageId: recommendedPackageId || undefined,
        replyMediaUrl,
        replyMediaType,
        replyMediaLabel,
      });
      alert("피드백을 전송했어요!");
      router.push("/master");
    } catch (err) {
      console.error(err);
      setReplyError("첨부 업로드에 실패했어요. 다시 시도해 주세요");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <header className="sticky top-0 z-50 flex items-center gap-3 border-b border-gray-100 bg-white/90 px-5 py-4 backdrop-blur-md">
        <Link href="/master" className="text-xl text-gray-800">
          <i className="fa-solid fa-chevron-left" />
        </Link>
        <div className="flex-1">
          <div className="text-[15px] font-bold">피드백 작성</div>
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
          {isVideo && order.mediaUrl ? (
            <>
              <video
                ref={videoRef}
                src={order.mediaUrl}
                controls
                playsInline
                preload="metadata"
                className="mb-4 w-full rounded-xl bg-black"
                onLoadedMetadata={(e) => {
                  const next = e.currentTarget.duration;
                  if (Number.isFinite(next) && next > 0) setVideoDuration(Math.ceil(next));
                }}
                onTimeUpdate={(e) => setVideoTime(e.currentTarget.currentTime)}
              />
              <p className="mb-4 text-[13px] font-medium text-gray-500">
                {formatFeedbackMediaLabel(order.mediaLabel, true)}
              </p>
            </>
          ) : (
            <div className="mb-4 flex items-center gap-3">
              <button
                type="button"
                onClick={handleTogglePlay}
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
          )}
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
              if (!isVideo && playing) togglePlay();
              if (isVideo && videoRef.current && !videoRef.current.paused) videoRef.current.pause();
              setPendingTime(currentTime);
              setCommentText("");
              setEditingKey(null);
              setShowForm(true);
            }}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-gray-300 bg-surface py-3 text-[14px] font-bold text-gray-700 transition hover:border-gray-400 hover:bg-gray-100"
          >
            <i className="fa-solid fa-plus text-[12px] text-gray-400" />
            여기에 코멘트
            <span className="rounded-md bg-white px-2 py-0.5 text-[12px] font-bold tabular-nums text-master-500 shadow-sm">
              {formatTime(currentTime)}
            </span>
          </button>
        </div>

        {showForm && (
          <div className="rounded-[20px] border border-gray-100 bg-white p-4 shadow-soft">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-[13px] font-bold text-gray-900">
                <span className="mr-2 rounded-md bg-surface px-2 py-0.5 text-[12px] font-bold tabular-nums text-master-500">
                  {formatTime(pendingTime ?? 0)}
                </span>
                {editingKey ? "코멘트 수정" : "구간 코멘트"}
              </span>
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setEditingKey(null);
                }}
                className="flex h-7 w-7 items-center justify-center rounded-full text-gray-400 hover:bg-gray-50"
                aria-label="닫기"
              >
                <i className="fa-solid fa-xmark text-[13px]" />
              </button>
            </div>
            <textarea
              rows={3}
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder="이 구간에 대한 피드백을 적어 주세요"
              className="w-full resize-none rounded-xl border border-gray-200 bg-white p-3 text-[14px] outline-none placeholder:text-gray-400 focus:border-gray-400"
            />
            <button
              type="button"
              onClick={() => {
                const text = commentText.trim();
                if (!text || pendingTime === null) return;
                if (editingKey) {
                  setComments((prev) =>
                    prev.map((item) =>
                      `${item.time}-${item.text}` === editingKey
                        ? { time: pendingTime, text }
                        : item,
                    ),
                  );
                } else {
                  setComments((prev) => [...prev, { time: pendingTime, text }]);
                }
                setShowForm(false);
                setEditingKey(null);
                setCommentText("");
              }}
              className="mt-3 w-full rounded-xl bg-gray-900 py-3 text-[14px] font-bold text-white transition hover:bg-gray-800"
            >
              {editingKey ? "수정 저장" : "코멘트 추가"}
            </button>
          </div>
        )}

        <div className="rounded-[20px] border border-gray-100 bg-white p-4 shadow-soft">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-[13px] font-bold text-gray-900">작성한 코멘트</p>
            <span className="text-[12px] font-medium text-gray-400">{sorted.length}개</span>
          </div>
          {sorted.length === 0 ? (
            <p className="py-5 text-center text-[13px] leading-relaxed text-gray-400">
              재생 중 원하는 위치에서
              <br />
              「여기에 코멘트」를 눌러 주세요
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              {sorted.map((c) => {
                const key = `${c.time}-${c.text}`;
                return (
                  <div
                    key={key}
                    className="group flex items-start gap-3 rounded-xl bg-surface px-3 py-3"
                  >
                    <button
                      type="button"
                      onClick={() => seekTo(c.time)}
                      className="shrink-0 rounded-md bg-white px-2 py-0.5 text-[12px] font-bold tabular-nums text-master-500 shadow-sm"
                    >
                      {formatTime(c.time)}
                    </button>
                    <p className="flex-1 text-[13px] leading-snug text-gray-700">{c.text}</p>
                    <div className="flex shrink-0 items-center gap-0.5">
                      <button
                        type="button"
                        onClick={() => {
                          if (!isVideo && playing) togglePlay();
                          if (isVideo && videoRef.current && !videoRef.current.paused) {
                            videoRef.current.pause();
                          }
                          seekTo(c.time);
                          setPendingTime(c.time);
                          setCommentText(c.text);
                          setEditingKey(key);
                          setShowForm(true);
                        }}
                        className="p-1 text-gray-300 transition hover:text-master-500"
                        aria-label="수정"
                      >
                        <i className="fa-solid fa-pen text-[11px]" />
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setComments((prev) =>
                            prev.filter((item) => !(item.time === c.time && item.text === c.text)),
                          )
                        }
                        className="p-1 text-gray-300 transition hover:text-red-400"
                        aria-label="삭제"
                      >
                        <i className="fa-solid fa-trash-can text-[11px]" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="rounded-[20px] border border-gray-100 bg-white p-5 shadow-soft">
          <h3 className="mb-1 text-[14px] font-bold text-gray-900">총평 메시지</h3>
          <p className="mb-3 text-[12px] text-gray-500">수강생에게 보이는 요약 코멘트예요</p>
          <textarea
            rows={3}
            value={masterSummary}
            onChange={(e) => setMasterSummary(e.target.value)}
            placeholder="잘 들었어요. 고음 구간만 조금 더 안정적으로…"
            className="w-full resize-none rounded-xl border border-gray-200 bg-white p-3 text-[14px] outline-none placeholder:text-gray-400 focus:border-gray-400"
          />
        </div>

        <div className="rounded-[20px] border border-gray-100 bg-white p-5 shadow-soft">
          <h3 className="mb-1 text-[14px] font-bold text-gray-900">영상·음성 답변 첨부</h3>
          <p className="mb-4 text-[12px] text-gray-500">
            시연 영상이나 음성 코멘트를 함께 보내면 더 잘 전달돼요 (선택)
          </p>
          <input
            ref={replyInputRef}
            type="file"
            accept="video/*,audio/*,.mov,.mp4,.mp3,.m4a,.wav,.aac"
            className="hidden"
            onChange={(e) => void handleReplyFile(e.target.files?.[0])}
          />
          <input
            ref={replyCameraRef}
            type="file"
            accept="video/*,audio/*"
            capture="environment"
            className="hidden"
            onChange={(e) => void handleReplyFile(e.target.files?.[0])}
          />

          {replyPreviewUrl ? (
            <div className="overflow-hidden rounded-2xl border border-gray-100 bg-surface">
              {replyIsVideo ? (
                <video
                  src={replyPreviewUrl}
                  controls
                  playsInline
                  className="aspect-video w-full bg-black"
                />
              ) : (
                <div className="flex items-center gap-3 px-4 py-4">
                  <div className="flex h-11 w-11 items-center justify-center rounded-full bg-master-500 text-white">
                    <i className="fa-solid fa-music text-[13px]" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-bold text-gray-900">
                      {replyFileName ?? "음성 파일"}
                    </p>
                    <p className="text-[11px] text-gray-500">{replyFileSizeLabel}</p>
                  </div>
                  <audio src={replyPreviewUrl} controls className="max-w-[140px]" />
                </div>
              )}
              <div className="flex items-center justify-between gap-2 border-t border-gray-100 px-4 py-3">
                <p className="truncate text-[12px] text-gray-500">
                  {replyFileName}
                  {replyFileSizeLabel ? ` · ${replyFileSizeLabel}` : ""}
                </p>
                <button
                  type="button"
                  onClick={clearReplyMedia}
                  className="shrink-0 text-[12px] font-bold text-rose-500"
                >
                  삭제
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={() => replyCameraRef.current?.click()}
                disabled={submitting}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-gray-900 py-3.5 text-[14px] font-bold text-white hover:bg-gray-800 disabled:opacity-60"
              >
                <i className="fa-solid fa-video text-[13px]" />
                촬영하기
              </button>
              <button
                type="button"
                onClick={() => replyInputRef.current?.click()}
                disabled={submitting}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white py-3.5 text-[14px] font-bold text-gray-800 hover:bg-gray-50 disabled:opacity-60"
              >
                <i className="fa-solid fa-folder-open text-[13px]" />
                영상·음성 파일 선택
              </button>
            </div>
          )}
          {replyError ? (
            <p className="mt-3 text-[12px] font-medium text-rose-500">{replyError}</p>
          ) : null}
          {submitting && replyFileRef.current ? (
            <div className="mt-3">
              <div className="mb-1 flex justify-between text-[11px] font-bold text-gray-500">
                <span>업로드 중</span>
                <span>{uploadProgress}%</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-gray-100">
                <div
                  className="h-full rounded-full bg-master-500 transition-all"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          ) : null}
        </div>

        {packages.length > 0 && (
          <div className="rounded-[20px] border border-gray-100 bg-white p-5 shadow-soft">
            <h3 className="mb-1 text-[14px] font-bold text-gray-900">패키지 추천 (선택)</h3>
            <p className="mb-4 text-[12px] text-gray-500">
              피드백과 함께 맞는 커리큘럼을 추천해 주세요
            </p>
            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={() => setRecommendedPackageId("")}
                className={`rounded-xl border px-4 py-3 text-left text-[13px] font-medium transition ${
                  !recommendedPackageId
                    ? "border-gray-900 bg-gray-900 text-white"
                    : "border-gray-100 bg-surface text-gray-600"
                }`}
              >
                추천 안 함
              </button>
              {packages.map((pkg) => (
                <button
                  key={pkg.id}
                  type="button"
                  onClick={() => setRecommendedPackageId(pkg.id)}
                  className={`rounded-xl border px-4 py-3 text-left transition ${
                    recommendedPackageId === pkg.id
                      ? "border-gray-900 bg-gray-50"
                      : "border-gray-100 bg-surface hover:border-gray-200"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={`rounded-md px-1.5 py-0.5 text-[10px] font-bold ${
                        recommendedPackageId === pkg.id
                          ? "bg-gray-900 text-white"
                          : "bg-gray-200 text-gray-600"
                      }`}
                    >
                      {PACKAGE_LEVEL_LABEL[pkg.level]}
                    </span>
                    <span className="text-[13px] font-bold text-gray-900">{pkg.title}</span>
                  </div>
                  <p className="mt-1 text-[11px] text-gray-500">{pkg.weeks.length}주 커리큘럼</p>
                </button>
              ))}
            </div>
          </div>
        )}

        <button
          type="button"
          disabled={!canSubmit || submitting}
          onClick={() => void submitFeedback()}
          className="w-full rounded-xl bg-gray-900 py-4 text-[15px] font-bold text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {submitting ? "전송 중…" : "피드백 전송하기"}
        </button>
      </main>
    </>
  );
}
