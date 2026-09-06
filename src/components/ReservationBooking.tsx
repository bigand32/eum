"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  FakePaymentSheet,
  type FakePaymentResult,
} from "@/components/FakePaymentSheet";
import { saveReservation, useStudentCouponClaim } from "@/lib/db/api";
import { formatPrice } from "@/lib/db/schema";
import { useDb } from "@/lib/db/use-db";
import { useStudentId } from "@/lib/auth/use-student-id";
import {
  BOOKING_HORIZON_DAYS,
  WEEKDAYS,
  buildMonthGrid,
  buildScheduledAt,
  formatMonthLabel,
  getBookingTimeOptions,
  pickFirstAvailableDateInRange,
  pickFirstAvailableTime,
  shiftMonth,
} from "@/lib/booking-slots";
import { getPhonePrice, PHONE_DURATIONS, type PhoneDurationMin } from "@/lib/phone-pricing";
import { processFakePayment } from "@/lib/payment/fake-payment";
import { DEFAULT_BOOKING_TIMES, DEFAULT_OFF_WEEKDAYS } from "@/lib/db/schema";

export function ReservationBooking({ masterId }: { masterId: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const db = useDb();
  const studentId = useStudentId();
  const [submitting, setSubmitting] = useState(false);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const master = db.masters.find((m) => m.id === masterId);
  const type = searchParams.get("type") === "visit" ? "visit" : "phone";

  const pricing = master?.pricing;
  const offWeekdays = master?.offWeekdays ?? DEFAULT_OFF_WEEKDAYS;
  const bookingTimes = master?.bookingTimes ?? DEFAULT_BOOKING_TIMES;
  const offDates = master?.offDates ?? [];
  const [phoneDuration, setPhoneDuration] = useState<PhoneDurationMin>(30);

  const duration =
    type === "phone" ? phoneDuration : (pricing?.visitDurationMin ?? 60);
  const title = type === "phone" ? "전화 상담" : "방문 상담";
  const amount =
    type === "phone" && pricing
      ? getPhonePrice(pricing, phoneDuration)
      : (pricing?.visitPrice ?? 0);

  const bookedSlots = useMemo(
    () =>
      db.reservations
        .filter((r) => r.masterId === masterId && r.status === "scheduled")
        .map((r) => r.scheduledAt),
    [db.reservations, masterId],
  );

  const initialDateKey = useMemo(
    () => pickFirstAvailableDateInRange(bookedSlots, offWeekdays, bookingTimes, offDates),
    [bookedSlots, offWeekdays, bookingTimes, offDates],
  );
  const [selectedDateKey, setSelectedDateKey] = useState(initialDateKey);
  const initialMonth = useMemo(() => {
    const [y, m] = initialDateKey.split("-").map(Number);
    return { year: y, monthIndex: m - 1 };
  }, [initialDateKey]);
  const [viewYear, setViewYear] = useState(initialMonth.year);
  const [viewMonth, setViewMonth] = useState(initialMonth.monthIndex);

  const calendarDays = useMemo(
    () =>
      buildMonthGrid(
        viewYear,
        viewMonth,
        bookedSlots,
        offWeekdays,
        bookingTimes,
        offDates,
      ),
    [viewYear, viewMonth, bookedSlots, offWeekdays, bookingTimes, offDates],
  );

  const timeOptions = useMemo(
    () =>
      getBookingTimeOptions(
        selectedDateKey,
        bookedSlots,
        offWeekdays,
        bookingTimes,
        offDates,
      ),
    [selectedDateKey, bookedSlots, offWeekdays, bookingTimes, offDates],
  );
  const [selectedTime, setSelectedTime] = useState(() =>
    pickFirstAvailableTime(
      getBookingTimeOptions(
        initialDateKey,
        bookedSlots,
        offWeekdays,
        bookingTimes,
        offDates,
      ),
    ),
  );
  const [preQuestion, setPreQuestion] = useState("");

  useEffect(() => {
    setSelectedTime(pickFirstAvailableTime(timeOptions));
  }, [selectedDateKey, timeOptions]);

  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);
  const minMonth = { year: today.getFullYear(), monthIndex: today.getMonth() };
  const maxDate = useMemo(() => {
    const d = new Date(today);
    d.setDate(today.getDate() + BOOKING_HORIZON_DAYS);
    return d;
  }, [today]);
  const maxMonth = { year: maxDate.getFullYear(), monthIndex: maxDate.getMonth() };

  const canPrevMonth =
    viewYear > minMonth.year ||
    (viewYear === minMonth.year && viewMonth > minMonth.monthIndex);
  const canNextMonth =
    viewYear < maxMonth.year ||
    (viewYear === maxMonth.year && viewMonth < maxMonth.monthIndex);

  const scheduledAt = useMemo(
    () => buildScheduledAt(selectedDateKey, selectedTime),
    [selectedDateKey, selectedTime],
  );

  const selectedLabel = useMemo(() => {
    const [y, m, day] = selectedDateKey.split("-").map(Number);
    const d = new Date(y, m - 1, day);
    return `${m}월 ${day}일 (${WEEKDAYS[d.getDay()]})`;
  }, [selectedDateKey]);

  const handleBook = async (payment: FakePaymentResult) => {
    if (!master) return;
    setSubmitting(true);
    try {
      await processFakePayment(payment.amount);
      await saveReservation({
        studentId,
        masterId: master.id,
        type,
        priceAtPurchase: payment.amount,
        durationMin: type === "phone" ? phoneDuration : pricing?.visitDurationMin,
        scheduledAt,
        preQuestion: preQuestion || undefined,
      });
      if (payment.claimId) {
        await useStudentCouponClaim(payment.claimId);
      }
      setPaymentOpen(false);
      router.push("/reservation?booked=1");
    } finally {
      setSubmitting(false);
    }
  };

  if (!master) return <p className="p-6 text-center text-gray-400">로딩 중…</p>;

  return (
    <div className="flex min-h-dvh flex-col">
      <main className="flex flex-col pb-4">
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
              <p className="mt-1 text-[14px] font-bold text-gray-700">
                {formatPrice(amount)}원
              </p>
            </div>
          </div>
        </section>

        {type === "phone" && pricing && (
          <section className="border-b border-surface px-6 py-6">
            <h2 className="mb-4 text-[18px] font-bold tracking-tight text-gray-900">상담 시간</h2>
            <div className="grid grid-cols-2 gap-3">
              {PHONE_DURATIONS.map((min) => {
                const selected = phoneDuration === min;
                const price = getPhonePrice(pricing, min);
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
                    <div className="mt-1 text-[13px] font-medium text-gray-500">
                      {formatPrice(price)}원
                    </div>
                  </button>
                );
              })}
            </div>
          </section>
        )}

        <section className="border-b border-surface px-6 py-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-[18px] font-bold tracking-tight text-gray-900">날짜 선택</h2>
            <p className="text-[12px] font-medium text-brand-500">{selectedLabel}</p>
          </div>

          <div className="mb-3 flex items-center justify-between">
            <button
              type="button"
              disabled={!canPrevMonth}
              onClick={() => {
                const next = shiftMonth(viewYear, viewMonth, -1);
                setViewYear(next.year);
                setViewMonth(next.monthIndex);
              }}
              className="flex h-9 w-9 items-center justify-center rounded-full text-gray-600 hover:bg-gray-50 disabled:opacity-30"
              aria-label="이전 달"
            >
              <i className="fa-solid fa-chevron-left text-[13px]" />
            </button>
            <p className="text-[16px] font-extrabold text-gray-900">
              {formatMonthLabel(viewYear, viewMonth)}
            </p>
            <button
              type="button"
              disabled={!canNextMonth}
              onClick={() => {
                const next = shiftMonth(viewYear, viewMonth, 1);
                setViewYear(next.year);
                setViewMonth(next.monthIndex);
              }}
              className="flex h-9 w-9 items-center justify-center rounded-full text-gray-600 hover:bg-gray-50 disabled:opacity-30"
              aria-label="다음 달"
            >
              <i className="fa-solid fa-chevron-right text-[13px]" />
            </button>
          </div>

          <div className="mb-1 grid grid-cols-7">
            {WEEKDAYS.map((w) => (
              <div
                key={w}
                className={`py-2 text-center text-[12px] font-bold ${
                  w === "일" ? "text-red-400" : w === "토" ? "text-brand-500" : "text-gray-400"
                }`}
              >
                {w}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-y-1">
            {calendarDays.map((cell, index) => {
              const selected = selectedDateKey === cell.key && cell.inMonth;
              const [y, m, dayNum] = cell.key.split("-").map(Number);
              const weekday = new Date(y, m - 1, dayNum).getDay();
              const sunday = weekday === 0;
              return (
                <button
                  key={`${cell.key}-${index}`}
                  type="button"
                  disabled={cell.disabled || !cell.inMonth}
                  onClick={() => setSelectedDateKey(cell.key)}
                  className={`relative mx-auto flex h-11 w-11 flex-col items-center justify-center rounded-full text-[14px] font-bold transition-colors ${
                    !cell.inMonth
                      ? "text-transparent"
                      : cell.disabled
                        ? "cursor-not-allowed text-gray-300"
                        : selected
                          ? "bg-brand-500 text-white"
                          : cell.isToday
                            ? "bg-brand-50 text-brand-600"
                            : sunday
                              ? "text-red-400"
                              : "text-gray-900 hover:bg-gray-50"
                  }`}
                >
                  {cell.inMonth ? cell.day : ""}
                  {cell.inMonth && cell.hasSlot && !cell.disabled && !selected && (
                    <span className="absolute bottom-1 h-1 w-1 rounded-full bg-brand-500" />
                  )}
                  {cell.inMonth && selected && cell.hasSlot && (
                    <span className="absolute bottom-1 h-1 w-1 rounded-full bg-white" />
                  )}
                </button>
              );
            })}
          </div>

          <div className="mt-4 flex items-center gap-4 text-[11px] text-gray-400">
            <span className="inline-flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-brand-500" />
              예약 가능
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-gray-300" />
              예약 불가 · 휴무
            </span>
          </div>
        </section>

        <section className="border-b border-surface px-6 py-6">
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

        <section className="px-6 py-6">
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

      <div className="sticky bottom-0 mt-auto border-t border-gray-100 bg-white p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
        <button
          type="button"
          onClick={() => setPaymentOpen(true)}
          disabled={submitting || timeOptions.every((t) => t.disabled)}
          className="shadow-float h-14 w-full rounded-[16px] bg-gray-900 text-[16px] font-bold text-white hover:bg-gray-800 disabled:opacity-50"
        >
          {submitting ? "예약 중..." : `${formatPrice(amount)}원 결제하기`}
        </button>
      </div>

      <FakePaymentSheet
        open={paymentOpen}
        productLabel={`${title} · ${master.title}`}
        amount={amount}
        masterId={master.id}
        processing={submitting}
        onClose={() => !submitting && setPaymentOpen(false)}
        onConfirm={(result) => void handleBook(result)}
      />
    </div>
  );
}
