import { Suspense } from "react";
import { ReservationBooking } from "@/components/ReservationBooking";
import { PageHeader } from "@/components/PageHeader";

export default async function ReservationBookPage({
  params,
}: PageProps<"/masters/[masterId]/reservation">) {
  const { masterId } = await params;

  return (
    <>
      <PageHeader title="일정 예약" backHref={`/masters/${masterId}`} />
      <Suspense fallback={<div className="p-6 text-center text-gray-400">로딩 중…</div>}>
        <ReservationBooking masterId={masterId} />
      </Suspense>
    </>
  );
}
