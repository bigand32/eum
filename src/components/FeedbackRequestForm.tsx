"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { saveFeedbackOrder } from "@/lib/db/api";
import type { Master } from "@/lib/db/schema";
import { useStudentId } from "@/lib/auth/use-student-id";
import { useSession } from "@/lib/auth/use-session";
import { formatFileSize, processFeedbackMedia, uploadFeedbackMedia } from "@/lib/feedback-media";
import { isVideoFile } from "@/lib/feedback-pricing";
import {
  getPremiumFeedbackPricing,
  PREMIUM_FEEDBACK_LABEL,
} from "@/lib/pricing/premium";
import { processFakePayment } from "@/lib/payment/fake-payment";
import { FakePaymentSheet, MvpPaymentNotice } from "@/components/FakePaymentSheet";
import {
  PremiumPriceCaption,
  PremiumPriceDisplay,
  PremiumPromoBadge,
} from "@/components/PremiumPromoBadge";
import { formatPrice } from "@/lib/db/schema";
import { createClient } from "@/lib/supabase/client";

const LARGE_FILE_BYTES = 20 * 1024 * 1024;

export function FeedbackRequestForm({ master }: { master: Master }) {
  const router = useRouter();
  const studentId = useStudentId();
  const { session } = useSession();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const selectedFileRef = useRef<File | null>(null);
  const [message, setMessage] = useState("");
  const [mediaLabel, setMediaLabel] = useState("");
  const [mediaType, setMediaType] = useState<"audio" | "video">("audio");
  const [fileName, setFileName] = useState<string | null>(null);
  const [fileSizeLabel, setFileSizeLabel] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [messageError, setMessageError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [submitPhase, setSubmitPhase] = useState<
    "idle" | "uploading" | "processing" | "saving"
  >("idle");
  const [paymentOpen, setPaymentOpen] = useState(false);

  const premiumPricing = getPremiumFeedbackPricing();
  const premiumPrice = premiumPricing.price;

  const handleFileSelect = (file: File | undefined) => {
    if (!file) return;
    setFileError(null);
    selectedFileRef.current = file;

    const type = isVideoFile(file) ? "video" : "audio";
    setMediaType(type);
    setFileName(file.name);
    setFileSizeLabel(formatFileSize(file.size));

    if (!mediaLabel) {
      const nameWithoutExt = file.name.replace(/\.[^.]+$/, "");
      setMediaLabel(nameWithoutExt);
    }
  };

  const validateForm = () => {
    const trimmedMessage = message.trim();
    if (!trimmedMessage) {
      setMessageError("고민을 적어 주세요. 마스터가 코칭 방향을 파악하는 데 필요해요.");
      return false;
    }
    setMessageError(null);

    if (!fileName || !selectedFileRef.current) {
      setFileError("음성·영상 파일을 먼저 선택해 주세요.");
      return false;
    }

    if (!session?.id) {
      setFileError("로그인이 필요해요. 다시 로그인해 주세요.");
      return false;
    }
    if (!studentId) {
      setFileError("수강생 정보를 찾을 수 없어요. 다시 로그인해 주세요.");
      return false;
    }

    setFileError(null);
    return true;
  };

  const handlePay = () => {
    if (!validateForm()) return;
    setPaymentOpen(true);
  };

  const confirmPay = async () => {
    if (!validateForm() || !selectedFileRef.current) return;

    const authUserId = session!.id;
    const trimmedMessage = message.trim();

    setSubmitting(true);
    setFileError(null);
    setUploadProgress(0);
    setSubmitPhase("uploading");
    try {
      await processFakePayment(premiumPrice);

      const uploadResult = await uploadFeedbackMedia(
        authUserId,
        selectedFileRef.current,
        (percent) => setUploadProgress(Math.round(percent * 0.6)),
      );

      let mediaUrl = uploadResult.publicUrl;

      if (uploadResult.needsProcessing && uploadResult.storagePath) {
        const supabase = createClient();
        const {
          data: { session: authSession },
        } = await supabase.auth.getSession();
        const accessToken = authSession?.access_token;

        if (accessToken) {
          setSubmitPhase("processing");
          setUploadProgress(65);
          try {
            const processed = await processFeedbackMedia(
              accessToken,
              uploadResult.storagePath,
              mediaType,
            );
            mediaUrl = processed.publicUrl;
            setUploadProgress(90);
          } catch {
            // 압축 실패 시 원본 URL로 저장
          }
        }
      }

      setSubmitPhase("saving");
      setUploadProgress(95);
      const order = await saveFeedbackOrder({
        studentId: studentId!,
        masterId: master.id,
        priceAtPurchase: premiumPrice,
        studentMessage: trimmedMessage,
        mediaLabel: mediaLabel || fileName!,
        mediaType,
        mediaUrl,
      });
      setUploadProgress(100);
      setPaymentOpen(false);
      router.push(`/feedback/${order.id}?submitted=1`);
    } catch {
      setFileError("파일 업로드에 실패했어요. Wi-Fi에서 다시 시도해 주세요.");
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
                {PREMIUM_FEEDBACK_LABEL}
              </h3>
              <div className="mt-2">
                <PremiumPriceDisplay size="sm" />
              </div>
              <div className="mt-2">
                <PremiumPromoBadge />
              </div>
            </div>
          </div>
        </section>

        <section className="border-b border-surface px-6 py-6">
          <h2 className="mb-2 text-[18px] font-bold tracking-tight text-gray-900">
            연습 파일 업로드
          </h2>
          <p className="mb-4 text-[12px] text-gray-500">
            mp3, m4a, mp4, mov 등 연습 파일을 올려 주세요.
          </p>

          <div className="mb-4 flex gap-2">
            {(["audio", "video"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => {
                  setMediaType(t);
                  setFileName(null);
                  setFileSizeLabel(null);
                  setFileError(null);
                  selectedFileRef.current = null;
                  if (fileInputRef.current) fileInputRef.current.value = "";
                }}
                className={`flex-1 rounded-xl border py-3 text-[13px] font-bold ${
                  mediaType === t
                    ? "border-brand-500 bg-brand-50 text-brand-600"
                    : "border-gray-200 text-gray-600"
                }`}
              >
                <i className={`fa-solid ${t === "audio" ? "fa-microphone" : "fa-video"} mr-1`} />
                {t === "audio" ? "음원" : "영상"}
              </button>
            ))}
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept={mediaType === "audio" ? "audio/*" : "video/*"}
            className="hidden"
            onChange={(e) => handleFileSelect(e.target.files?.[0])}
          />

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={submitting}
            className={`flex w-full flex-col items-center gap-2 rounded-[16px] border-2 border-dashed py-10 transition-colors ${
              fileName
                ? "border-brand-200 bg-brand-50/40"
                : "border-gray-200 bg-surface hover:border-brand-300"
            } disabled:opacity-60`}
          >
            {fileName ? (
              <>
                <i className="fa-solid fa-circle-check text-2xl text-brand-500" />
                <span className="max-w-full truncate px-4 text-[14px] font-bold text-gray-800">
                  {fileName}
                </span>
                {fileSizeLabel && (
                  <span className="text-[12px] font-medium text-gray-500">{fileSizeLabel}</span>
                )}
                <span className="text-[13px] font-semibold text-brand-500">업로드 준비 완료</span>
              </>
            ) : (
              <>
                <i className="fa-solid fa-cloud-arrow-up text-2xl text-gray-400" />
                <span className="text-[14px] font-bold text-gray-600">탭하여 파일 선택</span>
              </>
            )}
          </button>

          {isLargeFile && !submitting && (
            <p className="mt-3 text-[12px] leading-relaxed font-medium text-amber-600">
              큰 파일은 업로드 후 서버에서 자동으로 압축해요. Wi-Fi 환경을 권장합니다.
            </p>
          )}

          {fileError && (
            <p className="mt-3 text-[13px] font-medium text-red-500">{fileError}</p>
          )}

          <input
            value={mediaLabel}
            onChange={(e) => setMediaLabel(e.target.value)}
            placeholder="곡명 / 연습 제목"
            disabled={submitting}
            className="mt-4 w-full rounded-xl border border-gray-100 bg-surface px-4 py-3 text-[14px] outline-none focus:border-brand-500 disabled:opacity-60"
          />
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
          <div className="flex items-center justify-between gap-4">
            <div>
              <span className="text-[16px] font-bold text-gray-900">결제 금액</span>
              <div className="mt-1">
                <PremiumPriceCaption />
              </div>
            </div>
            <PremiumPriceDisplay size="lg" />
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
                  : submitPhase === "processing"
                    ? "파일 압축 중..."
                    : "파일 업로드 중..."}
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
              : submitPhase === "processing"
                ? "압축 중..."
                : `업로드 중 ${uploadProgress}%`
            : `${formatPrice(premiumPrice)}원 결제하기`}
        </button>
      </div>

      <FakePaymentSheet
        open={paymentOpen}
        productLabel={`${PREMIUM_FEEDBACK_LABEL} · ${master.title}`}
        amount={premiumPrice}
        processing={submitting}
        onClose={() => !submitting && setPaymentOpen(false)}
        onConfirm={() => void confirmPay()}
      />
    </div>
  );
}
