import { Suspense } from "react";
import { FeedbackView } from "@/components/FeedbackView";

export default async function FeedbackPage({ params }: PageProps<"/feedback/[orderId]">) {
  const { orderId } = await params;
  return (
    <Suspense fallback={<div className="p-6 text-center">로딩 중…</div>}>
      <FeedbackView orderId={orderId} />
    </Suspense>
  );
}
