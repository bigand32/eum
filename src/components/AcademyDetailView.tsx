"use client";

import Link from "next/link";
import { FavoriteButton } from "@/components/FavoriteButton";
import type { Academy } from "@/lib/db/academies";

export function AcademyDetailView({ academy }: { academy: Academy }) {
  return (
    <div className="pb-24">
      <div className="relative h-[260px]">
        <img src={academy.imageUrl} alt={academy.name} className="h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-black/40" />

        <header className="absolute top-0 z-10 flex w-full items-center justify-between p-4 text-white">
          <Link
            href="/search?tab=academy"
            className="flex h-8 w-8 items-center justify-center rounded-full bg-black/30 backdrop-blur-md"
          >
            <i className="fa-solid fa-chevron-left" />
          </Link>
          <div className="flex gap-3">
            <FavoriteButton
              type="academy"
              id={academy.id}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-black/30 text-lg text-white backdrop-blur-md"
            />
          </div>
        </header>

        <div className="absolute right-5 bottom-5 left-5 text-white">
          <span className="mb-2 inline-block rounded-sm bg-brand-500 px-2 py-1 text-[10px] font-bold">
            공식 파트너
          </span>
          <h1 className="mb-1 text-2xl font-extrabold">{academy.name}</h1>
          <p className="flex items-center gap-1 text-[14px] font-medium text-white/80">
            <i className="fa-solid fa-location-dot text-[12px]" />
            {academy.distanceLabel}
          </p>
        </div>
      </div>

      <main className="px-5 pt-6">
        <div className="mb-6 flex items-center justify-between rounded-2xl border border-brand-100 bg-brand-50 p-4">
          <div>
            <div className="mb-0.5 text-[12px] font-bold text-brand-500">eum 단독 혜택</div>
            <div className="text-[15px] font-bold text-gray-900">
              {academy.promoTag ?? "첫 상담 10% 할인"}
            </div>
          </div>
          <button
            type="button"
            className="rounded-lg bg-brand-500 px-4 py-2 text-[12px] font-bold text-white shadow-sm"
          >
            쿠폰받기
          </button>
        </div>

        <h3 className="mb-3 text-[17px] font-bold text-gray-900">수강 과목</h3>
        <div className="mb-8 flex flex-wrap gap-2">
          {academy.tags.map((tag, i) => (
            <span
              key={tag}
              className={`rounded-md px-3 py-1.5 text-[13px] font-medium ${
                i === 0 ? "bg-brand-50 text-brand-500" : "bg-gray-100 text-gray-600"
              }`}
            >
              {tag}
            </span>
          ))}
        </div>

        <section className="mb-8 space-y-6">
          <div className="flex items-start gap-6">
            <div className="w-[72px] shrink-0 pt-0.5 text-[15px] font-bold text-gray-900">운영시간</div>
            <div className="flex-1 space-y-0.5 text-[14px] leading-[1.7] font-medium text-gray-500">
              <p>평일 10:00 - 22:00</p>
              <p>토요일 10:00 - 18:00</p>
              <p>일요일 · 공휴일 휴무</p>
            </div>
          </div>
          <div className="flex items-start gap-6">
            <div className="w-[72px] shrink-0 pt-0.5 text-[15px] font-bold text-gray-900">주소</div>
            <div className="flex-1 space-y-0.5 text-[14px] leading-[1.7] font-medium text-gray-500">
              <p>{academy.address}</p>
            </div>
          </div>
        </section>

        <Link
          href={`/academies/${academy.id}/map`}
          className="mb-8 flex items-center justify-center gap-2 rounded-[16px] border border-gray-200 bg-surface py-3.5 text-[14px] font-bold text-gray-700"
        >
          <i className="fa-solid fa-map-location-dot text-brand-500" />
          지도에서 위치 보기
        </Link>

        <h3 className="mb-3 text-[17px] font-bold text-gray-900">학원 소개</h3>
        <p className="mb-8 text-[14px] leading-relaxed text-gray-600">
          최신식 녹음실과 개인 연습실을 보유한 실용음악학원입니다. 체계적인 월말 평가를 통해 실전
          감각을 키워드립니다.
        </p>
      </main>

      <div className="fixed bottom-20 z-50 w-full max-w-[400px] border-t border-gray-100 bg-white p-4">
        <div className="flex gap-3">
          <Link
            href={`/academies/${academy.id}/map`}
            className="flex w-[30%] items-center justify-center gap-1 rounded-xl border border-gray-200 bg-surface py-3.5 text-[15px] font-bold text-gray-700"
          >
            <i className="fa-solid fa-map-location-dot text-lg" />
            지도
          </Link>
          <Link
            href="/search?tab=academy"
            className="flex flex-1 items-center justify-center gap-1 rounded-xl bg-gray-900 py-3.5 text-[15px] font-bold text-white shadow-lg"
          >
            방문 상담 예약하기
          </Link>
        </div>
      </div>
    </div>
  );
}
