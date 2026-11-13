"use client";

import Link from "next/link";
import { ChevronRight, MessageCircle } from "lucide-react";
import { PhaseBadge } from "@/components/shared/phase-badge";
import { ItemImage } from "@/components/shared/produce-art";
import { BidsTable } from "@/components/round/bids-table";
import { ForfeitBox } from "@/components/round/forfeit-box";
import { ParticipantsTable } from "@/components/round/participants-table";
import { PriceCompare } from "@/components/round/price-compare";
import { ResultCard } from "@/components/round/result-card";
import { Timeline } from "@/components/round/timeline";
import { buttonClass } from "@/components/ui/button";
import { Panel, SectionTitle, linkClass } from "@/components/ui/panel";
import { EmptyState, ErrorNote, LoadingRegion, Skeleton } from "@/components/ui/states";
import { useLive } from "@/hooks/use-live";
import { useNow } from "@/hooks/use-now";
import { accountUrl } from "@/lib/config";
import { formatDateTime, int, shortAccount } from "@/lib/format";
import { nsToMs } from "@/lib/json";
import { fetchRoundBundle, type RoundBundle } from "@/lib/overview";
import { itemLabel } from "@/lib/items";
import { derivePhase } from "@/lib/phase";
import { isSettled, itemOf } from "@/lib/stats";
import type { RoundView } from "@/lib/types";

const REFRESH_MS = 10_000;

function deliverySummary(round: RoundView): string {
  const count = (pred: (d: RoundView["participants"][number]["delivery"]) => boolean): number =>
    round.participants.filter((p) => pred(p.delivery)).length;
  const confirmed = count((d) => d === "Confirmed");
  const accepted = count((d) => d === "Accepted");
  const pending = count((d) => d === "Pending");
  const disputed = count((d) => d === "Disputed" || typeof d === "object" || d === "DefaultRefunded");
  return `${confirmed} confirmed, ${accepted} auto-accepted, ${pending} waiting, ${disputed} disputed`;
}

export function RoundDetailLive({ id, initial, renderedAt }: { id: number; initial: RoundBundle | null; renderedAt: number }) {
  const { data, error, loading, refresh } = useLive(() => fetchRoundBundle(id), initial, REFRESH_MS);
  const now = useNow(renderedAt);

  if (!data) {
    return loading
      ? <LoadingRegion label="Loading round…" className="space-y-4"><Skeleton className="h-32" /><Skeleton className="h-48" /><Skeleton className="h-64" /></LoadingRegion>
      : <ErrorNote message={error ?? "No response."} onRetry={refresh} />;
  }
  const round = data.round;
  if (!round) {
    return (
      <EmptyState title={`Round #${id} not found`}>
        Rounds are numbered from 1. <Link className={linkClass} href="/rounds">Back to all rounds</Link>
      </EmptyState>
    );
  }
  const item = itemOf(data.items, round.item);
  const unit = item?.unit ?? "unit";
  const phase = derivePhase(round, now);
  const settled = isSettled(round);

  return (
    <div className="space-y-6">
      {error && <ErrorNote message={error} onRetry={refresh} />}
      <nav aria-label="Breadcrumb" className="mt-2 flex items-center gap-1 text-sm text-muted">
        <Link href="/rounds" className="font-semibold hover:text-ink">Rounds</Link>
        <ChevronRight className="size-4" aria-hidden />
        <span className="num" aria-current="page">#{round.id}</span>
      </nav>

      <Panel aria-labelledby="round-title" className="flex flex-wrap items-center justify-between gap-5">
        <div className="flex min-w-0 items-center gap-4">
          <ItemImage itemId={round.item} size="xl" plain />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
              <h1 id="round-title" className="text-3xl font-extrabold tracking-[-0.02em] sm:text-4xl">{itemLabel(item, round.item)}</h1>
              <PhaseBadge phase={phase} />
            </div>
            <p className="mt-1.5 text-sm text-muted">
              Round <span className="num font-semibold text-ink">#{round.id}</span> · opened {formatDateTime(nsToMs(round.opened_at))} by{" "}
              <a className={`num ${linkClass}`} target="_blank" rel="noreferrer" href={accountUrl(round.opener)}>{shortAccount(round.opener)}</a>
              {" · minimum lot "}<span className="num">{int(round.min_total_qty)} {unit}</span>
            </p>
          </div>
        </div>
        <Link href={`/chat?round=${round.id}`} className={buttonClass("secondary", "gap-2")}>
          <MessageCircle className="size-4" aria-hidden /> Open agent chat
        </Link>
      </Panel>

      <ResultCard round={round} unit={unit} />

      <Panel aria-labelledby="ladder">
        <SectionTitle><span id="ladder">Price ladder</span></SectionTitle>
        <PriceCompare round={round} item={item} />
      </Panel>

      <Panel aria-labelledby="phases">
        <SectionTitle><span id="phases">Phases and deadlines</span></SectionTitle>
        <Timeline round={round} nowMs={now} />
      </Panel>

      <Panel aria-labelledby="participants">
        <SectionTitle aside={<span className="num text-sm text-muted">{round.participants.length} warungs · {int(round.total_qty)} {unit}</span>}>
          <span id="participants">Participants (warungs)</span>
        </SectionTitle>
        {round.participants.length === 0 ? (
          <EmptyState title="No warung has joined yet">Warungs join during the joining phase. Delegate your own agent on <Link className={linkClass} href="/warung">My warung</Link>.</EmptyState>
        ) : (
          <ParticipantsTable round={round} unit={unit} />
        )}
        {settled && round.participants.length > 0 && (
          <p className="mt-4 text-sm text-muted">Delivery confirmation: {deliverySummary(round)}.</p>
        )}
      </Panel>

      <Panel aria-labelledby="bids">
        <SectionTitle><span id="bids">Grosir bids</span></SectionTitle>
        {round.bids.length === 0 ? (
          <EmptyState title="No bids yet">Grosirs submit sealed bids after the joining phase ends, as long as the grosir agents are running from the repo.</EmptyState>
        ) : (
          <BidsTable round={round} />
        )}
      </Panel>
      <ForfeitBox round={round} />
    </div>
  );
}
