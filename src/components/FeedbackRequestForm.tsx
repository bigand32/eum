"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { saveFeedbackOrder } from "@/lib/db/api";
import type { Master } from "@/lib/db/schema";
import { useStudentId } from "@/lib/auth/use-student-id";
import { useSession } from "@/lib/auth/use-session";
import { uploadFeedbackMedia } from "@/lib/feedback-media";
import { isVideoFile } from "@/lib/feedback-pricing";

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
  const [fileError, setFileError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleFileSelect = (file: File | undefined) => {
    if (!file) return;
    setFileError(null);
    selectedFileRef.current = file;

    const type = isVideoFile(file) ? "video" : "audio";
    setMediaType(type);
    setFileName(file.name);

    if (!mediaLabel) {
      const nameWithoutExt = file.name.replace(/\.[^.]+$/, "");
      setMediaLabel(nameWithoutExt);
    }
  };

  const handleSubmit = async () => {
    if (!fileName || !selectedFileRef.current) {
      setFileError("음성·영상 파일을 먼저 선택해 주세요.");
      return;
    }

    const authUserId = session?.id;
    if (!authUserId) {
      setFileError("로그인이 필요해요. 다시 로그인해 주세요.");
      return;
    }
    if (!studentId) {
      setFileError("수강생 정보를 찾을 수 없어요. 다시 로그인해 주세요.");
      return;
    }

    setSubmitting(true);
    setFileError(null);
    try {
      const mediaUrl = await uploadFeedbackMedia(authUserId, selectedFileRef.current);

      const order = await saveFeedbackOrder({
        studentId,
        masterId: master.id,
        priceAtPurchase: 0,
        studentMessage: message || "피드백 부탁드립니다.",
        mediaLabel: mediaLabel || fileName,
        mediaType,
        mediaUrl,
      });
      router.push(`/feedback/${order.id}?submitted=1`);
    } catch {
      setFileError("파일 업로드에 실패했어요. 다시 시도해 주세요.");
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
            {fileName ? (
              <>
                <i className="fa-solid fa-circle-check text-2xl text-brand-500" />
                <span className="max-w-full truncate px-4 text-[14px] font-bold text-gray-800">
                  {fileName}
                </span>
                <span className="text-[13px] font-semibold text-brand-500">업로드 준비 완료</span>
              </>
            ) : (
              <>
                <i className="fa-solid fa-cloud-arrow-up text-2xl text-gray-400" />
                <span className="text-[14px] font-bold text-gray-600">탭하여 파일 선택</span>
              </>
            )}
          </button>

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
      </main>

      <div className="mt-auto border-t border-gray-100 bg-white p-5 pb-8">
        <button
          type="button"
          onClick={() => void handleSubmit()}
          disabled={submitting}
          className="shadow-float flex h-14 w-full items-center justify-center gap-2 rounded-[16px] bg-gray-900 text-[16px] font-bold text-white hover:bg-gray-800 disabled:opacity-50"
        >
          {submitting ? "업로드 중..." : "피드백 요청하기"}
        </button>
      </div>
    </div>
  );
}
