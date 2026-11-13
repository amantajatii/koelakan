import { HomeLive } from "@/components/home/home-live";
import { loadOverview } from "@/lib/overview";

export const revalidate = 15;
// ISR every 15 s. The RPC layer fetches with no-store and caches in memory, so without this the build
// marks whichever page fetches first as dynamic.
export const dynamic = "force-static";

export default async function HomePage() {
  const { data, renderedAt } = await loadOverview();
  return <HomeLive initial={data} renderedAt={renderedAt} />;
}
