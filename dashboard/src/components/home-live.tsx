"use client";

import Link from "next/link";
import { ArrowRight, Info } from "lucide-react";
import { BannerLine, HeroBanner } from "@/components/hero-banner";
import { HowItWorks } from "@/components/how-it-works";
import { ItemCard } from "@/components/item-card";
import { RoundTable } from "@/components/round-table";
import { ServicePulse } from "@/components/service-pulse";
import { buttonClass } from "@/components/ui/button";
import { Panel, SectionTitle, linkClass } from "@/components/ui/panel";
import { EmptyState, ErrorNote, Skeleton } from "@/components/ui/states";
import { useLive } from "@/hooks/use-live";
import { useNow } from "@/hooks/use-now";
import { int, percent, rupiah } from "@/lib/format";
import { marketSnapshots } from "@/lib/item-summary";
import { fetchOverview, type Overview } from "@/lib/overview";
import { aggregate, type Aggregate } from "@/lib/stats";

const REFRESH_MS = 15_000;
const PREVIEW = 5;

function Banner({ agg, loading }: { agg: Aggregate | null; loading: boolean }) {
  return (
    <HeroBanner
      title="Small warung, wholesale prices."
      actions={
        <>
          <Link href="/warung" className={buttonClass("onBrand", "px-5")}>Run your warung</Link>
          <Link href="/rounds" className={buttonClass("ghost", "bg-white/10 px-5 text-white hover:bg-white/20 hover:text-white")}>View rounds</Link>
        </>
      }
    >
      <p>
        Warungs (small neighbourhood shops) pool their orders, wholesalers bid in a sealed auction, and a NEAR contract holds the money and enforces each owner&apos;s limits.
      </p>
      <div className="mt-4 text-white">
        <BannerLine loading={loading && !agg}>
          {agg && agg.settledRounds > 0 ? (
            <>
              Across <span className="num font-bold">{int(agg.settledRounds)}</span> settled {agg.settledRounds === 1 ? "round" : "rounds"}, buyers saved{" "}
              <span className="num text-xl font-extrabold">{rupiah(agg.totalSaving)}</span> against the PIHPS market price,{" "}
              <span className="num font-bold">{percent(agg.avgPercentBelow)}</span> below on average.
            </>
          ) : (
            <>No round has settled yet. The first one shows its saving against the PIHPS market price here.</>
          )}
        </BannerLine>
      </div>
    </HeroBanner>
  );
}

export function HomeLive({ initial, renderedAt }: { initial: Overview | null; renderedAt: number }) {
  const { data, error, loading, refresh } = useLive(fetchOverview, initial, REFRESH_MS);
  const now = useNow(renderedAt);

  if (!data) {
    return (
      <div className="space-y-8">
        <Banner agg={null} loading={loading} />
        {loading ? <HomeSkeleton /> : <ErrorNote message={error ?? "No response."} onRetry={refresh} />}
      </div>
    );
  }
  const latest = [...data.rounds].reverse().slice(0, PREVIEW);
  const source = data.items[0]?.source;
  const asOf = data.items[0]?.as_of;
  return (
    <div className="space-y-8 sm:space-y-10">
      <Banner agg={aggregate(data.rounds)} loading={false} />
      {error && <ErrorNote message={error} onRetry={refresh} />}

      <section aria-labelledby="staples">
        <SectionTitle aside={source && asOf ? <span className="text-sm text-muted">Reference: {source}, {asOf}</span> : null}>
          <span id="staples">The four staples, against the market price</span>
        </SectionTitle>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {marketSnapshots(data.items, data.rounds).map((s) => (
            <ItemCard key={s.item.id} snapshot={s} qtyLabel="pooled in the last round" qtyEmpty="No settled round yet" />
          ))}
        </div>
      </section>

      <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <Panel aria-labelledby="latest-rounds">
          <SectionTitle aside={<Link className={`${linkClass} inline-flex items-center gap-1 text-sm`} href="/rounds">All rounds <ArrowRight className="size-4" aria-hidden /></Link>}>
            <span id="latest-rounds">Recent rounds</span>
          </SectionTitle>
          {latest.length === 0 ? (
            <EmptyState title="No rounds yet">
              The agent service opens rounds on a schedule. See its <Link className={linkClass} href="/status">status</Link>, or <Link className={linkClass} href="/warung">run your warung</Link>.
            </EmptyState>
          ) : (
            <RoundTable rounds={latest} items={data.items} nowMs={now} caption="Most recent Koelakan rounds" />
          )}
        </Panel>
        <ServicePulse />
      </div>

      <Panel aria-labelledby="how-it-works">
        <SectionTitle><span id="how-it-works">How it works</span></SectionTitle>
        <HowItWorks />
      </Panel>

      <p className="flex max-w-3xl gap-2.5 text-xs text-muted" aria-label="What is real and what is assumed">
        <Info className="mt-0.5 size-4 shrink-0" aria-hidden />
        <span>
          <strong className="font-semibold text-ink">What is real and what is assumed.</strong> The PIHPS reference prices (11 Nov 2026) and HET (government ceiling price) are official data, stored on-chain; no round&apos;s max price can exceed the PIHPS price. The costs of the grosirs we run ourselves are <strong className="font-semibold text-ink">assumptions</strong> (0.85 to 0.97 times HET), not real wholesale prices. tIDR is testnet test rupiah. Warungs named <span className="num">warung-NN</span> are seeded test accounts with fictional owner names; any other account is a real person using the app.
        </span>
      </p>
    </div>
  );
}

function HomeSkeleton() {
  return (
    <div className="space-y-6" role="status" aria-label="Loading chain data">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><Skeleton className="h-64" /><Skeleton className="h-64" /><Skeleton className="h-64" /><Skeleton className="h-64" /></div>
      <Skeleton className="h-64" />
    </div>
  );
}
