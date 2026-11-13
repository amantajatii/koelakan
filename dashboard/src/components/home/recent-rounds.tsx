import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { ItemImage } from "@/components/produce-art";
import { PhaseBadge } from "@/components/phase-badge";
import { Panel, SectionTitle, linkClass } from "@/components/ui/panel";
import { EmptyState } from "@/components/ui/states";
import { int, percent, rupiah } from "@/lib/format";
import { itemLabel } from "@/lib/items";
import { derivePhase } from "@/lib/phase";
import { isSettled, itemOf, savingOf, savingPercent } from "@/lib/stats";
import type { Item, RoundView } from "@/lib/types";

const ROWS = 5;
const RING = { size: 48, stroke: 5 } as const;

/** Circular gauge of the share below PIHPS. The row text carries the same number, so the ring is decoration. */
export function ProgressRing({ value }: { value: number }) {
  const radius = (RING.size - RING.stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const filled = (Math.min(100, Math.max(0, value)) / 100) * circumference;
  return (
    <span aria-hidden className="relative inline-flex shrink-0" style={{ width: RING.size, height: RING.size }}>
      <svg width={RING.size} height={RING.size} className="-rotate-90">
        <circle cx={RING.size / 2} cy={RING.size / 2} r={radius} fill="none" strokeWidth={RING.stroke} className="stroke-line" />
        <circle cx={RING.size / 2} cy={RING.size / 2} r={radius} fill="none" strokeWidth={RING.stroke} strokeLinecap="round" strokeDasharray={`${filled} ${circumference}`} className="stroke-ink" />
      </svg>
      <span className="num absolute inset-0 flex items-center justify-center text-[11px] font-bold">{Math.round(value)}%</span>
    </span>
  );
}

function Row({ round, items, nowMs }: { round: RoundView; items: readonly Item[]; nowMs: number }) {
  const item = itemOf(items, round.item);
  const settled = isSettled(round) && round.clearing_price !== null;
  return (
    <li>
      <Link href={`/rounds/${round.id}`} className="-mx-2 flex min-h-[4.5rem] items-center gap-3 rounded-2xl p-2 transition-colors duration-150 hover:bg-ground/70 sm:gap-4">
        <ItemImage itemId={round.item} size="md" plain />
        <span className="min-w-0 flex-1">
          <span className="block truncate font-bold">{itemLabel(item, round.item)} <span className="num font-medium text-muted">#{round.id}</span></span>
          <span className="num mt-0.5 block text-sm text-muted">
            {round.participants.length} warungs · {int(round.total_qty)} {item?.unit}
            {settled && <> · {rupiah(round.clearing_price ?? 0)}/{item?.unit}</>}
          </span>
        </span>
        {settled ? (
          <>
            <span className="num hidden text-right text-sm sm:block">
              <span className="block font-bold text-brand-ink">{rupiah(savingOf(round))}</span>
              <span className="text-xs text-muted">saved vs PIHPS</span>
            </span>
            <span className="sr-only">Saved {rupiah(savingOf(round))}, {percent(savingPercent(round))} below PIHPS</span>
            <ProgressRing value={savingPercent(round)} />
          </>
        ) : (
          <PhaseBadge phase={derivePhase(round, nowMs)} />
        )}
      </Link>
    </li>
  );
}

/** Newest rounds with price, saving and a ring for the share below PIHPS. */
export function RecentRounds({ rounds, items, nowMs }: { rounds: readonly RoundView[]; items: readonly Item[]; nowMs: number }) {
  const recent = [...rounds].sort((a, b) => b.id - a.id).slice(0, ROWS);
  return (
    <Panel aria-labelledby="recent-rounds-title">
      <SectionTitle aside={<Link className={`${linkClass} inline-flex min-h-11 items-center gap-1 text-sm`} href="/rounds">All rounds <ArrowRight className="size-4" aria-hidden /></Link>}>
        <span id="recent-rounds-title">Recent rounds</span>
      </SectionTitle>
      {recent.length === 0 ? (
        <EmptyState title="No rounds yet">
          The agent service opens rounds on a schedule. See its <Link className={linkClass} href="/status">status</Link>, or <Link className={linkClass} href="/warung">run your warung</Link>.
        </EmptyState>
      ) : (
        <ul className="space-y-1">{recent.map((r) => <Row key={r.id} round={r} items={items} nowMs={nowMs} />)}</ul>
      )}
    </Panel>
  );
}
