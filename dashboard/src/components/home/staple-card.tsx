import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { ItemImage } from "@/components/shared/produce-art";
import { buttonClass } from "@/components/ui/button";
import { cn } from "@/components/ui/cn";
import { Panel } from "@/components/ui/panel";
import { percent, rupiah } from "@/lib/format";
import { itemTheme } from "@/lib/item-theme";
import { itemLabel } from "@/lib/items";
import { percentBelow, type ItemSnapshot } from "@/lib/item-summary";
import { aboveHetPercent } from "@/lib/stats";

function Pair({ label, value, className }: { label: string; value: string; className?: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-muted">{label}</dt>
      <dd className={cn("num mt-0.5 truncate text-sm font-bold", className)}>{value}</dd>
    </div>
  );
}

/** One staple on the overview: image on its pastel tile, the PIHPS price, the last cleared price and a link to that round. */
export function StapleCard({ snapshot }: { snapshot: ItemSnapshot }) {
  const { item, roundId, paid } = snapshot;
  const theme = itemTheme(item.id);
  const below = percentBelow(item.ref_price, paid);
  const above = aboveHetPercent(item);
  return (
    <Panel aria-label={itemLabel(item)} className="flex flex-col p-5">
      <div className="flex items-center gap-4">
        <ItemImage itemId={item.id} size="lg" plain />
        <div className="min-w-0">
          <h3 className="text-base font-bold leading-tight tracking-tight">{itemLabel(item)}</h3>
          <p className="mt-1 text-xs text-muted">per {item.unit}</p>
        </div>
      </div>
      <dl className="mt-5 grid grid-cols-3 gap-3">
        <Pair label="PIHPS" value={rupiah(item.ref_price)} />
        <Pair label="Last price" value={paid === null ? "None yet" : rupiah(paid)} />
        <Pair label="Below PIHPS" value={below === null ? "-" : percent(below)} className={below === null ? undefined : "text-brand-ink"} />
      </dl>
      {above !== null && above > 0 && <p className={cn("mt-3 text-xs font-medium", theme.ink)}>PIHPS is {percent(above)} above the HET ceiling</p>}
      <div className="mt-auto pt-5">
        {roundId !== null ? (
          <Link href={`/rounds/${roundId}`} aria-label={`Open round #${roundId} for ${itemLabel(item)}`} className={buttonClass("secondary", "w-full justify-between")}>
            <span className="num">Latest round #{roundId}</span>
            <ChevronRight className="size-4" aria-hidden />
          </Link>
        ) : (
          <p className="flex min-h-11 items-center text-sm text-muted">No settled round yet</p>
        )}
      </div>
    </Panel>
  );
}
