"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { RoundList } from "@/components/round/round-list";
import { Panel, SectionTitle, linkClass } from "@/components/ui/panel";
import { EmptyState, ErrorNote, LoadingRegion, Skeleton } from "@/components/ui/states";
import { FilterTabs, type TabOption } from "@/components/ui/tabs";
import { useLive } from "@/hooks/use-live";
import { useNow } from "@/hooks/use-now";
import { fetchOverview, type Overview } from "@/lib/overview";
import { derivePhase } from "@/lib/phase";
import type { RoundView } from "@/lib/types";

const REFRESH_MS = 10_000;

type Filter = "all" | "open" | "closed" | "failed";

/** Open means still moving through its phases; closed means paid out; failed means refunded. */
function matches(filter: Filter, round: RoundView, nowMs: number): boolean {
  const phase = derivePhase(round, nowMs);
  if (filter === "all") return true;
  if (filter === "failed") return phase === "Failed";
  if (filter === "closed") return phase === "Closed";
  return phase !== "Failed" && phase !== "Closed";
}

const EMPTY_COPY: Record<Filter, string> = {
  all: "No rounds yet",
  open: "No open rounds right now",
  closed: "No closed rounds yet",
  failed: "No failed rounds",
};

export function RoundsLive({ initial, renderedAt }: { initial: Overview | null; renderedAt: number }) {
  const { data, error, loading, refresh } = useLive(fetchOverview, initial, REFRESH_MS);
  const now = useNow(renderedAt);
  const [filter, setFilter] = useState<Filter>("all");

  const rounds = useMemo(() => [...(data?.rounds ?? [])].reverse(), [data]);
  const options = useMemo<TabOption<Filter>[]>(
    () => (["all", "open", "closed", "failed"] as const).map((id) => ({
      id,
      label: id === "all" ? "All" : id[0]!.toUpperCase() + id.slice(1),
      count: rounds.filter((r) => matches(id, r, now)).length,
    })),
    [rounds, now],
  );

  if (!data) {
    return loading
      ? <LoadingRegion label="Loading rounds…"><Skeleton className="h-96" /></LoadingRegion>
      : <ErrorNote message={error ?? "No response."} onRetry={refresh} />;
  }
  if (data.rounds.length === 0) {
    return (
      <EmptyState title="No rounds yet">
        The agent service opens rounds on a schedule. See its <Link className={linkClass} href="/status">status</Link>, or <Link className={linkClass} href="/warung">run your warung</Link>.
      </EmptyState>
    );
  }
  const shown = rounds.filter((r) => matches(filter, r, now));
  return (
    <div className="space-y-4">
      {error && <ErrorNote message={error} onRetry={refresh} />}
      <Panel aria-labelledby="rounds-heading">
        <SectionTitle aside={<FilterTabs label="Filter rounds" options={options} value={filter} onChange={setFilter} />}>
          <span id="rounds-heading">Rounds</span>
        </SectionTitle>
        {shown.length === 0 ? (
          <EmptyState title={EMPTY_COPY[filter]}>
            {filter === "all" ? null : <>Switch to <button type="button" onClick={() => setFilter("all")} className={linkClass}>All</button> to see every round.</>}
          </EmptyState>
        ) : (
          <RoundList rounds={shown} items={data.items} nowMs={now} label="All Koelakan rounds" />
        )}
      </Panel>
    </div>
  );
}
