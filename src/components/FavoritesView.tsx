"use client";

import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { ACADEMIES } from "@/lib/db/academies";
import { useDb } from "@/lib/db/use-db";

export function FavoritesView() {
  const db = useDb();
  const favoriteMasters = db.masters.filter((m) => db.favoriteMasterIds.includes(m.id));
  const favoriteAcademies = ACADEMIES.filter((a) => db.favoriteAcademyIds.includes(a.id));
  const isEmpty = favoriteMasters.length === 0 && favoriteAcademies.length === 0;

  return (
    <>
      <PageHeader title="찜한 마스터 / 학원" backHref="/mypage" />
      <main className="flex flex-col gap-6 p-5 pb-28">
        {isEmpty ? (
          <div className="rounded-[20px] border border-gray-100 bg-white p-8 text-center">
            <p className="text-[14px] font-medium text-gray-400">찜한 목록이 없어요</p>
            <Link href="/search" className="mt-3 inline-block text-[13px] font-bold text-brand-500">
              탐색하러 가기
            </Link>
          </div>
        ) : (
          <>
            {favoriteMasters.length > 0 && (
              <section>
                <h2 className="mb-3 text-[15px] font-bold text-gray-900">마스터</h2>
                <div className="flex flex-col gap-3">
                  {favoriteMasters.map((master) => (
                    <Link
                      key={master.id}
                      href={`/masters/${master.id}`}
                      className="shadow-soft flex items-center gap-4 rounded-[20px] border border-gray-100 bg-white p-4"
                    >
                      <img
                        src={master.avatarUrl}
                        alt=""
                        className="h-14 w-14 rounded-full border border-gray-100 object-cover"
                      />
                      <div className="min-w-0 flex-1">
                        <h3 className="truncate text-[15px] font-bold text-gray-900">
                          {master.title}
                        </h3>
                        <p className="mt-0.5 truncate text-[13px] text-gray-500">
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
                  ))}
                </div>
              </section>
            )}

            {favoriteAcademies.length > 0 && (
              <section>
                <h2 className="mb-3 text-[15px] font-bold text-gray-900">학원</h2>
                <div className="flex flex-col gap-3">
                  {favoriteAcademies.map((academy) => (
                    <Link
                      key={academy.id}
                      href={`/academies/${academy.id}`}
                      className="shadow-soft overflow-hidden rounded-[20px] border border-gray-100 bg-white"
                    >
                      <div className="flex items-center gap-4 p-4">
                        <img
                          src={academy.imageUrl}
                          alt=""
                          className="h-14 w-14 rounded-[14px] object-cover"
                        />
                        <div className="min-w-0 flex-1">
                          <h3 className="truncate text-[15px] font-bold text-gray-900">
                            {academy.name}
                          </h3>
                          <p className="mt-0.5 text-[13px] text-gray-500">
                            {academy.distanceLabel}
                          </p>
                          <div className="mt-1 flex items-center gap-1 text-[12px] font-semibold text-brand-500">
                            <i className="fa-solid fa-star text-[10px]" />
                            {academy.rating}
                          </div>
                        </div>
                        <i className="fa-solid fa-chevron-right shrink-0 text-[13px] text-gray-300" />
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </main>
    </>
  );
}
