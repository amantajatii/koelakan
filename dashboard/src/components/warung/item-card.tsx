import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { ItemImage } from "@/components/shared/produce-art";
import { SavingsStrip } from "@/components/shared/savings-strip";
import { buttonClass } from "@/components/ui/button";
import { cn } from "@/components/ui/cn";
import { int, percent, rupiah } from "@/lib/format";
import { itemTheme } from "@/lib/item-theme";
import { itemLabel } from "@/lib/items";
import type { ItemSnapshot } from "@/lib/item-summary";
import { aboveHetPercent } from "@/lib/stats";

interface Props {
  snapshot: ItemSnapshot;
  /** Describes a quantity that comes from a settled round, e.g. "pooled in the last round" or "in your last order". */
  qtyLabel: string;
  /** Describes a quantity that only comes from the owner's standing order, never from a past round. */
  standingLabel?: string;
  /** Shown when there is no quantity yet. */
  qtyEmpty: string;
}

/** Pastel staple card: image, name, the savings strip, quantity, and a link to the round behind the numbers. */
export function ItemCard({ snapshot, qtyLabel, standingLabel = "on your standing order", qtyEmpty }: Props) {
  const { item, roundId, paid, qty, qtySource } = snapshot;
  const theme = itemTheme(item.id);
  const above = aboveHetPercent(item);
  return (
    <article aria-label={itemLabel(item)} className={cn("flex flex-col rounded-card p-3.5 shadow-card ring-1 ring-inset ring-black/[0.04] sm:p-5", theme.tint)}>
      <div className="flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:gap-3.5">
        <ItemImage itemId={item.id} size="sm" className="sm:size-20" />
        <div className="min-w-0">
          <h3 className="text-base font-bold leading-tight tracking-tight sm:text-lg">{itemLabel(item)}</h3>
          <p className={cn("mt-0.5 text-xs font-medium", theme.ink)}>
            per {item.unit}
            {item.het !== null && <span className="num"> · HET {rupiah(item.het)}</span>}
          </p>
        </div>
      </div>
      <div className="mt-3 sm:mt-5">
        <SavingsStrip refPrice={item.ref_price} paid={paid} unit={item.unit} refClass={theme.ink} />
      </div>
      <div className="mt-3 flex flex-1 flex-col justify-between gap-2 border-t border-black/[0.07] pt-3 sm:mt-4 sm:flex-row sm:items-end sm:gap-3">
        <p className="min-w-0 text-sm">
          {qty !== null ? (
            <>
              <span className="num font-bold">{int(qty)} {item.unit}</span>{" "}
              <span className="text-xs text-muted">{qtySource === "standing" ? standingLabel : qtyLabel}</span>
            </>
          ) : (
            <span className="text-xs text-muted">{qtyEmpty}</span>
          )}
          {above !== null && above > 0 && <span className={cn("mt-0.5 block text-xs font-medium", theme.ink)}>Market is {percent(above)} above HET</span>}
        </p>
        {roundId !== null && (
          <Link href={`/rounds/${roundId}`} className={buttonClass("secondary", "shrink-0 gap-1.5 px-3 max-sm:w-full")} aria-label={`Open round #${roundId} for ${itemLabel(item)}`}>
            Round #{roundId}
            <ArrowRight className="size-4" aria-hidden />
          </Link>
        )}
      </div>
    </article>
  );
}
