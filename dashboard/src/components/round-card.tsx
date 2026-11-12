import Link from "next/link";
import { Countdown } from "@/components/countdown";
import { PhaseBadge } from "@/components/phase-badge";
import { int, percent, rupiah } from "@/lib/format";
import { itemLabel } from "@/lib/items";
import { currentDeadlineMs, derivePhase } from "@/lib/phase";
import { isSettled, itemOf, savingOf, savingPercent } from "@/lib/stats";
import type { Item, RoundView } from "@/lib/types";

export function RoundCard({ round, items, nowMs }: { round: RoundView; items: Item[]; nowMs: number }) {
  const item = itemOf(items, round.item);
  const phase = derivePhase(round, nowMs);
  const deadline = currentDeadlineMs(round, nowMs);
  return (
    <Link
      href={`/rounds/${round.id}`}
      className="group block rounded-lg border-2 border-ink/80 bg-cream p-4 transition-transform hover:-translate-y-0.5 hover:shadow-[3px_3px_0_0_rgba(42,33,24,0.85)]"
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="num text-xs text-ink-soft">Round #{round.id}</p>
          <h3 className="font-display text-xl font-semibold group-hover:text-chili">{itemLabel(item, round.item)}</h3>
        </div>
        <PhaseBadge phase={phase} />
      </div>
      <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1 text-sm">
        <dt className="text-ink-soft">Warungs</dt>
        <dd className="num text-right">{round.participants.length}</dd>
        <dt className="text-ink-soft">Total</dt>
        <dd className="num text-right">{int(round.total_qty)} {item?.unit}</dd>
        {isSettled(round) && round.clearing_price !== null ? (
          <>
            <dt className="text-ink-soft">Winning price</dt>
            <dd className="num text-right font-semibold">{rupiah(round.clearing_price)}</dd>
            <dt className="text-ink-soft">Saved</dt>
            <dd className="num text-right font-semibold text-pandan">{rupiah(savingOf(round))} ({percent(savingPercent(round))})</dd>
          </>
        ) : deadline !== null ? (
          <>
            <dt className="text-ink-soft">Phase ends in</dt>
            <dd className="text-right"><Countdown deadlineMs={deadline} nowMs={nowMs} /></dd>
          </>
        ) : null}
      </dl>
    </Link>
  );
}
