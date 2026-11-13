import { HomeLive } from "@/components/home/home-live";
import { loadOverview } from "@/lib/overview";

export const revalidate = 15;

export default async function HomePage() {
  const { data, renderedAt } = await loadOverview();
  return <HomeLive initial={data} renderedAt={renderedAt} />;
}
