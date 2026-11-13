"use client";

import { HowItWorks } from "@/components/home/how-it-works";
import { HomeHeader, RealVsAssumed } from "@/components/home/home-header";
import { LatestRounds } from "@/components/home/latest-rounds";
import { NextRoundCard } from "@/components/home/next-round-card";
import { PromoCard } from "@/components/home/promo-card";
import { RecentRounds } from "@/components/home/recent-rounds";
import { RoundStatus } from "@/components/home/round-status";
import { SavingsChart } from "@/components/home/savings-chart";
import { StapleCard } from "@/components/home/staple-card";
import { Panel, SectionTitle } from "@/components/ui/panel";
import { ErrorNote, LoadingRegion, Skeleton } from "@/components/ui/states";
import { useLive } from "@/hooks/use-live";
import { useNow } from "@/hooks/use-now";
import { marketSnapshots } from "@/lib/item-summary";
import { fetchOverview, type Overview } from "@/lib/overview";
import { aggregate } from "@/lib/stats";

const REFRESH_MS = 15_000;

/** On phones the call to action comes right after the header; from xl it sits in the right column. */
const COLUMN = "contents xl:flex xl:flex-col xl:gap-6";

export function HomeLive({ initial, renderedAt }: { initial: Overview | null; renderedAt: number }) {
  const { data, error, loading, refresh } = useLive(fetchOverview, initial, REFRESH_MS);
  const now = useNow(renderedAt);

  if (!data) {
    return (
      <div className="space-y-6 pt-2">
        <HomeHeader />
        <PromoCard agg={null} loading={loading} />
        {loading ? <HomeSkeleton /> : <ErrorNote message={error ?? "No response."} onRetry={refresh} />}
      </div>
    );
  }
  const agg = aggregate(data.rounds);
  const snapshots = marketSnapshots(data.items, data.rounds);
  return (
    <div className="space-y-8 pt-2">
      <div className="flex flex-col gap-6 xl:grid xl:grid-cols-[minmax(0,1fr)_22rem] xl:items-start">
        <div className={COLUMN}>
          <div className="order-1 xl:order-none"><HomeHeader reference={data.items[0]} /></div>
          {error && <div className="order-1 xl:order-none"><ErrorNote message={error} onRetry={refresh} /></div>}
          <section aria-labelledby="staples" className="order-3 xl:order-none">
            <SectionTitle><span id="staples">The four staples</span></SectionTitle>
            <div className="grid gap-4 sm:grid-cols-2">
              {snapshots.map((s) => <StapleCard key={s.item.id} snapshot={s} />)}
            </div>
          </section>
          <div className="order-4 grid items-start gap-6 md:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] xl:order-none">
            <SavingsChart rounds={data.rounds} />
            <LatestRounds rounds={data.rounds} nowMs={now} />
          </div>
          <div className="order-7 xl:order-none"><RecentRounds rounds={data.rounds} items={data.items} nowMs={now} /></div>
        </div>
        <aside aria-label="Get involved and round status" className={COLUMN}>
          <div className="order-2 xl:order-none"><PromoCard agg={agg} loading={false} /></div>
          <div className="order-5 xl:order-none"><NextRoundCard /></div>
          <div className="order-6 xl:order-none"><RoundStatus rounds={data.rounds} nowMs={now} /></div>
        </aside>
      </div>

      <Panel aria-labelledby="how-it-works">
        <SectionTitle><span id="how-it-works">How it works</span></SectionTitle>
        <HowItWorks />
      </Panel>

      <RealVsAssumed />
    </div>
  );
}

function HomeSkeleton() {
  return (
    <LoadingRegion label="Loading chain data" className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2"><Skeleton className="h-52" /><Skeleton className="h-52" /><Skeleton className="h-52" /><Skeleton className="h-52" /></div>
      <Skeleton className="h-64" />
    </LoadingRegion>
  );
}
