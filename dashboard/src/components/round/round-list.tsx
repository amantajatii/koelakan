import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { Countdown } from "@/components/shared/countdown";
import { PhaseBadge } from "@/components/shared/phase-badge";
import { ItemImage } from "@/components/shared/produce-art";
import { int, percent, rupiah } from "@/lib/format";
import { itemLabel } from "@/lib/items";
import { currentDeadlineMs, derivePhase } from "@/lib/phase";
import { isSettled, itemOf, savingOf, savingPercent } from "@/lib/stats";
import type { Item, RoundView } from "@/lib/types";

function RoundListRow({ round, items, nowMs }: { round: RoundView; items: Item[]; nowMs: number }) {
  const item = itemOf(items, round.item);
  const phase = derivePhase(round, nowMs);
  const deadline = currentDeadlineMs(round, nowMs);
  const settled = isSettled(round) && round.clearing_price !== null;
  return (
    <li>
      <Link
        href={`/rounds/${round.id}`}
        className="flex min-h-[4.5rem] items-center gap-3 rounded-2xl p-2.5 transition-colors duration-150 hover:bg-ground sm:gap-4 sm:p-3"
      >
        <ItemImage itemId={round.item} size="md" plain className="rounded-2xl" />
        <div className="min-w-0 flex-1">
          <p className="truncate font-bold">
            {itemLabel(item, round.item)} <span className="num font-medium text-muted">#{round.id}</span>
          </p>
          <p className="num mt-0.5 text-sm text-muted">
            {round.participants.length} warungs · {int(round.total_qty)} {item?.unit}
            {settled && <> · won at {rupiah(round.clearing_price ?? 0)}</>}
            {!isSettled(round) && deadline !== null && <> · ends in <Countdown deadlineMs={deadline} nowMs={nowMs} /></>}
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1.5 sm:flex-row sm:items-center sm:gap-3">
          {settled && (
            <span className="num text-right text-sm font-bold text-brand-ink">
              <span className="sr-only">Saved </span>{rupiah(savingOf(round))}
              <span className="hidden text-xs font-semibold sm:inline"> ({percent(savingPercent(round))} below PIHPS)</span>
            </span>
          )}
          <PhaseBadge phase={phase} />
        </div>
        <ChevronRight className="hidden size-4 shrink-0 text-muted sm:block" aria-hidden />
      </Link>
    </li>
  );
}

interface RoundListProps {
  rounds: RoundView[];
  items: Item[];
  nowMs: number;
  label: string;
}

/** Rounds as soft rows: produce tile, bold title, muted subtitle, status pill on the right. */
export function RoundList({ rounds, items, nowMs, label }: RoundListProps) {
  return (
    <ul aria-label={label} className="-mx-1.5 space-y-1 sm:-mx-2">
      {rounds.map((r) => <RoundListRow key={r.id} round={r} items={items} nowMs={nowMs} />)}
    </ul>
  );
}
