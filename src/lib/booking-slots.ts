import { DEFAULT_BOOKING_TIMES } from "@/lib/db/schema";

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"] as const;

/** 마스터가 고를 수 있는 후보 시간 (30분 단위) */
export const BOOKING_TIME_OPTIONS: string[] = (() => {
  const times: string[] = [];
  for (let h = 9; h <= 22; h++) {
    for (const min of [0, 30]) {
      if (h === 22 && min === 30) continue;
      times.push(`${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`);
    }
  }
  return times;
})();

/** 오늘부터 예약 가능한 일수 */
export const BOOKING_HORIZON_DAYS = 60;

export type BookingDateOption = {
  key: string;
  label: string;
  day: number;
  disabled: boolean;
};

export type BookingTimeOption = {
  value: string;
  disabled: boolean;
};

export type CalendarDayCell = {
  key: string;
  day: number;
  inMonth: boolean;
  disabled: boolean;
  /** 예약 가능한 시간대가 하나라도 있음 */
  hasSlot: boolean;
  isToday: boolean;
  isOffDate?: boolean;
};

function startOfDay(d: Date) {
  const next = new Date(d);
  next.setHours(0, 0, 0, 0);
  return next;
}

export function toDateKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function parseDateKey(key: string) {
  const [y, m, day] = key.split("-").map(Number);
  return new Date(y, m - 1, day);
}

export function formatMonthLabel(year: number, monthIndex: number) {
  return `${year}년 ${monthIndex + 1}월`;
}

export function shiftMonth(year: number, monthIndex: number, delta: number) {
  const d = new Date(year, monthIndex + delta, 1);
  return { year: d.getFullYear(), monthIndex: d.getMonth() };
}

/** 기본 휴무: 일요일 (기존 동작 유지) */
export const DEFAULT_BOOKING_OFF_WEEKDAYS = [0];

function resolveTimes(bookingTimes?: string[]) {
  return bookingTimes?.length ? bookingTimes : [...DEFAULT_BOOKING_TIMES];
}

function isDateBookable(
  d: Date,
  today: Date,
  horizonEnd: Date,
  offWeekdays: number[] = DEFAULT_BOOKING_OFF_WEEKDAYS,
  offDates: string[] = [],
) {
  const day = startOfDay(d);
  if (day.getTime() < today.getTime()) return false;
  if (day.getTime() > horizonEnd.getTime()) return false;
  if (offWeekdays.includes(day.getDay())) return false;
  if (offDates.includes(toDateKey(day))) return false;
  return true;
}

function horizonFrom(today: Date) {
  const end = new Date(today);
  end.setDate(today.getDate() + BOOKING_HORIZON_DAYS);
  return end;
}

/** 가로 스크롤용 (레거시) */
export function getBookingDateOptions(
  count = 7,
  offWeekdays: number[] = DEFAULT_BOOKING_OFF_WEEKDAYS,
  offDates: string[] = [],
): BookingDateOption[] {
  const today = startOfDay(new Date());
  const horizonEnd = horizonFrom(today);
  const options: BookingDateOption[] = [];

  for (let i = 0; i < count; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    options.push({
      key: toDateKey(d),
      label: WEEKDAYS[d.getDay()],
      day: d.getDate(),
      disabled: !isDateBookable(d, today, horizonEnd, offWeekdays, offDates),
    });
  }

  return options;
}

export function getBookingTimeOptions(
  dateKey: string,
  bookedAt: string[] = [],
  offWeekdays: number[] = DEFAULT_BOOKING_OFF_WEEKDAYS,
  bookingTimes?: string[],
  offDates: string[] = [],
): BookingTimeOption[] {
  const now = new Date();
  const [y, m, day] = dateKey.split("-").map(Number);
  const date = new Date(y, m - 1, day);
  const today = startOfDay(now);
  const horizonEnd = horizonFrom(today);
  const times = resolveTimes(bookingTimes);

  if (!isDateBookable(date, today, horizonEnd, offWeekdays, offDates)) {
    return times.map((value) => ({ value, disabled: true }));
  }

  const bookedSet = new Set(
    bookedAt
      .filter((iso) => toDateKey(new Date(iso)) === dateKey)
      .map((iso) => {
        const d = new Date(iso);
        return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
      }),
  );

  return times.map((value) => {
    const [h, min] = value.split(":").map(Number);
    const slot = new Date(y, m - 1, day, h, min, 0, 0);
    const past = slot.getTime() <= now.getTime();
    return {
      value,
      disabled: past || bookedSet.has(value),
    };
  });
}

export function buildMonthGrid(
  year: number,
  monthIndex: number,
  bookedAt: string[] = [],
  offWeekdays: number[] = DEFAULT_BOOKING_OFF_WEEKDAYS,
  bookingTimes?: string[],
  offDates: string[] = [],
): CalendarDayCell[] {
  const today = startOfDay(new Date());
  const todayKey = toDateKey(today);
  const horizonEnd = horizonFrom(today);
  const offSet = new Set(offDates);

  const first = new Date(year, monthIndex, 1);
  const startPad = first.getDay(); // 0=일
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const cells: CalendarDayCell[] = [];

  // 이전 달 패딩
  for (let i = 0; i < startPad; i++) {
    const d = new Date(year, monthIndex, -startPad + i + 1);
    cells.push({
      key: toDateKey(d),
      day: d.getDate(),
      inMonth: false,
      disabled: true,
      hasSlot: false,
      isToday: false,
    });
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const d = new Date(year, monthIndex, day);
    const key = toDateKey(d);
    const bookable = isDateBookable(d, today, horizonEnd, offWeekdays, offDates);
    const times = bookable
      ? getBookingTimeOptions(key, bookedAt, offWeekdays, bookingTimes, offDates)
      : [];
    const hasSlot = times.some((t) => !t.disabled);
    cells.push({
      key,
      day,
      inMonth: true,
      disabled: !bookable || !hasSlot,
      hasSlot,
      isToday: key === todayKey,
      isOffDate: offSet.has(key),
    });
  }

  // 다음 달 패딩 (6주 그리드)
  while (cells.length % 7 !== 0) {
    const last = cells[cells.length - 1];
    const d = parseDateKey(last.key);
    d.setDate(d.getDate() + 1);
    cells.push({
      key: toDateKey(d),
      day: d.getDate(),
      inMonth: false,
      disabled: true,
      hasSlot: false,
      isToday: false,
    });
  }

  return cells;
}

/** 마스터 휴무일 선택용 월 그리드 (과거 날짜 비활성) */
export function buildOffDatePickerGrid(
  year: number,
  monthIndex: number,
  offDates: string[] = [],
): CalendarDayCell[] {
  const today = startOfDay(new Date());
  const todayKey = toDateKey(today);
  const offSet = new Set(offDates);
  const first = new Date(year, monthIndex, 1);
  const startPad = first.getDay();
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const cells: CalendarDayCell[] = [];

  for (let i = 0; i < startPad; i++) {
    const d = new Date(year, monthIndex, -startPad + i + 1);
    cells.push({
      key: toDateKey(d),
      day: d.getDate(),
      inMonth: false,
      disabled: true,
      hasSlot: false,
      isToday: false,
    });
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const d = new Date(year, monthIndex, day);
    const key = toDateKey(d);
    const past = startOfDay(d).getTime() < today.getTime();
    cells.push({
      key,
      day,
      inMonth: true,
      disabled: past,
      hasSlot: false,
      isToday: key === todayKey,
      isOffDate: offSet.has(key),
    });
  }

  while (cells.length % 7 !== 0) {
    const last = cells[cells.length - 1];
    const d = parseDateKey(last.key);
    d.setDate(d.getDate() + 1);
    cells.push({
      key: toDateKey(d),
      day: d.getDate(),
      inMonth: false,
      disabled: true,
      hasSlot: false,
      isToday: false,
    });
  }

  return cells;
}

export function buildScheduledAt(dateKey: string, time: string) {
  const [y, m, day] = dateKey.split("-").map(Number);
  const [h, min] = time.split(":").map(Number);
  return new Date(y, m - 1, day, h, min, 0, 0).toISOString();
}

export function pickFirstAvailableDate(
  dates: BookingDateOption[] | CalendarDayCell[],
) {
  const found = dates.find((d) => !d.disabled);
  if (found) return found.key;
  return toDateKey(new Date());
}

export function pickFirstAvailableTime(times: BookingTimeOption[]) {
  return times.find((t) => !t.disabled)?.value ?? times[0]?.value ?? "19:00";
}

export function pickFirstAvailableDateInRange(
  bookedAt: string[] = [],
  offWeekdays: number[] = DEFAULT_BOOKING_OFF_WEEKDAYS,
  bookingTimes?: string[],
  offDates: string[] = [],
) {
  const today = startOfDay(new Date());
  for (let i = 0; i <= BOOKING_HORIZON_DAYS; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    const key = toDateKey(d);
    const times = getBookingTimeOptions(
      key,
      bookedAt,
      offWeekdays,
      bookingTimes,
      offDates,
    );
    if (times.some((t) => !t.disabled)) return key;
  }
  return toDateKey(today);
}

export function prunePastOffDates(offDates: string[], today = new Date()): string[] {
  const todayKey = toDateKey(startOfDay(today));
  return offDates.filter((d) => d >= todayKey);
}

export function formatOffDateLabel(dateKey: string) {
  const [y, m, day] = dateKey.split("-").map(Number);
  const d = new Date(y, m - 1, day);
  return `${m}월 ${day}일 (${WEEKDAYS[d.getDay()]})`;
}

export { WEEKDAYS };
