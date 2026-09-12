"use client";

import { useEffect, useMemo, useState } from "react";
import { ensureMasterProfile, loadMaster, saveMasterSchedule } from "@/lib/db/api";
import { useDb } from "@/lib/db/use-db";
import { useDbReady } from "@/lib/db/db-provider";
import { useMasterId } from "@/lib/auth/use-master-id";
import { useSession } from "@/lib/auth/use-session";
import { getSession, setSession } from "@/lib/auth/session";
import {
  DEFAULT_BOOKING_TIMES,
  DEFAULT_OFF_WEEKDAYS,
  type Master,
  type Weekday,
} from "@/lib/db/schema";
import {
  BOOKING_TIME_OPTIONS,
  WEEKDAYS,
  buildOffDatePickerGrid,
  formatMonthLabel,
  formatOffDateLabel,
  prunePastOffDates,
  shiftMonth,
} from "@/lib/booking-slots";

const ALL_DAYS: Weekday[] = [0, 1, 2, 3, 4, 5, 6];

export function MasterOffDaysForm() {
  const db = useDb();
  const dbReady = useDbReady();
  const { session, loading: sessionLoading } = useSession();
  const masterId = useMasterId();
  const cachedMaster =
    db.masters.find((m) => m.id === masterId) ??
    (session?.id ? db.masters.find((m) => m.userId === session.id) : undefined);
  const [fetchedMaster, setFetchedMaster] = useState<Master | undefined>();
  const [bootstrapping, setBootstrapping] = useState(false);
  const master = cachedMaster ?? fetchedMaster;

  const [offWeekdays, setOffWeekdays] = useState<Weekday[]>([...DEFAULT_OFF_WEEKDAYS]);
  const [bookingTimes, setBookingTimes] = useState<string[]>([...DEFAULT_BOOKING_TIMES]);
  const [offDates, setOffDates] = useState<string[]>([]);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());

  useEffect(() => {
    if (master || !dbReady || sessionLoading || !session?.id || session.role !== "master") {
      return;
    }

    let cancelled = false;
    setBootstrapping(true);
    void ensureMasterProfile({ name: session.name, phone: session.phone })
      .then((next) => {
        if (cancelled || !next) return;
        const current = getSession();
        if (current) {
          setSession({
            ...current,
            masterId: next.id,
            name: next.name || current.name,
          });
        }
        setFetchedMaster(next);
      })
      .finally(() => {
        if (!cancelled) setBootstrapping(false);
      });

    return () => {
      cancelled = true;
    };
  }, [master, dbReady, sessionLoading, session?.id, session?.role, session?.name, session?.phone]);

  useEffect(() => {
    if (!masterId || cachedMaster || fetchedMaster) return;
    let cancelled = false;
    void loadMaster(masterId).then((m) => {
      if (!cancelled && m) setFetchedMaster(m);
    });
    return () => {
      cancelled = true;
    };
  }, [masterId, cachedMaster, fetchedMaster]);

  useEffect(() => {
    if (!master) return;
    setOffWeekdays(
      master.offWeekdays?.length
        ? ([...master.offWeekdays] as Weekday[])
        : [...DEFAULT_OFF_WEEKDAYS],
    );
    setBookingTimes(
      master.bookingTimes?.length
        ? [...master.bookingTimes]
        : [...DEFAULT_BOOKING_TIMES],
    );
    setOffDates(prunePastOffDates(master.offDates ?? []));
  }, [master]);

  const markDirty = () => {
    setSaved(false);
    setSaveError(null);
  };

  const toggleDay = (day: Weekday) => {
    markDirty();
    setOffWeekdays((prev) => {
      if (prev.includes(day)) return prev.filter((d) => d !== day);
      const next = [...prev, day].sort((a, b) => a - b) as Weekday[];
      if (next.length >= 7) return prev;
      return next;
    });
  };

  const toggleTime = (time: string) => {
    markDirty();
    setBookingTimes((prev) => {
      if (prev.includes(time)) {
        const next = prev.filter((t) => t !== time);
        return next.length === 0 ? prev : next;
      }
      return [...prev, time].sort();
    });
  };

  const toggleOffDate = (key: string) => {
    markDirty();
    setOffDates((prev) => {
      if (prev.includes(key)) return prev.filter((d) => d !== key);
      return [...prev, key].sort();
    });
  };

  const pickerDays = useMemo(
    () => buildOffDatePickerGrid(viewYear, viewMonth, offDates),
    [viewYear, viewMonth, offDates],
  );

  const upcomingOffDates = useMemo(() => prunePastOffDates(offDates), [offDates]);

  const handleSave = async () => {
    if (!master) return;
    if (offWeekdays.length >= 7) {
      setSaveError("최소 하루는 예약을 받을 수 있어야 해요.");
      return;
    }
    if (bookingTimes.length === 0) {
      setSaveError("예약 가능 시간을 하나 이상 선택해 주세요.");
      return;
    }
    setSaving(true);
    setSaveError(null);
    try {
      const next = await saveMasterSchedule(master.id, {
        offWeekdays,
        bookingTimes,
        offDates: prunePastOffDates(offDates),
      });
      if (!next) {
        setSaveError("저장에 실패했어요. 잠시 후 다시 시도해 주세요.");
        return;
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch {
      setSaveError("저장에 실패했어요. 네트워크를 확인해 주세요.");
    } finally {
      setSaving(false);
    }
  };

  if (!master) {
    return (
      <main className="px-5 py-10 text-center text-[14px] text-gray-500">
        {bootstrapping ? "프로필을 준비하는 중..." : "마스터 정보를 불러오는 중..."}
      </main>
    );
  }

  const offLabel =
    offWeekdays.length === 0
      ? "매주 예약 가능"
      : `매주 ${offWeekdays.map((d) => WEEKDAYS[d]).join("·")}요일 휴무`;

  const minMonth = { year: today.getFullYear(), monthIndex: today.getMonth() };
  const maxDate = new Date(today);
  maxDate.setDate(today.getDate() + 120);
  const maxMonth = { year: maxDate.getFullYear(), monthIndex: maxDate.getMonth() };
  const canPrevMonth =
    viewYear > minMonth.year ||
    (viewYear === minMonth.year && viewMonth > minMonth.monthIndex);
  const canNextMonth =
    viewYear < maxMonth.year ||
    (viewYear === maxMonth.year && viewMonth < maxMonth.monthIndex);

  return (
    <main className="flex flex-col gap-8 px-5 py-6 pb-10">
      <section>
        <p className="text-[15px] font-semibold text-gray-900">주간 휴무 요일</p>
        <p className="mt-1 text-[13px] text-gray-500">
          선택한 요일에는 전화·방문 예약을 받을 수 없어요.
        </p>

        <div className="mt-4 grid grid-cols-7 gap-2">
          {ALL_DAYS.map((day) => {
            const active = offWeekdays.includes(day);
            return (
              <button
                key={day}
                type="button"
                onClick={() => toggleDay(day)}
                className={`flex aspect-square flex-col items-center justify-center rounded-xl border text-[14px] font-bold transition ${
                  active
                    ? "border-gray-900 bg-gray-900 text-white"
                    : "border-gray-200 bg-white text-gray-700 hover:border-gray-300"
                }`}
              >
                {WEEKDAYS[day]}
              </button>
            );
          })}
        </div>
        <p className="mt-3 text-[13px] font-medium text-gray-600">{offLabel}</p>
      </section>

      <section>
        <p className="text-[15px] font-semibold text-gray-900">특정 휴무일</p>
        <p className="mt-1 text-[13px] text-gray-500">
          휴가·개인 일정 등 날짜를 눌러 휴무로 지정하세요.
        </p>

        <div className="mt-4 mb-3 flex items-center justify-between">
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
          <p className="text-[15px] font-extrabold text-gray-900">
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

        <div className="mb-2 grid grid-cols-7 gap-1 text-center text-[11px] font-semibold text-gray-400">
          {WEEKDAYS.map((w) => (
            <span key={w}>{w}</span>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {pickerDays.map((cell) => {
            if (!cell.inMonth) {
              return <div key={cell.key} className="aspect-square" />;
            }
            const selected = Boolean(cell.isOffDate);
            return (
              <button
                key={cell.key}
                type="button"
                disabled={cell.disabled}
                onClick={() => toggleOffDate(cell.key)}
                className={`aspect-square rounded-xl text-[13px] font-bold transition disabled:opacity-30 ${
                  selected
                    ? "bg-gray-900 text-white"
                    : cell.isToday
                      ? "border border-master-500 text-master-500"
                      : "text-gray-800 hover:bg-gray-50"
                }`}
              >
                {cell.day}
              </button>
            );
          })}
        </div>

        {upcomingOffDates.length > 0 ? (
          <ul className="mt-4 flex flex-col gap-2">
            {upcomingOffDates.map((key) => (
              <li
                key={key}
                className="flex items-center justify-between rounded-xl border border-gray-100 bg-surface px-3 py-2.5"
              >
                <span className="text-[13px] font-semibold text-gray-800">
                  {formatOffDateLabel(key)}
                </span>
                <button
                  type="button"
                  onClick={() => toggleOffDate(key)}
                  className="text-[12px] font-bold text-gray-400 hover:text-gray-700"
                >
                  해제
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-[12px] text-gray-400">지정된 특정 휴무일이 없어요.</p>
        )}
      </section>

      <section>
        <p className="text-[15px] font-semibold text-gray-900">예약 가능 시간</p>
        <p className="mt-1 text-[13px] text-gray-500">
          학생이 고를 수 있는 전화·방문 시간대예요. {bookingTimes.length}개 선택됨
        </p>

        <div className="mt-4 grid grid-cols-4 gap-2">
          {BOOKING_TIME_OPTIONS.map((time) => {
            const active = bookingTimes.includes(time);
            return (
              <button
                key={time}
                type="button"
                onClick={() => toggleTime(time)}
                className={`rounded-xl border py-2.5 text-[13px] font-bold tabular-nums transition ${
                  active
                    ? "border-master-500 bg-brand-50 text-master-500"
                    : "border-gray-200 bg-white text-gray-600 hover:border-gray-300"
                }`}
              >
                {time}
              </button>
            );
          })}
        </div>
      </section>

      {saveError && (
        <p className="text-center text-[13px] font-medium text-red-500">{saveError}</p>
      )}

      <button
        type="button"
        disabled={saving}
        onClick={() => void handleSave()}
        className={`w-full rounded-xl py-4 text-[15px] font-bold text-white transition-colors disabled:opacity-60 ${
          saved ? "bg-green-600" : "bg-master-500 hover:bg-brand-600"
        }`}
      >
        {saved ? "저장됐어요" : saving ? "저장 중..." : "저장하기"}
      </button>
    </main>
  );
}
