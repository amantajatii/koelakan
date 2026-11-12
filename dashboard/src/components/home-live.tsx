"use client";

import Link from "next/link";
import { Catalogue } from "@/components/catalogue";
import { DemoNote } from "@/components/demo-note";
import { HowItWorks } from "@/components/how-it-works";
import { RoundCard } from "@/components/round-card";
import { StatsStrip } from "@/components/stats-strip";
import { EmptyState, ErrorNote, Skeleton } from "@/components/ui/states";
import { SectionTitle } from "@/components/ui/panel";
import { useLive } from "@/hooks/use-live";
import { useNow } from "@/hooks/use-now";
import { fetchOverview, type Overview } from "@/lib/overview";
import { aggregate } from "@/lib/stats";

const REFRESH_MS = 15_000;
const PREVIEW = 3;

export function HomeLive({ initial, renderedAt }: { initial: Overview | null; renderedAt: number }) {
  const { data, error, loading, refresh } = useLive(fetchOverview, initial, REFRESH_MS);
  const now = useNow(renderedAt);

  if (!data) {
    return loading ? <HomeSkeleton /> : <ErrorNote message={error ?? "No response."} onRetry={refresh} />;
  }
  const latest = [...data.rounds].reverse().slice(0, PREVIEW);
  return (
    <div className="space-y-10">
      {error && <ErrorNote message={error} onRetry={refresh} />}
      <StatsStrip agg={aggregate(data.rounds)} />
      <section aria-labelledby="latest-rounds">
        <SectionTitle aside={<Link className="text-sm font-semibold underline underline-offset-4 hover:text-chili" href="/rounds">All rounds</Link>}>
          <span id="latest-rounds">Latest rounds</span>
        </SectionTitle>
        {latest.length === 0 ? (
          <EmptyState title="No rounds yet">
            Open the first round from the <Link className="underline" href="/try">Try it yourself</Link> page.
          </EmptyState>
        ) : (
          <div className="grid gap-4 md:grid-cols-3">
            {latest.map((r) => <RoundCard key={r.id} round={r} items={data.items} nowMs={now} />)}
          </div>
        )}
      </section>
      <Catalogue items={data.items} />
      <DemoNote />
      <section aria-labelledby="how-it-works">
        <SectionTitle><span id="how-it-works">How it works</span></SectionTitle>
        <HowItWorks />
      </section>
    </div>
  );
}

function HomeSkeleton() {
  return (
    <div className="space-y-6" role="status" aria-label="Loading chain data">
      <Skeleton className="h-28" />
      <div className="grid gap-4 md:grid-cols-3"><Skeleton className="h-36" /><Skeleton className="h-36" /><Skeleton className="h-36" /></div>
      <Skeleton className="h-64" />
    </div>
  );
}
