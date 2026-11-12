import { cn } from "@/components/ui/cn";
import { percent, rupiah } from "@/lib/format";
import { savingPercent } from "@/lib/stats";
import type { Item, RoundView } from "@/lib/types";

interface Row { label: string; value: bigint; tone: string; note?: string }

/** Horizontal bars: PIHPS reference, round ceiling, clearing price (and HET for context). */
export function PriceCompare({ round, item }: { round: RoundView; item: Item | undefined }) {
  const rows: Row[] = [
    { label: "Harga pasar PIHPS", value: BigInt(round.ref_price), tone: "bg-ink-soft" },
    { label: "Batas harga ronde", value: BigInt(round.ceiling_price), tone: "bg-kunyit" },
  ];
  if (item?.het) rows.push({ label: "HET (konteks)", value: BigInt(item.het), tone: "bg-rule" });
  if (round.clearing_price !== null) {
    rows.push({ label: "Harga menang", value: BigInt(round.clearing_price), tone: "bg-pandan", note: `${percent(savingPercent(round))} di bawah PIHPS` });
  }
  const max = rows.reduce((m, r) => (r.value > m ? r.value : m), 1n);
  return (
    <figure>
      <figcaption className="sr-only">Perbandingan harga per {item?.unit ?? "satuan"}</figcaption>
      <ul className="space-y-3">
        {rows.map((r) => (
          <li key={r.label}>
            <div className="flex flex-wrap items-baseline justify-between gap-2 text-sm">
              <span className="font-semibold">{r.label}</span>
              <span className="num">{rupiah(r.value)}{item ? `/${item.unit}` : ""}</span>
            </div>
            <div className="mt-1 h-5 rounded-sm bg-paper-deep/70">
              <div
                className={cn("h-full rounded-sm border-2 border-ink/70", r.tone)}
                style={{ width: `${Math.max(2, Number((r.value * 10_000n) / max) / 100)}%` }}
              />
            </div>
            {r.note && <p className="mt-0.5 text-xs font-semibold text-pandan">{r.note}</p>}
          </li>
        ))}
      </ul>
    </figure>
  );
}
