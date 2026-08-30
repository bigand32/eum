import { MasterDetailView } from "@/components/MasterDetailView";

export default async function MasterDetailPage({
  params,
}: PageProps<"/masters/[masterId]">) {
  const { masterId } = await params;
  return <MasterDetailView masterId={masterId} />;
}
