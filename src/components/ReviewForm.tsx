"use client";

import { useState } from "react";
import { saveStudentReview } from "@/lib/db/api";

export function ReviewForm({
  studentId,
  masterId,
  productLabel,
  onDone,
}: {
  studentId: string;
  masterId: string;
  productLabel: string;
  onDone: () => void;
}) {
  const [rating, setRating] = useState(5);
  const [text, setText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!text.trim()) {
      setError("리뷰 내용을 입력해 주세요.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await saveStudentReview({
        studentId,
        masterId,
        productLabel,
        rating,
        text: text.trim(),
      });
      onDone();
    } catch {
      setError("리뷰 저장에 실패했어요.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="rounded-[20px] border border-gray-100 bg-white p-5 shadow-soft">
      <h3 className="mb-1 text-[15px] font-bold text-gray-900">리뷰 남기기</h3>
      <p className="mb-4 text-[13px] text-gray-500">피드백은 어떠셨나요?</p>

      <div className="mb-4 flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => setRating(star)}
            className="text-[22px] text-brand-500"
            aria-label={`${star}점`}
          >
            <i className={`fa-${star <= rating ? "solid" : "regular"} fa-star`} />
          </button>
        ))}
      </div>

      <textarea
        rows={3}
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          setError(null);
        }}
        placeholder="코칭 경험을 공유해 주세요"
        className="mb-3 w-full resize-none rounded-xl border border-gray-200 p-3 text-[14px] outline-none focus:border-brand-500"
      />

      {error && <p className="mb-2 text-[12px] text-red-500">{error}</p>}

      <button
        type="button"
        disabled={submitting}
        onClick={() => void handleSubmit()}
        className="w-full rounded-xl bg-gray-900 py-3 text-[14px] font-bold text-white disabled:opacity-50"
      >
        리뷰 등록
      </button>
    </div>
  );
}
