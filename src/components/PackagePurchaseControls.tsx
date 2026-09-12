"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  FakePaymentSheet,
  type FakePaymentResult,
} from "@/components/FakePaymentSheet";
import { savePackagePurchase, useStudentCouponClaim } from "@/lib/db/api";
import {
  formatPrice,
  type MasterPackage,
  type PackageLevel,
} from "@/lib/db/schema";
import { processFakePayment } from "@/lib/payment/fake-payment";
import { useStudentId } from "@/lib/auth/use-student-id";
import { useDb } from "@/lib/db/use-db";
import { matchesStudentScope } from "@/lib/student-utils";

const EXAMPLE_COVER: Record<PackageLevel, string> = {
  beginner: "/course-covers/beginner.svg",
  intermediate: "/course-covers/intermediate.svg",
  master: "/course-covers/master.svg",
};

export function PackagePurchaseControls({
  pkg,
  compact = false,
}: {
  pkg: MasterPackage;
  compact?: boolean;
}) {
  const router = useRouter();
  const db = useDb();
  const studentId = useStudentId();
  const [open, setOpen] = useState(false);
  const [processing, setProcessing] = useState(false);

  const amount = pkg.priceVideo;
  const weekCount = pkg.weeks.length;
  const videoCount = pkg.weeks.filter((w) => w.videoUrl).length;
  const coverSrc = pkg.coverUrl || EXAMPLE_COVER[pkg.level] || EXAMPLE_COVER.beginner;
  const alreadyOwned = db.packagePurchases.some(
    (p) =>
      matchesStudentScope(studentId, p.studentId) &&
      p.packageId === pkg.id,
  );

  const handleConfirm = async (result: FakePaymentResult) => {
    setProcessing(true);
    try {
      await processFakePayment(result.amount);
      const purchase = await savePackagePurchase({
        studentId,
        masterId: pkg.masterId,
        packageId: pkg.id,
        mode: "video",
        priceAtPurchase: result.amount,
        packageTitle: pkg.title,
        couponClaimId: result.claimId,
      });
      if (result.claimId) {
        await useStudentCouponClaim(result.claimId);
      }
      setOpen(false);
      router.push(`/mypage/courses/${purchase.id}`);
    } catch (error) {
      console.error(error);
      alert("구매에 실패했어요. 다시 시도해 주세요.");
    } finally {
      setProcessing(false);
    }
  };

  if (alreadyOwned) {
    const purchase = db.packagePurchases.find(
      (p) =>
        matchesStudentScope(studentId, p.studentId) && p.packageId === pkg.id,
    );
    return (
      <div className={compact ? "space-y-2" : "space-y-3"}>
        <p className="text-center text-[12px] font-medium text-gray-500">
          이미 구매한 온라인 강의예요
        </p>
        {purchase && (
          <button
            type="button"
            onClick={() => router.push(`/mypage/courses/${purchase.id}`)}
            className="w-full rounded-xl bg-gray-900 py-3 text-[13px] font-bold text-white"
          >
            강의 이어보기
          </button>
        )}
      </div>
    );
  }

  return (
    <>
      <div className={compact ? "space-y-2.5" : "space-y-3"}>
        <div
          className={`rounded-xl px-3 py-2.5 ${compact ? "bg-white" : "bg-brand-50"}`}
        >
          <div className="flex items-center gap-3">
            <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-gray-100">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={coverSrc} alt="" className="h-full w-full object-cover" />
            </div>
            <div className="min-w-0 flex-1">
              <p
                className={`truncate text-[12px] font-medium ${
                  compact ? "text-gray-500" : "text-brand-600"
                }`}
              >
                {weekCount > 0 ? `온라인 강의 · ${weekCount}주` : "온라인 강의"}
              </p>
              <p className="mt-0.5 truncate text-[11px] text-gray-400">
                {weekCount > 0
                  ? `영상 ${videoCount}/${weekCount}개`
                  : "구매 후 커리큘럼 확인"}
              </p>
            </div>
            <span
              className={`shrink-0 font-extrabold ${
                compact ? "text-[15px] text-gray-900" : "text-[17px] text-brand-600"
              }`}
            >
              {formatPrice(amount)}원
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setOpen(true)}
          className="w-full rounded-xl bg-gray-900 py-3 text-[13px] font-bold text-white hover:bg-gray-800"
        >
          온라인 강의 구매하기
        </button>
      </div>

      <FakePaymentSheet
        open={open}
        productLabel={`${pkg.title} · 온라인 강의`}
        amount={amount}
        masterId={pkg.masterId}
        processing={processing}
        onClose={() => !processing && setOpen(false)}
        onConfirm={(result) => void handleConfirm(result)}
      />
    </>
  );
}
