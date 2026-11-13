import { RoundsLive } from "@/components/round/rounds-live";
import { PageHeader } from "@/components/ui/page-header";
import { loadOverview } from "@/lib/overview";

export const revalidate = 15;
// ISR every 15 s. The RPC layer fetches with no-store and caches in memory, so without this the build
// marks whichever page fetches first as dynamic.
export const dynamic = "force-static";
export const metadata = { title: "Rounds" };

export default async function RoundsPage() {
  const { data, renderedAt } = await loadOverview();
  return (
    <>
      <PageHeader title="Kulakan rounds">
        Every row is read straight from the market contract on testnet. The phase of a live round is derived from its deadlines and the current time.
      </PageHeader>
      <RoundsLive initial={data} renderedAt={renderedAt} />
    </>
  );
}
