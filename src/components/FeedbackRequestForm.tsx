"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { saveFeedbackOrder, useStudentCouponClaim } from "@/lib/db/api";
import type { Master, PracticeRecord } from "@/lib/db/schema";
import { useStudentId } from "@/lib/auth/use-student-id";
import { useSession } from "@/lib/auth/use-session";
import { useDb } from "@/lib/db/use-db";
import { formatFileSize, enqueueFeedbackMediaProcessing, uploadFeedbackMedia } from "@/lib/feedback-media";
import {
  getMediaDuration,
  isAudioFile,
  isMediaFile,
  isMediaUrl,
  isMediaDurationOverLimit,
  isVideoFile,
  isVideoUrl,
  mediaDurationLimitMessage,
  calcFeedbackExtraFee,
  formatMediaDuration,
} from "@/lib/feedback-pricing";
import { PREMIUM_FEEDBACK_LABEL } from "@/lib/pricing/premium";
import { processFakePayment } from "@/lib/payment/fake-payment";
import {
  FakePaymentSheet,
  MvpPaymentNotice,
  type FakePaymentResult,
} from "@/components/FakePaymentSheet";
import {
  PremiumPriceCaption,
  PremiumPriceDisplay,
} from "@/components/PremiumPromoBadge";
import { formatPrice } from "@/lib/db/schema";
import { createClient } from "@/lib/supabase/client";
import { matchesStudentScope } from "@/lib/student-utils";
import { formatTime } from "@/lib/timestamp-comments";

const LARGE_FILE_BYTES = 20 * 1024 * 1024;

function formatJournalDate(iso: string) {
  const d = new Date(iso);
  return `${d.getMonth() + 1}월 ${d.getDate()}일`;
}

export function FeedbackRequestForm({ master }: { master: Master }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isExtraFeedback = searchParams.get("extra") === "1";
  const db = useDb();
  const studentId = useStudentId();
  const { session } = useSession();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const selectedFileRef = useRef<File | null>(null);
  const previewIsBlobRef = useRef(false);

  const [message, setMessage] = useState("");
  const [songTitle, setSongTitle] = useState("");
  const [artistName, setArtistName] = useState("");
  const [selectedJournal, setSelectedJournal] = useState<PracticeRecord | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [fileSizeLabel, setFileSizeLabel] = useState<string | null>(null);
  const [durationSec, setDurationSec] = useState(0);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewIsVideo, setPreviewIsVideo] = useState(true);
  const [fileLoading, setFileLoading] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);
  const [messageError, setMessageError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [submitPhase, setSubmitPhase] = useState<"idle" | "uploading" | "saving">("idle");
  const [paymentOpen, setPaymentOpen] = useState(false);

  const basePrice = isExtraFeedback
    ? master.pricing.feedbackAdditionalPrice || master.pricing.feedbackPrice
    : master.pricing.feedbackPrice;
  const includedMin = master.pricing.feedbackIncludedMin;
  const extraPer5Min = master.pricing.feedbackExtraPer5Min;
  const extra = useMemo(
    () =>
      durationSec > 0
        ? calcFeedbackExtraFee(durationSec, extraPer5Min, includedMin)
        : { extraMinutes: 0, extraBlocks: 0, extraFee: 0 },
    [durationSec, extraPer5Min, includedMin],
  );
  const premiumPrice = basePrice + extra.extraFee;

  const journalMedia = useMemo(
    () =>
      db.practiceRecords
        .filter(
          (record) =>
            matchesStudentScope(studentId, record.studentId) &&
            record.mediaUrl &&
            isMediaUrl(record.mediaUrl),
        )
        .sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        ),
    [db.practiceRecords, studentId],
  );

  const hasSelection = Boolean(selectedJournal || fileName);

  const clearSelectedMedia = () => {
    if (previewIsBlobRef.current && previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    previewIsBlobRef.current = false;
    setPreviewUrl(null);
    setPreviewIsVideo(true);
    selectedFileRef.current = null;
    setSelectedJournal(null);
    setFileName(null);
    setFileSizeLabel(null);
    setDurationSec(0);
    setFileError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (cameraInputRef.current) cameraInputRef.current.value = "";
  };

  const applyPreview = (input: {
    url: string;
    isBlob: boolean;
    name: string;
    sizeLabel?: string;
    duration: number;
    journal?: PracticeRecord | null;
    isVideo: boolean;
  }) => {
    if (previewIsBlobRef.current && previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    previewIsBlobRef.current = input.isBlob;
    setPreviewUrl(input.url);
    setPreviewIsVideo(input.isVideo);
    setFileName(input.name);
    setFileSizeLabel(input.sizeLabel ?? null);
    setDurationSec(input.duration);
    setSelectedJournal(input.journal ?? null);
  };

  const handleFileSelect = (file: File | undefined) => {
    if (!file) return;
    if (!isMediaFile(file)) {
      setFileError("영상 또는 음원 파일만 올릴 수 있어요. (mp4, mov, mp3, m4a 등)");
      return;
    }

    void (async () => {
      setFileLoading(true);
      setFileError(null);
      selectedFileRef.current = null;
      setSelectedJournal(null);

      try {
        let sec = 0;
        try {
          const duration = await getMediaDuration(file);
          if (Number.isFinite(duration) && duration > 0) {
            sec = Math.max(1, Math.ceil(duration));
          }
        } catch {
          sec = 0;
        }

        if (sec > 0 && isMediaDurationOverLimit(sec)) {
          setFileError(mediaDurationLimitMessage());
          return;
        }

        selectedFileRef.current = file;
        applyPreview({
          url: URL.createObjectURL(file),
          isBlob: true,
          name: file.name,
          sizeLabel: formatFileSize(file.size),
          duration: sec,
          isVideo: isVideoFile(file),
        });
      } catch {
        setFileError("파일을 불러오지 못했어요. 다시 시도해 주세요.");
      } finally {
        setFileLoading(false);
      }
    })();
  };

  const handleJournalSelect = (record: PracticeRecord) => {
    if (!record.mediaUrl) return;
    if (isMediaDurationOverLimit(record.durationSec)) {
      setFileError(mediaDurationLimitMessage());
      return;
    }
    setFileError(null);
    selectedFileRef.current = null;
    applyPreview({
      url: record.mediaUrl,
      isBlob: false,
      name: record.title,
      duration: record.durationSec,
      journal: record,
      isVideo: isVideoUrl(record.mediaUrl),
    });
  };

  useEffect(() => {
    return () => {
      if (previewIsBlobRef.current && previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const validateForm = () => {
    const trimmedMessage = message.trim();
    if (!trimmedMessage) {
      setMessageError("고민을 적어 주세요. 마스터가 코칭 방향을 파악하는 데 필요해요.");
      return false;
    }
    setMessageError(null);

    if (!selectedJournal?.mediaUrl && !selectedFileRef.current) {
      setFileError("연습 영상 또는 음원을 선택해 주세요.");
      return false;
    }

    if (durationSec > 0 && isMediaDurationOverLimit(durationSec)) {
      setFileError(mediaDurationLimitMessage());
      return false;
    }

    if (!session?.id) {
      setFileError("로그인이 필요해요. 다시 로그인해 주세요.");
      return false;
    }
    if (!studentId) {
      setFileError("수강생 정보를 찾을 수 없어요. 잠시 후 다시 시도하거나 다시 로그인해 주세요.");
      return false;
    }

    setFileError(null);
    return true;
  };

  const handlePay = () => {
    if (!validateForm()) return;
    setPaymentOpen(true);
  };

  const confirmPay = async (payment: FakePaymentResult) => {
    if (!validateForm()) return;

    const authUserId = session!.id;
    const trimmedMessage = message.trim();
    const journalUrl = selectedJournal?.mediaUrl;
    const file = selectedFileRef.current;

    if (!journalUrl && !file) return;

    setSubmitting(true);
    setFileError(null);
    setUploadProgress(0);
    try {
      await processFakePayment(payment.amount);

      let mediaUrl: string;
      let uploadResult: Awaited<ReturnType<typeof uploadFeedbackMedia>> | null = null;

      if (journalUrl) {
        setSubmitPhase("saving");
        setUploadProgress(95);
        mediaUrl = journalUrl;
      } else {
        setSubmitPhase("uploading");
        uploadResult = await uploadFeedbackMedia(
          authUserId,
          file!,
          (percent) => setUploadProgress(Math.max(10, Math.round(percent * 0.85))),
        );
        mediaUrl = uploadResult.publicUrl;
        setSubmitPhase("saving");
        setUploadProgress(92);
      }

      const mediaType: "audio" | "video" = selectedJournal
        ? isVideoUrl(selectedJournal.mediaUrl ?? "")
          ? "video"
          : "audio"
        : selectedFileRef.current && isAudioFile(selectedFileRef.current)
          ? "audio"
          : "video";

      const order = await saveFeedbackOrder({
        studentId: studentId!,
        masterId: master.id,
        priceAtPurchase: payment.amount,
        studentMessage: trimmedMessage,
        mediaLabel:
          [songTitle.trim(), artistName.trim()].filter(Boolean).join(" - ") ||
          (mediaType === "video" ? "연습 영상" : "연습 음원"),
        mediaType,
        mediaDurationSec: durationSec > 0 ? durationSec : undefined,
        extraDurationFee: extra.extraFee > 0 ? extra.extraFee : undefined,
        mediaUrl,
        practiceRecordId: selectedJournal?.id,
      });

      if (payment.claimId) {
        await useStudentCouponClaim(payment.claimId);
      }

      if (uploadResult?.needsProcessing && uploadResult.storagePath) {
        const supabase = createClient();
        const {
          data: { session: authSession },
        } = await supabase.auth.getSession();
        const accessToken = authSession?.access_token;
        if (accessToken) {
          enqueueFeedbackMediaProcessing(
            accessToken,
            uploadResult.storagePath,
            mediaType,
            order.id,
          );
        }
      }

      setUploadProgress(100);
      setPaymentOpen(false);
      router.push(`/feedback/${order.id}?submitted=1`);
    } catch (err) {
      console.error("feedback order save failed", err);
      setFileError(
        journalUrl
          ? "요청 저장에 실패했어요. 다시 시도해 주세요."
          : "파일 업로드에 실패했어요. Wi-Fi에서 다시 시도해 주세요.",
      );
      setSubmitPhase("idle");
      setUploadProgress(0);
    } finally {
      setSubmitting(false);
    }
  };

  const isLargeFile =
    selectedFileRef.current != null && selectedFileRef.current.size >= LARGE_FILE_BYTES;

  return (
    <div className="flex min-h-dvh flex-col">
      <main className="flex flex-col gap-0">
        <section className="border-b border-surface px-6 py-6">
          <h2 className="mb-3 text-[14px] font-bold text-gray-500">선택한 코칭</h2>
          <div className="flex items-center gap-4">
            <img
              src={master.avatarUrl}
              alt=""
              className="h-14 w-14 rounded-2xl border border-gray-100 object-cover"
            />
            <div>
              <div className="mb-1 text-[13px] font-bold text-gray-900">{master.title}</div>
              <h3 className="text-[16px] font-extrabold leading-tight text-gray-900">
                {isExtraFeedback ? "추가 피드백" : PREMIUM_FEEDBACK_LABEL}
              </h3>
              <div className="mt-2">
                <PremiumPriceDisplay price={basePrice} size="sm" />
              </div>
            </div>
          </div>
        </section>

        <section className="border-b border-surface px-6 py-6">
          <h2 className="mb-2 text-[18px] font-bold tracking-tight text-gray-900">
            연습 파일 선택
          </h2>
          <p className="mb-4 text-[12px] text-gray-500">
            영상·음원은 최대 5분. 촬영·선택하거나 내 일지에서 골라 주세요.
          </p>

          <input
            ref={fileInputRef}
            type="file"
            accept="video/*,audio/*,.mov,.mp4,.mp3,.m4a,.wav,.aac"
            className="hidden"
            onChange={(e) => handleFileSelect(e.target.files?.[0])}
          />
          <input
            ref={cameraInputRef}
            type="file"
            accept="video/*,audio/*"
            capture="environment"
            className="hidden"
            onChange={(e) => handleFileSelect(e.target.files?.[0])}
          />

          {!hasSelection && (
            <>
              <button
                type="button"
                onClick={() => cameraInputRef.current?.click()}
                disabled={submitting || fileLoading}
                className="mb-3 flex w-full items-center justify-center gap-2 rounded-[16px] bg-gray-900 py-4 text-[15px] font-bold text-white hover:bg-gray-800 disabled:opacity-60"
              >
                <i className="fa-solid fa-video" />
                카메라로 촬영하기
              </button>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={submitting || fileLoading}
                className="mb-5 flex w-full items-center justify-center gap-2 rounded-[16px] border border-gray-200 bg-white py-4 text-[15px] font-bold text-gray-800 hover:bg-gray-50 disabled:opacity-60"
              >
                <i className="fa-solid fa-photo-film" />
                영상 · 음원 선택
              </button>

              {journalMedia.length > 0 && (
                <>
                  <div className="mb-3 flex items-center gap-3">
                    <div className="h-px flex-1 bg-gray-100" />
                    <span className="text-[11px] font-semibold text-gray-400">내 일지에서 선택</span>
                    <div className="h-px flex-1 bg-gray-100" />
                  </div>
                  <div className="flex max-h-52 flex-col gap-2 overflow-y-auto no-scrollbar">
                    {journalMedia.map((record) => (
                      <button
                        key={record.id}
                        type="button"
                        disabled={submitting || fileLoading}
                        onClick={() => handleJournalSelect(record)}
                        className="flex items-center gap-3 rounded-xl border border-gray-100 bg-white p-3 text-left hover:border-brand-200 hover:bg-brand-50/30 disabled:opacity-60"
                      >
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-gray-900 text-white">
                          <i
                            className={`fa-solid ${
                              isVideoUrl(record.mediaUrl ?? "") ? "fa-play" : "fa-music"
                            } text-[11px]`}
                          />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[14px] font-bold text-gray-900">{record.title}</p>
                          <p className="text-[11px] text-gray-500">
                            {formatJournalDate(record.createdAt)} · {formatTime(record.durationSec)}
                          </p>
                        </div>
                        <i className="fa-solid fa-chevron-right shrink-0 text-[11px] text-gray-300" />
                      </button>
                    ))}
                  </div>
                </>
              )}
            </>
          )}

          {fileLoading && (
            <p className="mt-4 text-center text-[13px] font-medium text-gray-400">파일 불러오는 중...</p>
          )}

          {hasSelection && previewUrl && !fileLoading && (
            <div className="rounded-[16px] bg-surface p-4">
              {previewIsVideo ? (
                <video
                  src={previewUrl}
                  controls
                  playsInline
                  className="mb-3 w-full rounded-xl bg-black"
                />
              ) : (
                <audio src={previewUrl} controls className="mb-3 w-full" />
              )}
              <p className="text-[13px] font-bold text-gray-900">
                {selectedJournal
                  ? `일지에서 선택한 ${previewIsVideo ? "영상" : "음원"}`
                  : `선택한 연습 ${previewIsVideo ? "영상" : "음원"}`}
              </p>
              <div className="mt-1 flex items-center gap-2 text-[11px] text-gray-400">
                {fileSizeLabel && <span>{fileSizeLabel}</span>}
                {durationSec > 0 && (
                  <>
                    {fileSizeLabel && <span>·</span>}
                    <span className="tabular-nums">{formatTime(durationSec)}</span>
                  </>
                )}
              </div>
              <button
                type="button"
                disabled={submitting}
                onClick={clearSelectedMedia}
                className="mt-3 w-full rounded-xl border border-gray-200 py-2.5 text-[13px] font-semibold text-gray-600"
              >
                다시 선택하기
              </button>
            </div>
          )}

          {isLargeFile && !submitting && (
            <p className="mt-3 text-[12px] leading-relaxed font-medium text-amber-600">
              큰 파일은 업로드에 시간이 걸릴 수 있어요. Wi-Fi 환경을 권장합니다.
            </p>
          )}

          {fileError && (
            <p className="mt-3 text-[13px] font-medium text-red-500">{fileError}</p>
          )}
        </section>

        <section className="border-b border-surface px-6 py-8">
          <h2 className="mb-1 text-[18px] font-bold tracking-tight text-gray-900">
            곡 정보 <span className="text-[13px] font-medium text-gray-400">(선택)</span>
          </h2>
          <p className="mb-4 text-[12px] text-gray-500">곡명과 가수명을 각각 입력할 수 있어요.</p>
          <div className="flex flex-col gap-3">
            <label className="block">
              <span className="mb-1.5 block text-[13px] font-bold text-gray-600">곡명</span>
              <input
                value={songTitle}
                onChange={(e) => setSongTitle(e.target.value)}
                placeholder="예: 밤양갱"
                disabled={submitting}
                className="w-full rounded-xl border border-gray-100 bg-surface px-4 py-3 text-[14px] outline-none focus:border-brand-500 disabled:opacity-60"
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-[13px] font-bold text-gray-600">가수명</span>
              <input
                value={artistName}
                onChange={(e) => setArtistName(e.target.value)}
                placeholder="예: 비비"
                disabled={submitting}
                className="w-full rounded-xl border border-gray-100 bg-surface px-4 py-3 text-[14px] outline-none focus:border-brand-500 disabled:opacity-60"
              />
            </label>
          </div>
        </section>

        <section className="border-b border-surface px-6 py-8">
          <h2 className="mb-4 text-[18px] font-bold tracking-tight text-gray-900">
            고민 적기 <span className="text-[14px] font-normal text-red-500">*</span>
          </h2>
          <textarea
            value={message}
            onChange={(e) => {
              setMessage(e.target.value);
              if (messageError && e.target.value.trim()) {
                setMessageError(null);
              }
            }}
            rows={4}
            placeholder="어떤 부분이 고민인지, 마스터에게 원하는 코칭 방향을 구체적으로 적어주세요."
            disabled={submitting}
            className={`h-28 w-full resize-none rounded-[16px] border bg-surface p-4 text-[14px] outline-none placeholder:text-gray-400 focus:border-brand-500 disabled:opacity-60 ${
              messageError ? "border-red-300" : "border-gray-100"
            }`}
          />
          {messageError && (
            <p className="mt-2 text-[13px] font-medium text-red-500">{messageError}</p>
          )}
        </section>

        <section className="bg-surface/50 px-6 py-6">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <span className="text-[16px] font-bold text-gray-900">결제 금액</span>
              <div className="mt-1">
                <PremiumPriceCaption
                  price={premiumPrice}
                  note={
                    extra.extraFee > 0
                      ? `기본 ${formatPrice(basePrice)}원 + 초과 ${formatPrice(extra.extraFee)}원`
                      : `기본 ${includedMin}분 포함 · ${formatPrice(basePrice)}원`
                  }
                />
              </div>
              {durationSec > 0 && (
                <p className="mt-1 text-[11px] text-gray-400">
                  영상 {formatMediaDuration(durationSec)}
                  {extra.extraBlocks > 0
                    ? ` · ${includedMin}분 초과 ${extra.extraBlocks}블록 (+${formatPrice(extraPer5Min)}원/5분)`
                    : ""}
                </p>
              )}
            </div>
            <PremiumPriceDisplay price={premiumPrice} size="lg" />
          </div>
          <div className="mt-3">
            <MvpPaymentNotice />
          </div>
        </section>
      </main>

      <div className="mt-auto border-t border-gray-100 bg-white p-5 pb-8">
        {submitting && (
          <div className="mb-3">
            <div className="mb-1.5 flex items-center justify-between text-[12px] font-semibold text-gray-500">
              <span>
                {submitPhase === "saving"
                  ? "요청 저장 중..."
                  : selectedJournal
                    ? "준비 중..."
                    : "영상 업로드 중..."}
              </span>
              <span>{`${uploadProgress}%`}</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-gray-100">
              <div
                className="h-full rounded-full bg-brand-500 transition-[width] duration-200"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          </div>
        )}

        <button
          type="button"
          onClick={handlePay}
          disabled={submitting}
          className="shadow-float flex h-14 w-full items-center justify-center gap-2 rounded-[16px] bg-gray-900 text-[16px] font-bold text-white hover:bg-gray-800 disabled:opacity-50"
        >
          {submitting
            ? submitPhase === "saving"
              ? "저장 중..."
              : selectedJournal
                ? "처리 중..."
                : `업로드 중 ${uploadProgress}%`
            : `${formatPrice(premiumPrice)}원 결제하기`}
        </button>
      </div>

      <FakePaymentSheet
        open={paymentOpen}
        productLabel={`${PREMIUM_FEEDBACK_LABEL} · ${master.title}`}
        amount={premiumPrice}
        masterId={master.id}
        processing={submitting}
        onClose={() => !submitting && setPaymentOpen(false)}
        onConfirm={(result) => void confirmPay(result)}
      />
    </div>
  );
}
