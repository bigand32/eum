import { MasterFeedbackEditor } from "@/components/MasterFeedbackEditor";

export default async function MasterFeedbackOrderPage({
  params,
}: PageProps<"/master/feedback/[orderId]">) {
  const { orderId } = await params;
  return <MasterFeedbackEditor orderId={orderId} />;
}
