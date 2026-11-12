import { RoundsLive } from "@/components/rounds-live";
import { loadOverview } from "@/lib/overview";

export const revalidate = 15;
export const metadata = { title: "Rounds" };

export default async function RoundsPage() {
  const { data, renderedAt } = await loadOverview();
  return (
    <>
      <h1 className="font-display text-4xl font-bold tracking-tight">Kulakan rounds</h1>
      <p className="mb-6 mt-2 max-w-2xl text-ink-soft">
        Every row is read straight from the market contract on testnet. The phase of a live round is derived from its deadlines and the current time.
      </p>
      <RoundsLive initial={data} renderedAt={renderedAt} />
    </>
  );
}
