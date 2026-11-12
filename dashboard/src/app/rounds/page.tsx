import { RoundsLive } from "@/components/rounds-live";
import { loadOverview } from "@/lib/overview";

export const revalidate = 15;
export const metadata = { title: "Ronde | Koelakan" };

export default async function RoundsPage() {
  const { data, renderedAt } = await loadOverview();
  return (
    <>
      <h1 className="font-display text-4xl font-bold tracking-tight">Ronde kulakan</h1>
      <p className="mb-6 mt-2 max-w-2xl text-ink-soft">
        Setiap baris dibaca langsung dari kontrak market di testnet. Fase ronde yang masih berjalan dihitung dari tenggat dan jam sekarang.
      </p>
      <RoundsLive initial={data} renderedAt={renderedAt} />
    </>
  );
}
