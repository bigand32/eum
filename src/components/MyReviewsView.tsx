"use client";

import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { useDb } from "@/lib/db/use-db";
import { useStudentId } from "@/lib/auth/use-student-id";

function formatReviewDate(iso: string) {
  const d = new Date(iso);
  return `${d.getFullYear()}.${d.getMonth() + 1}.${d.getDate()}`;
}

function StarRow({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5 text-[11px] text-brand-500">
      {[1, 2, 3, 4, 5].map((i) => (
        <i
          key={i}
          className={`fa-solid ${
            i <= Math.floor(rating)
              ? "fa-star"
              : rating % 1 >= 0.5 && i === Math.ceil(rating)
                ? "fa-star-half-stroke"
                : "fa-star text-gray-200"
          }`}
        />
      ))}
    </div>
  );
}

export function MyReviewsView() {
  const db = useDb();
  const studentId = useStudentId();
  const reviews = db.studentReviews
    .filter((r) => r.studentId === studentId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return (
    <>
      <PageHeader title="내가 쓴 리뷰" backHref="/mypage" />
      <main className="flex flex-col gap-3 p-5 pb-28">
        {reviews.length === 0 ? (
          <div className="rounded-[20px] border border-gray-100 bg-white p-8 text-center">
            <p className="text-[14px] font-medium text-gray-400">작성한 리뷰가 없어요</p>
            <Link href="/search" className="mt-3 inline-block text-[13px] font-bold text-brand-500">
              피드백 받고 리뷰 남기기
            </Link>
          </div>
        ) : (
          reviews.map((review) => {
            const master = db.masters.find((m) => m.id === review.masterId);
            return (
              <div
                key={review.id}
                className="shadow-soft rounded-[20px] border border-gray-100 bg-white p-5"
              >
                <div className="mb-3 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="mb-1 text-[12px] font-medium text-gray-400">
                      {formatReviewDate(review.createdAt)}
                    </p>
                    <Link
                      href={master ? `/masters/${master.id}` : "/search"}
                      className="text-[14px] font-bold text-gray-900 hover:text-brand-500"
                    >
                      {master?.title ?? "마스터"}
                    </Link>
                    <p className="mt-0.5 text-[12px] text-gray-500">{review.productLabel}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <StarRow rating={review.rating} />
                    <p className="mt-1 text-[13px] font-bold text-gray-900">{review.rating}</p>
                  </div>
                </div>
                <p className="text-[14px] leading-relaxed font-medium text-gray-700">
                  {review.text}
                </p>
              </div>
            );
          })
        )}
      </main>
    </>
  );
}
