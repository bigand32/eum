"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { useDb } from "@/lib/db/use-db";
import { useStudentId } from "@/lib/auth/use-student-id";
import { matchesStudentScope } from "@/lib/student-utils";
import { PACKAGE_LEVEL_LABEL, type MasterPackage } from "@/lib/db/schema";
import { WeekVideoThumb } from "@/components/WeekVideoThumb";
import { formatMediaDuration } from "@/lib/feedback-pricing";
import { loadMasterPackage } from "@/lib/db/api";

export function StudentCoursePlayerView({ purchaseId }: { purchaseId: string }) {
  const db = useDb();
  const studentId = useStudentId();
  const purchase = db.packagePurchases.find(
    (p) => p.id === purchaseId && matchesStudentScope(studentId, p.studentId),
  );
  const cachedPkg = purchase
    ? db.masterPackages.find((p) => p.id === purchase.packageId)
    : undefined;
  const master = purchase
    ? db.masters.find((m) => m.id === purchase.masterId)
    : undefined;

  const [pkg, setPkg] = useState<MasterPackage | undefined>(cachedPkg);
  const [loadingPkg, setLoadingPkg] = useState(false);

  useEffect(() => {
    if (!purchase?.packageId) return;
    if (cachedPkg?.weeks && cachedPkg.weeks.length > 0) {
      setPkg(cachedPkg);
      return;
    }
    let cancelled = false;
    setLoadingPkg(true);
    void loadMasterPackage(purchase.packageId).then((full) => {
      if (cancelled) return;
      setPkg(full ?? cachedPkg);
      setLoadingPkg(false);
    });
    return () => {
      cancelled = true;
    };
  }, [purchase?.packageId, cachedPkg]);

  const weeks = useMemo(() => pkg?.weeks ?? [], [pkg]);
  const firstWithVideo = weeks.findIndex((w) => w.videoUrl);
  const [activeWeek, setActiveWeek] = useState(
    firstWithVideo >= 0 ? firstWithVideo : 0,
  );

  useEffect(() => {
    if (weeks.length === 0) return;
    const idx = weeks.findIndex((w) => w.videoUrl);
    setActiveWeek(idx >= 0 ? idx : 0);
  }, [weeks]);

  if (!purchase) {
    return (
      <>
        <PageHeader title="내 강의" backHref="/mypage/courses" />
        <main className="p-6 text-center text-gray-400">
          구매 내역을 찾을 수 없어요.
          <Link href="/mypage/courses" className="mt-3 block text-brand-500">
            강의 목록으로
          </Link>
        </main>
      </>
    );
  }

  if (loadingPkg && (!pkg || pkg.weeks.length === 0)) {
    return (
      <>
        <PageHeader title="내 강의" backHref="/mypage/courses" />
        <main className="p-6 text-center text-[14px] text-gray-400">강의 불러오는 중…</main>
      </>
    );
  }

  if (!pkg) {
    return (
      <>
        <PageHeader title="내 강의" backHref="/mypage/courses" />
        <main className="p-6 text-center text-gray-400">패키지를 찾을 수 없어요.</main>
      </>
    );
  }

  const week = weeks[activeWeek];

  return (
    <>
      <PageHeader title={pkg.title} backHref="/mypage/courses" />
      <main className="flex flex-col gap-4 px-5 pb-10">
        <div className="overflow-hidden rounded-[20px] bg-black">
          {week?.videoUrl ? (
            <video
              key={week.videoUrl}
              src={week.videoUrl}
              controls
              playsInline
              className="aspect-video w-full"
            />
          ) : (
            <div className="flex aspect-video items-center justify-center text-[13px] text-white/60">
              영상이 아직 없어요
            </div>
          )}
        </div>

        <div>
          <p className="text-[12px] font-bold text-brand-500">
            {PACKAGE_LEVEL_LABEL[pkg.level]} · {master?.title ?? "마스터"}
          </p>
          <h1 className="mt-1 text-[20px] font-extrabold text-gray-900">{pkg.title}</h1>
          {week ? (
            <p className="mt-1 text-[14px] text-gray-600">
              {week.week}주차 · {week.title}
              {week.durationSec > 0 ? ` · ${formatMediaDuration(week.durationSec)}` : ""}
            </p>
          ) : null}
        </div>

        <div className="flex flex-col gap-2">
          {weeks.map((w, i) => (
            <button
              key={`${w.week}-${w.title}`}
              type="button"
              onClick={() => setActiveWeek(i)}
              className={`flex items-center gap-3 rounded-[16px] border px-3 py-3 text-left ${
                i === activeWeek
                  ? "border-brand-200 bg-brand-50"
                  : "border-gray-100 bg-white"
              }`}
            >
              <WeekVideoThumb videoUrl={w.videoUrl} />
              <div className="min-w-0 flex-1">
                <p className="text-[12px] font-bold text-gray-400">{w.week}주차</p>
                <p className="truncate text-[14px] font-bold text-gray-900">{w.title}</p>
              </div>
            </button>
          ))}
        </div>
      </main>
    </>
  );
}
