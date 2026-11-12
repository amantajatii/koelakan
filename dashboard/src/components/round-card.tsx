import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { Countdown } from "@/components/countdown";
import { ItemImage } from "@/components/produce-art";
import { PhaseBadge } from "@/components/phase-badge";
import { int, percent, rupiah } from "@/lib/format";
import { itemLabel } from "@/lib/items";
import { currentDeadlineMs, derivePhase } from "@/lib/phase";
import { isSettled, itemOf, savingOf, savingPercent } from "@/lib/stats";
import type { Item, RoundView } from "@/lib/types";

/** Compact list row for phones, where a wide table would not fit. */
export function RoundRow({ round, items, nowMs }: { round: RoundView; items: Item[]; nowMs: number }) {
  const item = itemOf(items, round.item);
  const phase = derivePhase(round, nowMs);
  const deadline = currentDeadlineMs(round, nowMs);
  return (
    <Link href={`/rounds/${round.id}`} className="flex min-h-16 items-center gap-3 py-3 transition-colors duration-150 hover:bg-ground/70">
      <ItemImage itemId={round.item} size="sm" plain />
      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold">{itemLabel(item, round.item)} <span className="num font-medium text-muted">#{round.id}</span></p>
        <p className="num mt-0.5 text-xs text-muted">
          {round.participants.length} warungs · {int(round.total_qty)} {item?.unit}
          {isSettled(round) && round.clearing_price !== null && (
            <> · {rupiah(round.clearing_price)} · <span className="font-semibold text-brand-ink">saved {rupiah(savingOf(round))} ({percent(savingPercent(round))})</span></>
          )}
          {!isSettled(round) && deadline !== null && <> · ends in <Countdown deadlineMs={deadline} nowMs={nowMs} /></>}
        </p>
      </div>
      <PhaseBadge phase={phase} />
      <ChevronRight className="size-4 shrink-0 text-muted" aria-hidden />
    </Link>
  );
}
