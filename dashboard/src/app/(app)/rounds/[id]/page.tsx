import { notFound } from "next/navigation";
import { RoundDetailLive } from "@/components/round/round-detail-live";
import { loadRoundBundle } from "@/lib/overview";

export const revalidate = 15;

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return { title: `Round #${id}` };
}

export default async function RoundPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^\d+$/.test(id)) notFound();
  const { data, renderedAt } = await loadRoundBundle(Number(id));
  return <RoundDetailLive id={Number(id)} initial={data} renderedAt={renderedAt} />;
}
