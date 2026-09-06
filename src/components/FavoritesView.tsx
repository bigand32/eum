"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { AppImage } from "@/components/AppImage";
import { ACADEMIES } from "@/lib/db/academies";
import { useDb } from "@/lib/db/use-db";

type FavTab = "master" | "academy";

export function FavoritesView() {
  const db = useDb();
  const [tab, setTab] = useState<FavTab>("master");

  const favoriteMasters = useMemo(
    () => db.masters.filter((m) => db.favoriteMasterIds.includes(m.id)),
    [db.masters, db.favoriteMasterIds],
  );
  const favoriteAcademies = useMemo(
    () => ACADEMIES.filter((a) => db.favoriteAcademyIds.includes(a.id)),
    [db.favoriteAcademyIds],
  );

  const isMaster = tab === "master";
  const empty = isMaster ? favoriteMasters.length === 0 : favoriteAcademies.length === 0;

  return (
    <>
      <PageHeader title="찜한 목록" backHref="/mypage" />
      <main className="flex flex-col pb-28">
        <div className="sticky top-0 z-40 border-b border-gray-100 bg-white px-5">
          <div className="relative flex text-[15px] font-bold">
            <button
              type="button"
              onClick={() => setTab("master")}
              className={`flex-1 pb-3 pt-1 transition-colors ${
                isMaster ? "text-brand-500" : "text-gray-400 hover:text-gray-600"
              }`}
            >
              마스터
              <span
                className={`ml-1 text-[12px] font-semibold ${
                  isMaster ? "text-brand-400" : "text-gray-300"
                }`}
              >
                {favoriteMasters.length}
              </span>
            </button>
            <button
              type="button"
              onClick={() => setTab("academy")}
              className={`flex-1 pb-3 pt-1 transition-colors ${
                !isMaster ? "text-brand-500" : "text-gray-400 hover:text-gray-600"
              }`}
            >
              학원
              <span
                className={`ml-1 text-[12px] font-semibold ${
                  !isMaster ? "text-brand-400" : "text-gray-300"
                }`}
              >
                {favoriteAcademies.length}
              </span>
            </button>
            <div
              className="tab-indicator absolute bottom-0 left-0 h-0.5 w-1/2 rounded-t-full bg-brand-500"
              style={{ transform: isMaster ? "translateX(0)" : "translateX(100%)" }}
            />
          </div>
        </div>

        <div className="flex flex-col gap-3 p-5">
          {empty ? (
            <div className="rounded-[20px] border border-gray-100 bg-white p-8 text-center">
              <p className="text-[14px] font-medium text-gray-400">
                {isMaster ? "찜한 마스터가 없어요" : "찜한 학원이 없어요"}
              </p>
              <Link
                href={isMaster ? "/search" : "/search?tab=academy"}
                className="mt-3 inline-block text-[13px] font-bold text-brand-500"
              >
                {isMaster ? "마스터 찾아보기" : "학원 찾아보기"}
              </Link>
            </div>
          ) : isMaster ? (
            favoriteMasters.map((master) => (
              <Link
                key={master.id}
                href={`/masters/${master.id}`}
                className="shadow-soft flex items-center gap-4 rounded-[20px] border border-gray-100 bg-white p-4"
              >
                <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-full border border-gray-100">
                  <AppImage
                    src={master.avatarUrl}
                    alt=""
                    width={56}
                    height={56}
                    className="h-full w-full object-cover"
                    sizes="56px"
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="mb-0.5 flex items-center gap-1.5">
                    <span className="rounded bg-brand-50 px-1.5 py-0.5 text-[10px] font-bold text-brand-500">
                      마스터
                    </span>
                    <h3 className="truncate text-[15px] font-bold text-gray-900">
                      {master.title}
                    </h3>
                  </div>
                  <p className="truncate text-[13px] text-gray-500">
                    {master.tags.slice(0, 2).join(" · ")}
                  </p>
                  <div className="mt-1 flex items-center gap-1 text-[12px] font-semibold text-brand-500">
                    <i className="fa-solid fa-star text-[10px]" />
                    {master.rating}
                    <span className="font-medium text-gray-400">
                      · 피드백 {master.feedbackCount}건
                    </span>
                  </div>
                </div>
                <i className="fa-solid fa-chevron-right shrink-0 text-[13px] text-gray-300" />
              </Link>
            ))
          ) : (
            favoriteAcademies.map((academy) => (
              <Link
                key={academy.id}
                href={`/academies/${academy.id}`}
                className="shadow-soft flex items-center gap-4 rounded-[20px] border border-gray-100 bg-white p-4"
              >
                <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-[14px]">
                  <AppImage
                    src={academy.imageUrl}
                    alt=""
                    width={56}
                    height={56}
                    className="h-full w-full object-cover"
                    sizes="56px"
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="mb-0.5 flex items-center gap-1.5">
                    <span className="rounded bg-violet-50 px-1.5 py-0.5 text-[10px] font-bold text-violet-600">
                      학원
                    </span>
                    <h3 className="truncate text-[15px] font-bold text-gray-900">
                      {academy.name}
                    </h3>
                  </div>
                  <p className="text-[13px] text-gray-500">{academy.distanceLabel}</p>
                  <div className="mt-1 flex items-center gap-1 text-[12px] font-semibold text-brand-500">
                    <i className="fa-solid fa-star text-[10px]" />
                    {academy.rating}
                  </div>
                </div>
                <i className="fa-solid fa-chevron-right shrink-0 text-[13px] text-gray-300" />
              </Link>
            ))
          )}
        </div>
      </main>
    </>
  );
}
