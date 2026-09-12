"use client";

import { useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import {
  getStudentNotifPrefs,
  saveStudentNotifPrefs,
  type StudentNotifPrefs,
} from "@/lib/auth/student-settings";

function ToggleRow({
  label,
  desc,
  checked,
  onChange,
}: {
  label: string;
  desc: string;
  checked: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <div className="flex items-center gap-4 p-5">
      <div className="min-w-0 flex-1">
        <p className="text-[15px] font-bold text-gray-900">{label}</p>
        <p className="mt-0.5 text-[12px] text-gray-500">{desc}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative h-7 w-12 shrink-0 rounded-full transition ${
          checked ? "bg-brand-500" : "bg-gray-200"
        }`}
      >
        <span
          className={`absolute top-0.5 left-0.5 h-6 w-6 rounded-full bg-white shadow transition ${
            checked ? "translate-x-5" : ""
          }`}
        />
      </button>
    </div>
  );
}

export function StudentSettingsNotificationsView() {
  const [prefs, setPrefs] = useState<StudentNotifPrefs>(() => getStudentNotifPrefs());

  function update(next: StudentNotifPrefs) {
    setPrefs(next);
    saveStudentNotifPrefs(next);
  }

  return (
    <>
      <PageHeader title="알림 설정" backHref="/mypage/settings" />
      <main className="px-5 py-6 pb-28">
        <p className="mb-5 text-[13px] leading-relaxed text-gray-500">
          피드백·예약 리마인더 알림을 켜고 끌 수 있어요.
        </p>
        <section className="overflow-hidden rounded-[20px] border border-gray-100 bg-white shadow-soft">
          <ToggleRow
            label="피드백 알림"
            desc="마스터 피드백이 도착하면 알려드려요"
            checked={prefs.feedback}
            onChange={(feedback) => update({ ...prefs, feedback })}
          />
          <div className="border-t border-gray-50" />
          <ToggleRow
            label="예약 리마인더"
            desc="다가오는 전화·방문 코칭을 알려드려요"
            checked={prefs.reservation}
            onChange={(reservation) => update({ ...prefs, reservation })}
          />
        </section>
      </main>
    </>
  );
}
