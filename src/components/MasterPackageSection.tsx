"use client";

import { useState } from "react";
import {
  formatPrice,
  PACKAGE_LEVEL_LABEL,
  type Master,
  type MasterPackage,
} from "@/lib/db/schema";
import { useDb } from "@/lib/db/use-db";
import { PackagePurchaseControls } from "@/components/PackagePurchaseControls";
import { WeekVideoThumb } from "@/components/WeekVideoThumb";
import { formatMediaDuration } from "@/lib/feedback-pricing";

const LEVEL_ORDER = ["beginner", "intermediate", "master"] as const;

const EXAMPLE_COVER: Record<(typeof LEVEL_ORDER)[number], string> = {
  beginner: "/course-covers/beginner.svg",
  intermediate: "/course-covers/intermediate.svg",
  master: "/course-covers/master.svg",
};

function PackageThumbCard({
  pkg,
  master,
  selected,
  onSelect,
}: {
  pkg: MasterPackage;
  master: Master | undefined;
  selected: boolean;
  onSelect: () => void;
}) {
  const coverSrc =
    pkg.coverUrl || EXAMPLE_COVER[pkg.level] || EXAMPLE_COVER.beginner;
  const priceLabel =
    pkg.priceVideo <= 0 ? "무료" : `${formatPrice(pkg.priceVideo)}원`;

  return (
    <button
      type="button"
      onClick={onSelect}
      className={`w-full min-w-0 text-left ${selected ? "opacity-100" : ""}`}
    >
      <div
        className={`relative mb-2 aspect-[16/10] overflow-hidden rounded-xl bg-gray-100 ring-offset-2 ${
          selected ? "ring-2 ring-brand-500" : ""
        }`}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={coverSrc} alt="" className="h-full w-full object-cover" />
        <span className="absolute left-2 top-2 rounded bg-black/75 px-1.5 py-0.5 text-[10px] font-bold text-white">
          {PACKAGE_LEVEL_LABEL[pkg.level]}
        </span>
      </div>

      <p className="mb-0.5 line-clamp-2 text-[13px] font-bold leading-snug text-gray-900">
        {pkg.title}
      </p>
      {master && (
        <p className="mb-1 truncate text-[12px] text-gray-500">{master.name}</p>
      )}
      <p className="mb-1 text-[14px] font-bold text-gray-900">{priceLabel}</p>
      <div className="flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-[11px] text-gray-400">
        {master && (
          <span className="inline-flex items-center gap-0.5">
            <i className="fa-solid fa-star text-[10px] text-amber-400" />
            <span className="font-semibold text-gray-600">
              {master.rating.toFixed(1)}
            </span>
            <span>({master.reviewCount})</span>
          </span>
        )}
        <span>{pkg.weeks.length}주</span>
      </div>
    </button>
  );
}

export function MasterPackageSection({ masterId }: { masterId: string }) {
  const db = useDb();
  const [openId, setOpenId] = useState<string | null>(null);
  const master = db.masters.find((m) => m.id === masterId);
  const packages = db.masterPackages
    .filter((p) => p.masterId === masterId && p.isActive)
    .sort((a, b) => LEVEL_ORDER.indexOf(a.level) - LEVEL_ORDER.indexOf(b.level));

  const openPkg = packages.find((p) => p.id === openId) ?? null;

  if (packages.length === 0) return null;

  return (
    <section className="border-b border-gray-50 px-6 py-8">
      <h3 className="mb-4 text-[17px] font-bold tracking-tight text-gray-900">
        온라인 강의
      </h3>
      <div className="grid grid-cols-2 gap-x-3 gap-y-6">
        {packages.map((pkg) => (
          <PackageThumbCard
            key={pkg.id}
            pkg={pkg}
            master={master}
            selected={openId === pkg.id}
            onSelect={() =>
              setOpenId((prev) => (prev === pkg.id ? null : pkg.id))
            }
          />
        ))}
      </div>

      {openPkg && (
        <div className="mt-5 rounded-[16px] border border-gray-100 bg-white p-4">
          <div className="mb-3 flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[15px] font-bold text-gray-900">{openPkg.title}</p>
              {openPkg.description && (
                <p className="mt-1 text-[12px] leading-relaxed text-gray-500">
                  {openPkg.description}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={() => setOpenId(null)}
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-surface text-gray-400"
              aria-label="닫기"
            >
              <i className="fa-solid fa-xmark text-[12px]" />
            </button>
          </div>
          <div className="mb-4 flex flex-col gap-2">
            {openPkg.weeks.map((week) => (
              <div key={week.week} className="rounded-xl bg-surface px-3.5 py-3">
                <div className="flex items-center gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white text-[11px] font-bold text-gray-500 shadow-sm">
                    {week.week}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-bold text-gray-800">{week.title}</p>
                    {week.description && (
                      <p className="mt-0.5 line-clamp-2 text-[12px] leading-relaxed text-gray-500">
                        {week.description}
                      </p>
                    )}
                    <p className="mt-1 text-[11px] tabular-nums text-gray-400">
                      {week.durationSec > 0
                        ? formatMediaDuration(week.durationSec)
                        : null}
                      {week.durationSec > 0 ? " · " : ""}
                      {week.videoUrl ? "영상 포함" : "영상 준비중"}
                    </p>
                  </div>
                  <WeekVideoThumb videoUrl={week.videoUrl} />
                </div>
              </div>
            ))}
          </div>
          <PackagePurchaseControls pkg={openPkg} />
        </div>
      )}
    </section>
  );
}
