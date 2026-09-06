import type { PracticeRecord } from "@/lib/db/schema";
import { isSupabaseConfigured } from "@/lib/supabase/config";

const KEY = "eum_attendance_v1";

function toDateKey(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function readLocalDates(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    return JSON.parse(raw) as string[];
  } catch {
    return [];
  }
}

function writeLocalDates(dates: string[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(dates));
  window.dispatchEvent(new CustomEvent("eum-attendance-updated"));
}

function datesFromPracticeRecords(records: PracticeRecord[], studentId: string) {
  return records
    .filter((record) => record.studentId === studentId)
    .map((record) => toDateKey(new Date(record.createdAt)));
}

export function markAttendanceToday() {
  if (isSupabaseConfigured()) return;

  const key = toDateKey();
  const dates = readLocalDates();
  if (!dates.includes(key)) {
    writeLocalDates([key, ...dates]);
  }
}

export function getWeekAttendance(
  reference = new Date(),
  options?: { practiceRecords?: PracticeRecord[]; studentId?: string },
) {
  const day = reference.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  const monday = new Date(reference);
  monday.setHours(0, 0, 0, 0);
  monday.setDate(reference.getDate() + mondayOffset);

  const attended = new Set(
    isSupabaseConfigured() && options?.practiceRecords && options.studentId
      ? datesFromPracticeRecords(options.practiceRecords, options.studentId)
      : readLocalDates(),
  );

  const labels = ["월", "화", "수", "목", "금"] as const;

  return labels.map((label, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    const key = toDateKey(d);
    const isToday = key === toDateKey(reference);
    return { label, key, attended: attended.has(key), isToday };
  });
}

export function isWeekAttendanceComplete(
  reference = new Date(),
  options?: { practiceRecords?: PracticeRecord[]; studentId?: string },
) {
  return getWeekAttendance(reference, options).every((d) => d.attended);
}
