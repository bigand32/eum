"use client";

import { useEffect, useState } from "react";
import { useStudentId } from "@/lib/auth/use-student-id";
import {
  PARTNER_INQUIRY_EMAIL,
  PARTNER_INQUIRY_MAX,
  partnerInquiryError,
  submitPartnerInquiry,
} from "@/lib/partner-inquiry";

const FIELD_CLASS =
  "w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-[14px] text-gray-800 placeholder:text-gray-400 focus:border-brand-300 focus:outline-none";

type Props = {
  open: boolean;
  onClose: () => void;
};

export function PartnerInquiryModal({ open, onClose }: Props) {
  const studentId = useStudentId();
  const [academyName, setAcademyName] = useState("");
  const [address, setAddress] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  // 닫힐 때 입력·상태 초기화
  useEffect(() => {
    if (open) return;
    setAcademyName("");
    setAddress("");
    setMessage("");
    setSaving(false);
    setError(null);
    setDone(false);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const handleSubmit = async () => {
    const input = { academyName, address, message };
    const invalid = partnerInquiryError(input);
    if (invalid) {
      setError(invalid);
      return;
    }
    if (!studentId) {
      setError("로그인 정보를 확인하는 중이에요. 잠시 후 다시 시도해 주세요.");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await submitPartnerInquiry(input, studentId);
      setDone(true);
    } catch {
      setError("신청을 접수하지 못했어요. 잠시 후 다시 시도해 주세요.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[80] mx-auto max-w-[400px]">
      <button
        type="button"
        aria-label="닫기"
        onClick={onClose}
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
      />
      <div className="absolute inset-x-0 bottom-0 flex flex-col justify-end">
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="partner-inquiry-title"
          className="shadow-float no-scrollbar max-h-[88vh] overflow-y-auto rounded-t-[28px] bg-white px-5 pt-5 pb-[max(2.5rem,env(safe-area-inset-bottom))]"
        >
          <div className="mb-4 flex items-center justify-between">
            <h3 id="partner-inquiry-title" className="text-[18px] font-bold text-gray-900">
              보컬학원 파트너 신청
            </h3>
            <button
              type="button"
              onClick={onClose}
              aria-label="닫기"
              className="flex h-8 w-8 items-center justify-center rounded-full bg-surface text-gray-500"
            >
              <i className="fa-solid fa-xmark" />
            </button>
          </div>

          {done ? (
            <div className="py-2 text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-brand-50 text-brand-500">
                <i className="fa-solid fa-check text-[18px]" />
              </div>
              <p className="text-[15px] font-bold text-gray-900">신청이 접수됐어요</p>
              <p className="mt-1 text-[13px] leading-relaxed text-gray-500">
                담당자가 영업일 2일 안에 연락드릴게요.
              </p>
              <button
                type="button"
                onClick={onClose}
                className="mt-5 w-full rounded-xl bg-brand-500 py-3.5 text-[15px] font-bold text-white hover:bg-brand-600"
              >
                확인
              </button>
            </div>
          ) : (
            <>
              <p className="mb-4 text-[12px] leading-relaxed text-gray-500">
                eum과 함께 수강생을 만나보세요. 아래 정보를 남겨 주시면 담당자가 연락드려요.
              </p>

              <div className="flex flex-col gap-3">
                <label className="flex flex-col gap-1.5">
                  <span className="text-[13px] font-bold text-gray-800">학원명</span>
                  <input
                    type="text"
                    value={academyName}
                    onChange={(e) => setAcademyName(e.target.value)}
                    placeholder="예) 한음 실용음악학원 강남점"
                    maxLength={PARTNER_INQUIRY_MAX.academyName}
                    className={FIELD_CLASS}
                  />
                </label>

                <label className="flex flex-col gap-1.5">
                  <span className="text-[13px] font-bold text-gray-800">주소</span>
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="예) 서울 강남구 테헤란로 1길 2, 3층"
                    maxLength={PARTNER_INQUIRY_MAX.address}
                    className={FIELD_CLASS}
                  />
                </label>

                <label className="flex flex-col gap-1.5">
                  <span className="text-[13px] font-bold text-gray-800">문의 내역</span>
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="강사 수, 원하는 제휴 형태, 궁금한 점을 적어 주세요."
                    maxLength={PARTNER_INQUIRY_MAX.message}
                    rows={4}
                    className={`${FIELD_CLASS} resize-none`}
                  />
                  <span className="self-end text-[11px] text-gray-400 tabular-nums">
                    {message.length} / {PARTNER_INQUIRY_MAX.message}
                  </span>
                </label>
              </div>

              {error && (
                <p className="mt-3 text-center text-[12px] font-medium text-red-500">
                  {error}
                  <br />
                  <a href={`mailto:${PARTNER_INQUIRY_EMAIL}`} className="underline">
                    {PARTNER_INQUIRY_EMAIL}
                  </a>
                  로 보내주셔도 됩니다.
                </p>
              )}

              <button
                type="button"
                disabled={saving}
                onClick={handleSubmit}
                className="mt-4 w-full rounded-xl bg-brand-500 py-3.5 text-[15px] font-bold text-white hover:bg-brand-600 disabled:opacity-50"
              >
                {saving ? "보내는 중..." : "신청 보내기"}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
