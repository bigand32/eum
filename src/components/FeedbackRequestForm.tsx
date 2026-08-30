"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { saveFeedbackOrder } from "@/lib/db/api";
import type { Master } from "@/lib/db/schema";
import { formatPrice } from "@/lib/db/schema";
import { useStudentId } from "@/lib/auth/use-student-id";
import { useSession } from "@/lib/auth/use-session";
import { uploadFeedbackMedia } from "@/lib/feedback-media";
import { processFakePayment } from "@/lib/payment/fake-payment";
import { FakePaymentSheet, MvpPaymentNotice } from "@/components/FakePaymentSheet";
import {
  FEEDBACK_INCLUDED_MINUTES,
  calcFeedbackExtraFee,
  formatMediaDuration,
  getMediaDuration,
} from "@/lib/feedback-pricing";

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
  const [durationSec, setDurationSec] = useState<number | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [loadingDuration, setLoadingDuration] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [paymentOpen, setPaymentOpen] = useState(false);

  const basePrice = master.pricing.feedbackPrice;
  const includedMin = master.pricing.feedbackIncludedMin ?? FEEDBACK_INCLUDED_MINUTES;
  const extraPer5Min = master.pricing.feedbackExtraPer5Min ?? 2000;
  const { extraMinutes, extraBlocks, extraFee } =
    durationSec !== null
      ? calcFeedbackExtraFee(durationSec, extraPer5Min, includedMin)
      : { extraMinutes: 0, extraBlocks: 0, extraFee: 0 };
  const totalPrice = basePrice + extraFee;
  const isOverLimit = extraBlocks > 0;

  const handleFileSelect = async (file: File | undefined) => {
    if (!file) return;
    setFileError(null);
    setLoadingDuration(true);
    selectedFileRef.current = file;

    const type =
      file.type.startsWith("video") || /\.(mp4|mov|m4v|webm)$/i.test(file.name)
        ? "video"
        : "audio";
    setMediaType(type);
    setFileName(file.name);

    if (!mediaLabel) {
      const nameWithoutExt = file.name.replace(/\.[^.]+$/, "");
      setMediaLabel(nameWithoutExt);
    }

    try {
      const duration = await getMediaDuration(file);
      if (!Number.isFinite(duration) || duration <= 0) {
        throw new Error("invalid");
      }
      setDurationSec(Math.max(1, Math.ceil(duration)));
    } catch {
      setDurationSec(null);
      setFileError(
        type === "video"
          ? "영상 길이를 확인할 수 없어요. iPhone 기본 Safari에서 mp4/mov 파일을 다시 선택해 주세요."
          : "파일 길이를 확인할 수 없어요. 다른 파일을 선택해 주세요.",
      );
    } finally {
      setLoadingDuration(false);
    }
  };

  const handlePay = async () => {
    if (!fileName || durationSec === null || !selectedFileRef.current) {
      setFileError("5분 이내 음성·영상 파일을 먼저 업로드해 주세요.");
      return;
    }
    setPaymentOpen(true);
  };

  const confirmPay = async () => {
    if (!fileName || durationSec === null || !selectedFileRef.current) return;

    setSubmitting(true);
    setFileError(null);
    try {
      await processFakePayment(totalPrice);
      const userId = session?.id ?? studentId;
      const mediaUrl = await uploadFeedbackMedia(userId, selectedFileRef.current);

      const order = await saveFeedbackOrder({
        studentId,
        masterId: master.id,
        priceAtPurchase: totalPrice,
        studentMessage: message || "피드백 부탁드립니다.",
        mediaLabel: mediaLabel || fileName,
        mediaType,
        mediaDurationSec: durationSec,
        extraDurationFee: extraFee > 0 ? extraFee : undefined,
        mediaUrl,
      });
      setPaymentOpen(false);
      router.push(`/feedback/${order.id}?submitted=1`);
    } catch {
      setFileError("파일 업로드 또는 결제 처리에 실패했어요. 다시 시도해 주세요.");
    } finally {
      setSubmitting(false);
    }
  };

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
                음성/영상 피드백
              </h3>
            </div>
          </div>
        </section>

        <section className="border-b border-surface px-6 py-6">
          <h2 className="mb-2 text-[18px] font-bold tracking-tight text-gray-900">
            연습 파일 업로드
          </h2>
          <p className="mb-4 flex items-center gap-1.5 text-[12px] leading-none text-gray-500">
            <i className="fa-solid fa-circle-info shrink-0 text-[11px] text-gray-400" />
            <span>
              <span className="font-semibold text-gray-600">{includedMin}분 이내</span> 파일 업로드
              가능 · 초과 시{" "}
              <span className="font-semibold text-gray-600">
                5분당 {formatPrice(extraPer5Min)}원
              </span>
            </span>
          </p>

          <div className="mb-4 flex gap-2">
            {(["audio", "video"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => {
                  setMediaType(t);
                  setFileName(null);
                  setDurationSec(null);
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
            className={`flex w-full flex-col items-center gap-2 rounded-[16px] border-2 border-dashed py-10 transition-colors ${
              fileName
                ? "border-brand-200 bg-brand-50/40"
                : "border-gray-200 bg-surface hover:border-brand-300"
            }`}
          >
            {loadingDuration ? (
              <span className="text-[14px] font-medium text-gray-500">파일 분석 중...</span>
            ) : fileName ? (
              <>
                <i className="fa-solid fa-circle-check text-2xl text-brand-500" />
                <span className="max-w-full truncate px-4 text-[14px] font-bold text-gray-800">
                  {fileName}
                </span>
                {durationSec !== null && (
                  <span
                    className={`text-[13px] font-semibold ${
                      isOverLimit ? "text-amber-600" : "text-brand-500"
                    }`}
                  >
                    재생 시간 {formatMediaDuration(durationSec)}
                    {isOverLimit
                      ? ` · ${includedMin}분 초과 ${extraMinutes}분`
                      : ` · 기본 요금 적용`}
                  </span>
                )}
              </>
            ) : (
              <>
                <i className="fa-solid fa-cloud-arrow-up text-2xl text-gray-400" />
                <span className="text-[14px] font-bold text-gray-600">탭하여 파일 선택</span>
                <span className="text-[12px] text-gray-400">
                  {mediaType === "audio" ? "mp3, m4a, wav" : "mp4, mov"} · 최대 {includedMin}분 기본
                </span>
              </>
            )}
          </button>

          {isOverLimit && durationSec !== null && (
            <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-[13px] leading-relaxed text-amber-800">
              <i className="fa-solid fa-circle-info mr-1" />
              {includedMin}분을 초과하는 파일이에요. 초과 {extraMinutes}분 ·{" "}
              {extraBlocks}구간(5분 단위)에 대해 <strong>{formatPrice(extraFee)}원</strong>이
              추가됩니다.
            </div>
          )}

          {fileError && (
            <p className="mt-3 text-[13px] font-medium text-red-500">{fileError}</p>
          )}

          <input
            value={mediaLabel}
            onChange={(e) => setMediaLabel(e.target.value)}
            placeholder="곡명 / 연습 제목"
            className="mt-4 w-full rounded-xl border border-gray-100 bg-surface px-4 py-3 text-[14px] outline-none focus:border-brand-500"
          />
        </section>

        <section className="border-b border-surface px-6 py-8">
          <h2 className="mb-4 text-[18px] font-bold tracking-tight text-gray-900">
            고민 적기 <span className="text-[14px] font-normal text-gray-400">(선택)</span>
          </h2>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={4}
            placeholder="마스터에게 전달할 고민이나 원하는 코칭 방향을 적어주세요."
            className="h-28 w-full resize-none rounded-[16px] border border-gray-100 bg-surface p-4 text-[14px] outline-none placeholder:text-gray-400 focus:border-brand-500"
          />
        </section>

        <section className="bg-surface/50 px-6 py-8">
          <h2 className="mb-5 text-[18px] font-bold tracking-tight text-gray-900">결제 금액</h2>
          <div className="mb-3 flex justify-between">
            <span className="text-[15px] font-medium text-gray-600">
              피드백 기본 ({includedMin}분 이내)
            </span>
            <span className="text-[16px] font-bold text-gray-900">{formatPrice(basePrice)}원</span>
          </div>
          {extraFee > 0 && (
            <div className="mb-3 flex justify-between">
              <span className="text-[15px] font-medium text-amber-700">
                초과 요금 ({extraBlocks}구간 · 5분당)
              </span>
              <span className="text-[16px] font-bold text-amber-700">+{formatPrice(extraFee)}원</span>
            </div>
          )}
          <div className="flex justify-between border-t border-gray-200 pt-4">
            <span className="text-[16px] font-bold text-gray-900">최종 결제 금액</span>
            <span className="text-[22px] font-extrabold tracking-tight text-brand-500">
              {formatPrice(totalPrice)}
              <span className="ml-0.5 text-[16px] font-bold text-gray-900">원</span>
            </span>
          </div>
          <p className="mt-3 text-[11px] leading-relaxed text-gray-400">
            결제 시점 요금이 고정됩니다. 이후 강사가 요금을 변경해도 이 주문 금액은 변하지 않아요.
          </p>
          <div className="mt-3">
            <MvpPaymentNotice />
          </div>
        </section>
      </main>

      <div className="mt-auto border-t border-gray-100 bg-white p-5 pb-8">
        <button
          type="button"
          onClick={() => void handlePay()}
          disabled={loadingDuration || submitting}
          className="shadow-float flex h-14 w-full items-center justify-center gap-2 rounded-[16px] bg-gray-900 text-[16px] font-bold text-white hover:bg-gray-800 disabled:opacity-50"
        >
          {submitting ? "처리 중..." : `${formatPrice(totalPrice)}원 테스트 결제`}
        </button>
      </div>

      <FakePaymentSheet
        open={paymentOpen}
        productLabel="음성/영상 피드백"
        amount={totalPrice}
        processing={submitting}
        onClose={() => setPaymentOpen(false)}
        onConfirm={() => void confirmPay()}
      />
    </div>
  );
}
