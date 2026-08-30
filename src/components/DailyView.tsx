"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { RecordModal } from "@/components/RecordModal";
import { TimestampComments } from "@/components/TimestampComments";
import { useStudentId } from "@/lib/auth/use-student-id";
import { useDb } from "@/lib/db/use-db";
import { getWeekAttendance, isWeekAttendanceComplete } from "@/lib/attendance";
import { formatTime } from "@/lib/timestamp-comments";

function formatRecordDate(iso: string) {
  const d = new Date(iso);
  return `${d.getMonth() + 1}월 ${d.getDate()}일`;
}

export function DailyView() {
  const db = useDb();
  const studentId = useStudentId();
  const [weekDays, setWeekDays] = useState(() => getWeekAttendance());
  const weekComplete = isWeekAttendanceComplete();

  useEffect(() => {
    const refresh = () => setWeekDays(getWeekAttendance());
    refresh();
    window.addEventListener("eum-attendance-updated", refresh);
    window.addEventListener("eum-db-updated", refresh);
    return () => {
      window.removeEventListener("eum-attendance-updated", refresh);
      window.removeEventListener("eum-db-updated", refresh);
    };
  }, []);
  const student = db.students.find((s) => s.id === studentId);
  const practiceRecords = db.practiceRecords
    .filter((r) => r.studentId === studentId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  const latestFeedback = db.feedbackOrders
    .filter((o) => o.studentId === studentId && o.status === "completed")
    .sort((a, b) => new Date(b.completedAt ?? b.createdAt).getTime() - new Date(a.completedAt ?? a.createdAt).getTime())[0];
  const feedbackMaster = latestFeedback
    ? db.masters.find((m) => m.id === latestFeedback.masterId)
    : null;

  return (
    <>
      <header className="sticky top-0 z-50 flex items-center justify-between border-b border-gray-50 bg-white/90 px-6 py-4 backdrop-blur-xl">
        <div className="text-xl font-extrabold tracking-tight text-gray-900">연습일지</div>
        <div className="flex items-center gap-1.5 rounded-full bg-brand-50 px-3 py-1.5 text-[14px] font-bold text-brand-500">
          <i className="fa-solid fa-p" /> {(student?.points ?? 0).toLocaleString()}
        </div>
      </header>

      <main className="flex flex-col px-5 pt-5 pb-28">
        <section className="mb-8 text-center">
          <p className="mb-1 text-[15px] font-medium text-gray-900">모두 완료하면</p>
          <p className="mb-1.5 text-[20px] font-extrabold tracking-tight text-gray-900">
            <span className="text-brand-500">500P</span>를 더 드려요
          </p>
          <p className="mb-5 text-[13px] font-medium text-gray-400">
            {weekComplete ? "이번 주 출석 완료! 500P 지급 예정" : "금요일까지 연속 출석하면 받을 수 있어요"}
          </p>
          <div className="shadow-float rounded-[24px] border border-gray-100 bg-white px-3 py-5">
            <div className="flex items-center">
              {weekDays.map((day, i) => (
                <div key={day.key} className="contents">
                  {i > 0 && (
                    <div
                      className={`mx-1 mt-6 flex-1 self-start border-t border-dashed ${day.attended && weekDays[i - 1]?.attended ? "border-brand-300" : "border-gray-300"}`}
                    />
                  )}
                  <div className="flex shrink-0 flex-col items-center gap-2">
                    <div
                      className={`flex h-12 w-12 items-center justify-center rounded-full border-2 ${
                        day.isToday
                          ? "border-brand-500 bg-brand-500 shadow-[0_4px_14px_rgba(49,130,246,0.3)]"
                          : day.attended
                            ? "border-brand-500 bg-white"
                            : "border-gray-200 bg-white"
                      }`}
                    >
                      <i
                        className={`fa-solid ${day.attended ? "fa-check" : "fa-microphone"} text-[15px] ${
                          day.isToday ? "text-white" : day.attended ? "text-brand-500" : "text-gray-300"
                        }`}
                      />
                    </div>
                    <span
                      className={`text-[11px] font-medium ${day.isToday ? "font-bold text-brand-500" : day.attended ? "text-gray-400" : "text-gray-300"}`}
                    >
                      {day.label}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mb-10">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-[18px] font-bold tracking-tight text-gray-900">자율 미션</h3>
            <span className="rounded-md border border-gray-100 bg-surface px-2 py-1 text-[11px] font-bold text-gray-500">
              +300P
            </span>
          </div>
          <div className="flex flex-col items-center rounded-[24px] border border-gray-100 bg-surface p-6 text-center">
            <div className="mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-white text-2xl text-brand-500 shadow-sm">
              <i className="fa-solid fa-microphone" />
            </div>
            <span className="mb-2 rounded bg-gray-100 px-2 py-0.5 text-[10px] font-bold text-gray-600">
              자율 미션
            </span>
            <h4 className="mb-1 text-[16px] font-bold text-gray-900">오늘 연습한 곡 자유 녹음하기</h4>
            <p className="mb-5 text-[13px] text-gray-500">원하는 곡을 녹음하고 일지에 남겨보세요</p>
            <RecordModal />
          </div>
        </section>

        <section>
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-[17px] font-bold tracking-tight text-gray-900">지난 연습 기록</h3>
          </div>

          {practiceRecords.length === 0 && !latestFeedback ? (
            <div className="rounded-[20px] border border-gray-100 bg-white p-8 text-center text-[13px] text-gray-400">
              아직 연습 기록이 없어요
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {practiceRecords.map((record) => (
                <div
                  key={record.id}
                  className="shadow-soft rounded-[20px] border border-gray-100 bg-white p-4"
                >
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-[14px] font-bold text-gray-800">자율 연습</span>
                    <span className="text-[12px] font-medium text-gray-400">
                      {formatRecordDate(record.createdAt)}
                    </span>
                  </div>
                  <h4 className="mb-1 text-[15px] font-bold text-gray-900">{record.title}</h4>
                  <p className="text-[12px] font-medium text-gray-500 tabular-nums">
                    {formatTime(record.durationSec)}
                  </p>
                </div>
              ))}

              {latestFeedback && feedbackMaster && (
                <div className="shadow-soft rounded-[20px] border border-gray-100 bg-white p-4">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-[14px] font-bold text-gray-800">피드백 완료</span>
                    <span className="text-[12px] font-medium text-gray-400">
                      {formatRecordDate(latestFeedback.completedAt ?? latestFeedback.createdAt)}
                    </span>
                  </div>
                  <h4 className="mb-0.5 text-[15px] font-bold text-gray-900">
                    {latestFeedback.mediaLabel}
                  </h4>
                  <p className="mb-3 text-[12px] font-medium text-gray-500">{feedbackMaster.title}</p>
                  {latestFeedback.timestampComments.length > 0 && (
                    <div className="mb-3">
                      <TimestampComments compact comments={latestFeedback.timestampComments.slice(0, 1)} />
                    </div>
                  )}
                  <Link
                    href={`/feedback/${latestFeedback.id}`}
                    className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-gray-200 bg-surface py-2.5 text-[13px] font-bold text-gray-700 hover:bg-gray-100"
                  >
                    <i className="fa-solid fa-comment-dots" />
                    구간별 피드백 전체 보기
                  </Link>
                </div>
              )}
            </div>
          )}
        </section>
      </main>
    </>
  );
}
