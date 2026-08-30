const KEY = "eum_attendance_v1";

function readDates(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    return JSON.parse(raw) as string[];
  } catch {
    return [];
  }
}

function writeDates(dates: string[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(dates));
  window.dispatchEvent(new CustomEvent("eum-attendance-updated"));
}

function toDateKey(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function markAttendanceToday() {
  const key = toDateKey();
  const dates = readDates();
  if (!dates.includes(key)) {
    writeDates([key, ...dates]);
  }
}

export function getWeekAttendance(reference = new Date()) {
  const day = reference.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  const monday = new Date(reference);
  monday.setHours(0, 0, 0, 0);
  monday.setDate(reference.getDate() + mondayOffset);

  const attended = new Set(readDates());
  const labels = ["월", "화", "수", "목", "금"] as const;

  return labels.map((label, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    const key = toDateKey(d);
    const isToday = key === toDateKey(reference);
    return { label, key, attended: attended.has(key), isToday };
  });
}

export function isWeekAttendanceComplete(reference = new Date()) {
  return getWeekAttendance(reference).every((d) => d.attended);
}
