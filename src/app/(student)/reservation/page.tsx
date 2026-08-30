import { Suspense } from "react";
import { ReservationListView } from "@/components/ReservationListView";

export default function ReservationPage() {
  return (
    <Suspense>
      <ReservationListView />
    </Suspense>
  );
}
