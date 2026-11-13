import Link from "next/link";
import { Eye } from "lucide-react";
import { HeroArt } from "@/components/produce-art";
import { buttonClass } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/states";
import { demoHref } from "@/lib/demo";
import { int, percent, rupiah } from "@/lib/format";
import type { Aggregate } from "@/lib/stats";

function SavingsSentence({ agg, loading }: { agg: Aggregate | null; loading: boolean }) {
  if (loading && !agg) return <Skeleton className="h-16 bg-white/15" />;
  if (!agg || agg.settledRounds === 0) {
    return <p>No round has settled yet. The first one shows its saving against the PIHPS market price here.</p>;
  }
  return (
    <p>
      Across <span className="num font-bold text-white">{int(agg.settledRounds)}</span> settled testnet {agg.settledRounds === 1 ? "round" : "rounds"} with simulated grosir costs, buyers saved{" "}
      <span className="num font-extrabold text-white">{rupiah(agg.totalSaving)}</span> in test rupiah, <span className="num font-bold text-white">{percent(agg.avgPercentBelow)}</span> below the PIHPS market price on average.
    </p>
  );
}

/** Dark call-to-action card: the two ways in, plus the qualified savings sentence. */
export function PromoCard({ agg, loading }: { agg: Aggregate | null; loading: boolean }) {
  return (
    <section aria-labelledby="promo-title" className="on-dark relative isolate overflow-hidden rounded-card bg-night p-6 text-white">
      <div className="relative z-10 sm:max-w-[58%] xl:max-w-none">
        <h2 id="promo-title" className="text-2xl font-bold tracking-[-0.02em]">Run your warung</h2>
        <div className="mt-2 text-sm text-night-muted">
          <SavingsSentence agg={agg} loading={loading} />
        </div>
        <div className="mt-5 flex flex-col gap-2.5">
          <Link href="/warung" className={buttonClass("primary", "w-full sm:w-auto xl:w-full")}>Set up my warung</Link>
          <Link href={demoHref()} className={buttonClass("onBrand", "w-full sm:w-auto xl:w-full")}>
            <Eye className="size-4" aria-hidden /> See a warung in action
          </Link>
        </div>
      </div>
      <HeroArt className="pointer-events-none hidden sm:absolute sm:inset-y-0 sm:right-0 sm:block sm:w-[40%] xl:relative xl:mt-5 xl:h-40 xl:w-full" />
    </section>
  );
}
