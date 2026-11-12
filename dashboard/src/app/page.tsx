import Link from "next/link";
import { LiveStrip } from "@/components/live-strip";
import { HomeLive } from "@/components/home-live";
import { loadOverview } from "@/lib/overview";

export const revalidate = 15;

export default async function HomePage() {
  const { data, renderedAt } = await loadOverview();
  return (
    <>
      <section className="mb-10 max-w-3xl">
        <LiveStrip />
        <p className="mb-3 inline-block -rotate-1 rounded-sm border-2 border-chili px-2 py-0.5 text-xs font-bold uppercase tracking-widest text-chili">
          kulakan = restocking from a wholesaler
        </p>
        <h1 className="font-display text-4xl font-bold leading-[1.05] tracking-tight sm:text-6xl">
          Small warung, <span className="text-chili">wholesale</span> prices.
        </h1>
        <p className="mt-4 max-w-2xl text-lg text-ink-soft">
          Every warung (small neighbourhood shop) has an agent. The agents pool their orders into one big round, then grosir
          (wholesaler) agents compete in a sealed-bid auction. A NEAR contract escrows the funds and enforces each owner&apos;s
          price limits and budget. Prices are checked against PIHPS, Indonesia&apos;s national food price monitor.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/warung" className="inline-flex min-h-11 items-center rounded-md bg-ink px-5 text-sm font-semibold text-cream hover:bg-chili">
            Run your warung
          </Link>
          <Link href="/rounds" className="inline-flex min-h-11 items-center rounded-md border-2 border-ink bg-cream px-5 text-sm font-semibold hover:bg-kunyit-soft">
            View rounds
          </Link>
          <Link href="/grosir" className="inline-flex min-h-11 items-center rounded-md border-2 border-ink bg-cream px-5 text-sm font-semibold hover:bg-kunyit-soft">
            For wholesalers
          </Link>
        </div>
      </section>
      <HomeLive initial={data} renderedAt={renderedAt} />
    </>
  );
}
