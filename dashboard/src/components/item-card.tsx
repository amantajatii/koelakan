import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { ItemImage } from "@/components/produce-art";
import { SavingsStrip } from "@/components/savings-strip";
import { buttonClass } from "@/components/ui/button";
import { cn } from "@/components/ui/cn";
import { int, percent, rupiah } from "@/lib/format";
import { itemTheme } from "@/lib/item-theme";
import { itemLabel } from "@/lib/items";
import type { ItemSnapshot } from "@/lib/item-summary";
import { aboveHetPercent } from "@/lib/stats";

interface Props {
  snapshot: ItemSnapshot;
  /** Describes the quantity, e.g. "pooled in the last round" or "ordered by you". */
  qtyLabel: string;
  /** Shown when there is no quantity yet. */
  qtyEmpty: string;
}

/** Pastel staple card: image, name, the savings strip, quantity, and a link to the round behind the numbers. */
export function ItemCard({ snapshot, qtyLabel, qtyEmpty }: Props) {
  const { item, roundId, paid, qty } = snapshot;
  const theme = itemTheme(item.id);
  const above = aboveHetPercent(item);
  return (
    <article aria-label={itemLabel(item)} className={cn("flex flex-col rounded-card p-5 shadow-card ring-1 ring-inset ring-black/[0.04]", theme.tint)}>
      <div className="flex items-center gap-3.5">
        <ItemImage itemId={item.id} size="lg" />
        <div className="min-w-0">
          <h3 className="text-lg font-bold leading-tight tracking-tight">{itemLabel(item)}</h3>
          <p className={cn("mt-0.5 text-xs font-medium", theme.ink)}>
            per {item.unit}
            {item.het !== null && <span className="num"> · HET {rupiah(item.het)}</span>}
          </p>
        </div>
      </div>
      <div className="mt-5">
        <SavingsStrip refPrice={item.ref_price} paid={paid} unit={item.unit} refClass={theme.ink} />
      </div>
      <div className="mt-4 flex flex-1 items-end justify-between gap-3 border-t border-black/[0.07] pt-3">
        <p className="min-w-0 text-sm">
          {qty !== null ? (
            <>
              <span className="num font-bold">{int(qty)} {item.unit}</span>{" "}
              <span className="text-xs text-muted">{qtyLabel}</span>
            </>
          ) : (
            <span className="text-xs text-muted">{qtyEmpty}</span>
          )}
          {above !== null && above > 0 && <span className={cn("mt-0.5 block text-xs font-medium", theme.ink)}>Market is {percent(above)} above HET</span>}
        </p>
        {roundId !== null && (
          <Link href={`/rounds/${roundId}`} className={buttonClass("onBrand", "min-h-10 shrink-0 gap-1.5 px-3")} aria-label={`Open round #${roundId} for ${itemLabel(item)}`}>
            Round #{roundId}
            <ArrowRight className="size-4" aria-hidden />
          </Link>
        )}
      </div>
    </article>
  );
}
