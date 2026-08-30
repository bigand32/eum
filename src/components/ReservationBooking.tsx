"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { saveReservation } from "@/lib/db/api";
import { useDb } from "@/lib/db/use-db";
import { useStudentId } from "@/lib/auth/use-student-id";
import {
  buildScheduledAt,
  getBookingDateOptions,
  getBookingTimeOptions,
  pickFirstAvailableDate,
  pickFirstAvailableTime,
} from "@/lib/booking-slots";
import { PHONE_DURATIONS, type PhoneDurationMin } from "@/lib/phone-pricing";

export function ReservationBooking({ masterId }: { masterId: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const db = useDb();
  const studentId = useStudentId();
  const [submitting, setSubmitting] = useState(false);
  const master = db.masters.find((m) => m.id === masterId);
  const type = searchParams.get("type") === "visit" ? "visit" : "phone";

  const pricing = master?.pricing;
  const [phoneDuration, setPhoneDuration] = useState<PhoneDurationMin>(30);

  const duration =
    type === "phone" ? phoneDuration : (pricing?.visitDurationMin ?? 60);
  const title = type === "phone" ? "전화 상담" : "방문 상담";

  const dateOptions = useMemo(() => getBookingDateOptions(7), []);
  const bookedSlots = useMemo(
    () =>
      db.reservations
        .filter((r) => r.masterId === masterId && r.status === "scheduled")
        .map((r) => r.scheduledAt),
    [db.reservations, masterId],
  );

  const [selectedDateKey, setSelectedDateKey] = useState(() =>
    pickFirstAvailableDate(dateOptions),
  );
  const timeOptions = useMemo(
    () => getBookingTimeOptions(selectedDateKey, bookedSlots),
    [selectedDateKey, bookedSlots],
  );
  const [selectedTime, setSelectedTime] = useState(() =>
    pickFirstAvailableTime(getBookingTimeOptions(pickFirstAvailableDate(dateOptions), bookedSlots)),
  );
  const [preQuestion, setPreQuestion] = useState("");

  useEffect(() => {
    const nextTime = pickFirstAvailableTime(timeOptions);
    setSelectedTime(nextTime);
  }, [selectedDateKey, timeOptions]);

  const scheduledAt = useMemo(
    () => buildScheduledAt(selectedDateKey, selectedTime),
    [selectedDateKey, selectedTime],
  );

  const handleBook = async () => {
    if (!master) return;
    setSubmitting(true);
    try {
      await saveReservation({
        studentId,
        masterId: master.id,
        type,
        priceAtPurchase: 0,
        durationMin: type === "phone" ? phoneDuration : pricing?.visitDurationMin,
        scheduledAt,
        preQuestion: preQuestion || undefined,
      });
      router.push("/reservation?booked=1");
    } finally {
      setSubmitting(false);
    }
  };

  if (!master) return <p className="p-6 text-center text-gray-400">로딩 중…</p>;

  return (
    <div className="flex min-h-dvh flex-col">
      <main className="flex flex-col">
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
                {title} ({duration}분)
              </h3>
            </div>
          </div>
        </section>

        {type === "phone" && pricing && (
          <section className="border-b border-surface px-6 py-8">
            <h2 className="mb-4 text-[18px] font-bold tracking-tight text-gray-900">상담 시간</h2>
            <div className="grid grid-cols-2 gap-3">
              {PHONE_DURATIONS.map((min) => {
                const selected = phoneDuration === min;
                return (
                  <button
                    key={min}
                    type="button"
                    onClick={() => setPhoneDuration(min)}
                    className={`rounded-[14px] border px-4 py-4 text-left transition-colors ${
                      selected
                        ? "border-brand-500 bg-brand-50"
                        : "border-gray-200 bg-white hover:border-gray-300"
                    }`}
                  >
                    <div
                      className={`text-[16px] font-extrabold ${
                        selected ? "text-brand-600" : "text-gray-900"
                      }`}
                    >
                      {min}분
                    </div>
                  </button>
                );
              })}
            </div>
          </section>
        )}

        <section className="border-b border-surface px-6 py-8">
          <h2 className="mb-4 text-[18px] font-bold tracking-tight text-gray-900">날짜 선택</h2>
          <div className="no-scrollbar flex gap-2.5 overflow-x-auto pb-2">
            {dateOptions.map((d) => (
              <button
                key={d.key}
                type="button"
                disabled={d.disabled}
                onClick={() => setSelectedDateKey(d.key)}
                className={`flex h-20 w-16 shrink-0 flex-col items-center justify-center rounded-[18px] border transition-all ${
                  d.disabled
                    ? "border-gray-100 bg-gray-50 opacity-50"
                    : selectedDateKey === d.key
                      ? "border-gray-900 bg-gray-900 text-white"
                      : "border-gray-200"
                }`}
              >
                <span
                  className={`mb-1 text-[12px] font-semibold ${selectedDateKey === d.key ? "text-white" : "text-gray-400"}`}
                >
                  {d.label}
                </span>
                <strong className="text-[20px] font-extrabold">{d.day}</strong>
              </button>
            ))}
          </div>
        </section>

        <section className="border-b border-surface px-6 py-8">
          <h2 className="mb-4 text-[18px] font-bold tracking-tight text-gray-900">시간 선택</h2>
          <div className="grid grid-cols-3 gap-3">
            {timeOptions.map((t) => (
              <button
                key={t.value}
                type="button"
                disabled={t.disabled}
                onClick={() => setSelectedTime(t.value)}
                className={`rounded-[14px] border py-3 text-center text-[15px] font-bold transition-colors ${
                  t.disabled
                    ? "cursor-not-allowed border-gray-100 bg-gray-50 text-gray-300"
                    : selectedTime === t.value
                      ? "border-brand-500 bg-brand-500 text-white"
                      : "border-gray-200 text-gray-700"
                }`}
              >
                {t.value}
              </button>
            ))}
          </div>
        </section>

        <section className="px-6 py-8">
          <h2 className="mb-4 text-[18px] font-bold tracking-tight text-gray-900">
            사전 질문 <span className="text-[14px] font-normal text-gray-400">(선택)</span>
          </h2>
          <textarea
            value={preQuestion}
            onChange={(e) => setPreQuestion(e.target.value)}
            rows={4}
            placeholder="상담 전에 미리 전달하고 싶은 내용을 적어주세요."
            className="h-28 w-full resize-none rounded-[16px] border border-gray-100 bg-surface p-4 text-[14px] outline-none focus:border-brand-500"
          />
        </section>
      </main>

      <div className="mt-auto border-t border-gray-100 bg-white p-5 pb-8">
        <button
          type="button"
          onClick={() => void handleBook()}
          disabled={submitting || timeOptions.every((t) => t.disabled)}
          className="shadow-float h-14 w-full rounded-[16px] bg-gray-900 text-[16px] font-bold text-white hover:bg-gray-800 disabled:opacity-50"
        >
          {submitting ? "예약 중..." : "예약하기"}
        </button>
      </div>
    </div>
  );
}
