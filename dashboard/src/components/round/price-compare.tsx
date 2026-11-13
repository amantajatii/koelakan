import { Chip } from "@/components/ui/chip";
import { cn } from "@/components/ui/cn";
import { percent, rupiah } from "@/lib/format";
import { savingPercent } from "@/lib/stats";
import type { Item, RoundView } from "@/lib/types";

interface Row { label: string; value: bigint; tone: string; note?: string }

/** Horizontal bars: PIHPS reference, round ceiling, clearing price (and HET for context). */
export function PriceCompare({ round, item }: { round: RoundView; item: Item | undefined }) {
  const rows: Row[] = [
    { label: "PIHPS market price", value: BigInt(round.ref_price), tone: "bg-control" },
    { label: "Round max price", value: BigInt(round.ceiling_price), tone: "bg-info/60" },
  ];
  if (item?.het) rows.push({ label: "HET (for context)", value: BigInt(item.het), tone: "bg-line-strong" });
  if (round.clearing_price !== null) {
    rows.push({ label: "Winning price", value: BigInt(round.clearing_price), tone: "bg-night", note: `${percent(savingPercent(round))} below PIHPS` });
  }
  const max = rows.reduce((m, r) => (r.value > m ? r.value : m), 1n);
  return (
    <figure>
      <figcaption className="sr-only">Price comparison per {item?.unit ?? "unit"}</figcaption>
      <ul className="space-y-3.5">
        {rows.map((r) => (
          <li key={r.label}>
            <div className="flex flex-wrap items-baseline justify-between gap-2 text-sm">
              <span className="text-muted">{r.label}</span>
              <span className="num font-bold">{rupiah(r.value)}{item ? `/${item.unit}` : ""}</span>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-ground">
              <div className={cn("h-full rounded-full", r.tone)} style={{ width: `${Math.max(2, Number((r.value * 10_000n) / max) / 100)}%` }} />
            </div>
            {r.note && <p className="mt-1.5"><Chip tone="good">{r.note}</Chip></p>}
          </li>
        ))}
      </ul>
    </figure>
  );
}
