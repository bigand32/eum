"use client";

import Link from "next/link";
import { FavoriteButton } from "@/components/FavoriteButton";
import { useDb, useDbReady } from "@/lib/db/use-db";
import { MasterProductCards } from "@/components/MasterProductCards";

function StarRow({ count }: { count: number }) {
  return (
    <div className="flex gap-0.5 text-[11px] text-brand-500">
      {[1, 2, 3, 4, 5].map((i) => (
        <i
          key={i}
          className={`fa-solid ${
            i <= Math.floor(count)
              ? "fa-star"
              : count % 1 >= 0.5 && i === Math.ceil(count)
                ? "fa-star-half-stroke"
                : "fa-star text-gray-200"
          }`}
        />
      ))}
    </div>
  );
}

export function MasterDetailView({ masterId }: { masterId: string }) {
  const db = useDb();
  const ready = useDbReady();
  const master = db.masters.find((m) => m.id === masterId);
  const reviews = db.studentReviews
    .filter((r) => r.masterId === masterId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5);
  if (!master) {
    if (!ready) return null;
    return <p className="p-6 text-center text-gray-500">마스터를 찾을 수 없어요.</p>;
  }

  return (
    <div className="bg-white pb-[76px]">
      <div className="relative h-[260px] bg-gray-200">
        <img src={master.heroImageUrl} alt="" className="h-full w-full object-cover" />
        <div className="absolute inset-0 bg-black/10" />

        <header className="absolute top-0 z-10 flex w-full items-center justify-between px-5 py-4">
          <Link
            href="/search"
            aria-label="뒤로가기"
            className="flex h-8 w-8 items-center justify-center rounded-full bg-black/30 text-white backdrop-blur-md transition hover:bg-black/50"
          >
            <i className="fa-solid fa-chevron-left text-[14px]" />
          </Link>
          <button
            type="button"
            aria-label="공유"
            className="flex h-8 w-8 items-center justify-center rounded-full bg-black/30 text-white backdrop-blur-md transition hover:bg-black/50"
          >
            <i className="fa-solid fa-share-nodes text-[14px]" />
          </button>
        </header>

        <img
          src={master.avatarUrl}
          alt={master.name}
          className="absolute -bottom-10 right-6 z-20 h-[88px] w-[88px] rounded-full border-4 border-white bg-white object-cover shadow-sm"
        />
      </div>

      <main className="flex flex-col">
        <section className="border-b border-gray-50 px-6 pt-10 pb-8">
          {master.rankLabel && (
            <span className="mb-3 inline-block rounded-md bg-brand-50 px-2.5 py-1 text-[11px] font-bold tracking-wide text-brand-500">
              {master.rankLabel}
            </span>
          )}

          <h1 className="mb-3 text-[26px] leading-[1.3] font-medium tracking-tight text-gray-900">
            안녕하세요
            <br />
            <strong className="font-extrabold text-brand-500">{master.title}</strong>입니다.
          </h1>

          <div className="mb-5 flex items-center gap-2 text-[12px] font-medium text-gray-400">
            <span className="flex items-center gap-1 text-brand-500">
              <i className="fa-solid fa-star text-[10px]" /> {master.rating}
            </span>
            <span className="h-2.5 w-px bg-gray-300" />
            <span>누적 피드백 {master.feedbackCount}건</span>
            <span className="h-2.5 w-px bg-gray-300" />
            <span>응답시간 {master.responseTimeLabel}</span>
          </div>

          <p className="text-[14px] leading-relaxed font-medium whitespace-pre-line text-gray-500">
            {master.bio}
          </p>
        </section>

        <section className="space-y-7 border-b border-gray-50 px-6 py-8">
          <div className="flex items-start gap-6">
            <div className="w-[72px] shrink-0 pt-0.5 text-[15px] font-bold text-gray-900">전문 분야</div>
            <div className="flex flex-1 flex-wrap gap-2">
              {(master.tags ?? []).map((tag, i) => (
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
          </div>
          <div className="flex items-start gap-6">
            <div className="w-[72px] shrink-0 pt-0.5 text-[15px] font-bold text-gray-900">경력</div>
            <div className="flex-1 space-y-1 text-[14px] leading-[1.7] font-medium text-gray-500">
              {(master.career ?? []).map((line) => (
                <p key={line}>{line}</p>
              ))}
            </div>
          </div>
        </section>

        <section id="coaching-products" className="border-b border-gray-50 py-8 pl-6">
          <div className="mb-4 pr-6">
            <h3 className="text-[17px] font-bold tracking-tight text-gray-900">제공 서비스 · 요금</h3>
            <p className="mt-1 text-[13px] font-medium text-gray-400">
              9/15~10/30 얼리버드 39,000원 · 이후 69,000원
            </p>
          </div>

          <MasterProductCards masterId={masterId} />

          <div className="mt-4 mr-6 flex items-center justify-center gap-2 rounded-[12px] bg-brand-50 p-3 text-[12px] font-medium text-brand-500">
            <i className="fa-solid fa-circle-info text-[13px]" />
            불건전한 리뷰나 허위 멘토링 이력은 등록되지 않아요
          </div>
        </section>

        <section className="py-8 pl-6">
          <div className="mb-4 flex items-center justify-between pr-6">
            <h3 className="flex items-center gap-1.5 text-[17px] font-bold tracking-tight text-gray-900">
              리뷰
              <span className="flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white">
                N
              </span>
              <span className="ml-1 text-[14px] font-medium text-gray-400">{master.reviewCount}</span>
            </h3>
            <button type="button" className="text-[13px] font-medium text-gray-400">
              더보기
            </button>
          </div>

          <div className="no-scrollbar flex gap-4 overflow-x-auto pb-4 pr-6">
            {reviews.length === 0 ? (
              <div className="w-full rounded-[20px] border border-gray-100 bg-white p-6 text-center text-[13px] text-gray-400">
                아직 리뷰가 없어요
              </div>
            ) : (
              reviews.map((review) => (
                <div
                  key={review.id}
                  className="shadow-soft w-[260px] shrink-0 rounded-[20px] border border-gray-100 bg-white p-5"
                >
                  <div className="mb-3 flex items-start justify-between">
                    <div>
                      <div className="mb-1 text-[11px] font-medium text-gray-400">
                        {review.productLabel}
                      </div>
                      <div className="flex items-center gap-1">
                        <StarRow count={review.rating} />
                        <span className="ml-1 text-[13px] font-bold text-gray-900">
                          {review.rating}
                        </span>
                      </div>
                    </div>
                  </div>
                  <p className="line-clamp-3 text-[13px] leading-relaxed font-medium text-gray-700">
                    {review.text}
                  </p>
                </div>
              ))
            )}
          </div>
        </section>
      </main>

      <div className="fixed bottom-0 z-50 w-full max-w-[400px] border-t border-gray-100 bg-white p-4 pb-8">
        <div className="flex items-center gap-3">
          <FavoriteButton
            type="master"
            id={masterId}
            className="flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-[16px] border border-gray-100 bg-surface text-[18px]"
          />
          <Link
            href={`/masters/${masterId}/feedback`}
            className="shadow-lg shadow-brand-500/20 flex h-[52px] flex-1 items-center justify-center rounded-[16px] bg-brand-500 text-[16px] font-bold text-white transition-colors hover:bg-brand-600"
          >
            피드백 요청
          </Link>
        </div>
      </div>
    </div>
  );
}
