const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"] as const;

const DEFAULT_TIMES = [
  "10:00",
  "11:00",
  "14:00",
  "14:30",
  "15:00",
  "19:00",
  "19:30",
  "20:00",
  "21:00",
];

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

function toDateKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function getBookingDateOptions(count = 7): BookingDateOption[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const options: BookingDateOption[] = [];

  for (let i = 0; i < count; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    const isSunday = d.getDay() === 0;
    options.push({
      key: toDateKey(d),
      label: WEEKDAYS[d.getDay()],
      day: d.getDate(),
      disabled: isSunday,
    });
  }

  return options;
}

export function getBookingTimeOptions(
  dateKey: string,
  bookedAt: string[] = [],
): BookingTimeOption[] {
  const now = new Date();
  const [y, m, day] = dateKey.split("-").map(Number);
  const bookedSet = new Set(
    bookedAt.map((iso) => {
      const d = new Date(iso);
      return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
    }),
  );

  return DEFAULT_TIMES.map((value) => {
    const [h, min] = value.split(":").map(Number);
    const slot = new Date(y, m - 1, day, h, min, 0, 0);
    const past = slot.getTime() <= now.getTime();
    return {
      value,
      disabled: past || bookedSet.has(value),
    };
  });
}

export function buildScheduledAt(dateKey: string, time: string) {
  const [y, m, day] = dateKey.split("-").map(Number);
  const [h, min] = time.split(":").map(Number);
  return new Date(y, m - 1, day, h, min, 0, 0).toISOString();
}

export function pickFirstAvailableDate(dates: BookingDateOption[]) {
  return dates.find((d) => !d.disabled)?.key ?? dates[0]?.key ?? toDateKey(new Date());
}

export function pickFirstAvailableTime(times: BookingTimeOption[]) {
  return times.find((t) => !t.disabled)?.value ?? times[0]?.value ?? "19:00";
}
