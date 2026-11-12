"use client";

import Link from "next/link";
import { PhaseBadge } from "@/components/phase-badge";
import { BidsTable } from "@/components/round/bids-table";
import { ForfeitBox } from "@/components/round/forfeit-box";
import { ParticipantsTable } from "@/components/round/participants-table";
import { PriceCompare } from "@/components/round/price-compare";
import { Timeline } from "@/components/round/timeline";
import { Panel, SectionTitle } from "@/components/ui/panel";
import { EmptyState, ErrorNote, Skeleton } from "@/components/ui/states";
import { useLive } from "@/hooks/use-live";
import { useNow } from "@/hooks/use-now";
import { accountUrl } from "@/lib/config";
import { formatDateTime, int, percent, rupiah, shortAccount } from "@/lib/format";
import { nsToMs } from "@/lib/json";
import { fetchRoundBundle, type RoundBundle } from "@/lib/overview";
import { itemLabel } from "@/lib/items";
import { derivePhase } from "@/lib/phase";
import { isSettled, itemOf, savingOf, savingPercent, winnerBid } from "@/lib/stats";
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
      ? <div role="status" aria-label="Loading round" className="space-y-4"><Skeleton className="h-24" /><Skeleton className="h-64" /></div>
      : <ErrorNote message={error ?? "No response."} onRetry={refresh} />;
  }
  const round = data.round;
  if (!round) {
    return (
      <EmptyState title={`Round #${id} not found`}>
        <Link className="underline" href="/rounds">Back to all rounds</Link>
      </EmptyState>
    );
  }
  const item = itemOf(data.items, round.item);
  const unit = item?.unit ?? "unit";
  const phase = derivePhase(round, now);
  const winner = winnerBid(round);
  const settled = isSettled(round);

  return (
    <div className="space-y-6">
      {error && <ErrorNote message={error} onRetry={refresh} />}
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="num text-sm text-ink-soft"><Link href="/rounds" className="underline underline-offset-4 hover:text-chili">Rounds</Link> / #{round.id}</p>
          <h1 className="font-display text-4xl font-bold tracking-tight">{itemLabel(item, round.item)}</h1>
          <p className="mt-1 text-sm text-ink-soft">
            Opened {formatDateTime(nsToMs(round.opened_at))} by{" "}
            <a className="num underline decoration-rule underline-offset-4 hover:text-chili" target="_blank" rel="noreferrer" href={accountUrl(round.opener)}>{shortAccount(round.opener)}</a>
            {" · minimum lot "}<span className="num">{int(round.min_total_qty)} {unit}</span>
          </p>
        </div>
        <div className="flex items-center gap-3">
          <PhaseBadge phase={phase} />
          <Link href={`/chat?round=${round.id}`} className="inline-flex min-h-11 items-center rounded-md border-2 border-ink bg-cream px-4 text-sm font-semibold hover:bg-kunyit-soft">
            Open agent chat
          </Link>
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
        <Panel aria-labelledby="result">
          <SectionTitle><span id="result">Auction result</span></SectionTitle>
          {settled && winner && round.clearing_price !== null ? (
            <div className="mb-5 grid grid-cols-2 gap-4 border-b-2 border-dashed border-rule pb-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-ink-soft">Winner</p>
                <a className="num text-lg font-semibold underline decoration-rule underline-offset-4 hover:text-chili" target="_blank" rel="noreferrer" href={accountUrl(winner.seller_id)}>
                  {shortAccount(winner.seller_id)}
                </a>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-ink-soft">Winning price</p>
                <p className="num text-lg font-semibold">{rupiah(round.clearing_price)}/{unit}</p>
              </div>
              <div className="col-span-2 rounded-md bg-pandan-soft/70 p-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-pandan">Saved vs PIHPS</p>
                <p className="num text-2xl font-semibold text-pandan">{rupiah(savingOf(round))}</p>
                <p className="text-sm text-ink-soft">
                  ({rupiah(round.ref_price)} - {rupiah(round.clearing_price)}) x {int(round.total_qty)} {unit} ={" "}
                  {percent(savingPercent(round))} below the market price
                </p>
              </div>
            </div>
          ) : (
            <p className="mb-5 rounded-md bg-paper-deep/60 p-3 text-sm">
              {round.state === "Failed"
                ? "Round failed: no valid bid, or demand was below the minimum. All funds were refunded."
                : "The winner is picked once the reveal phase ends."}
            </p>
          )}
          <PriceCompare round={round} item={item} />
        </Panel>

        <Panel aria-labelledby="phases">
          <SectionTitle><span id="phases">Phases and deadlines</span></SectionTitle>
          <Timeline round={round} nowMs={now} />
        </Panel>
      </div>

      <Panel aria-labelledby="participants">
        <SectionTitle aside={<span className="num text-sm text-ink-soft">{round.participants.length} warungs · {int(round.total_qty)} {unit}</span>}>
          <span id="participants">Participants (warungs)</span>
        </SectionTitle>
        {round.participants.length === 0 ? <EmptyState title="No warung has joined yet" /> : <ParticipantsTable round={round} unit={unit} />}
        {settled && round.participants.length > 0 && (
          <p className="mt-3 text-sm text-ink-soft">Delivery confirmation: {deliverySummary(round)}.</p>
        )}
      </Panel>

      <Panel aria-labelledby="bids">
        <SectionTitle><span id="bids">Grosir bids</span></SectionTitle>
        {round.bids.length === 0 ? (
          <EmptyState title="No bids yet">Grosirs submit sealed bids after the joining phase ends, as long as the grosir agents are running from the repo.</EmptyState>
        ) : (
          <div className="space-y-4">
            <BidsTable round={round} />
            <ForfeitBox round={round} />
          </div>
        )}
      </Panel>
    </div>
  );
}
