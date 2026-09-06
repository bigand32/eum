"use client";

import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { useDb } from "@/lib/db/use-db";
import { useStudentId } from "@/lib/auth/use-student-id";
import { matchesStudentScope } from "@/lib/student-utils";
import { PACKAGE_LEVEL_LABEL } from "@/lib/db/schema";

export function StudentCourseListView() {
  const db = useDb();
  const studentId = useStudentId();

  const purchases = db.packagePurchases
    .filter((p) => matchesStudentScope(studentId, p.studentId))
    .sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );

  return (
    <>
      <PageHeader title="내 강의" backHref="/mypage" />
      <main className="flex flex-col gap-3 p-5 pb-28">
        {purchases.length === 0 ? (
          <div className="rounded-[20px] border border-gray-100 bg-white p-8 text-center">
            <p className="text-[14px] text-gray-400">아직 구매한 온라인 강의가 없어요</p>
            <Link
              href="/search"
              className="mt-3 inline-block text-[13px] font-bold text-brand-500"
            >
              마스터 찾아보기
            </Link>
          </div>
        ) : (
          purchases.map((purchase) => {
            const pkg = db.masterPackages.find((p) => p.id === purchase.packageId);
            const master = db.masters.find((m) => m.id === purchase.masterId);
            const videoCount = pkg?.weeks.filter((w) => w.videoUrl).length ?? 0;
            return (
              <Link
                key={purchase.id}
                href={`/mypage/courses/${purchase.id}`}
                className="rounded-[20px] border border-gray-100 bg-white p-4 shadow-soft"
              >
                <div className="mb-1 flex items-center gap-2">
                  {pkg && (
                    <span className="rounded-md bg-gray-100 px-2 py-0.5 text-[10px] font-bold text-gray-600">
                      {PACKAGE_LEVEL_LABEL[pkg.level]}
                    </span>
                  )}
                  <span className="text-[12px] text-gray-400">
                    {master?.title ?? "마스터"}
                  </span>
                </div>
                <h3 className="text-[15px] font-bold text-gray-900">
                  {purchase.packageTitle}
                </h3>
                <p className="mt-1 text-[12px] text-gray-500">
                  {pkg && pkg.weeks.length > 0
                    ? `${pkg.weeks.length}주 · 영상 ${videoCount}개`
                    : "온라인 강의"}
                </p>
              </Link>
            );
          })
        )}
      </main>
    </>
  );
}
