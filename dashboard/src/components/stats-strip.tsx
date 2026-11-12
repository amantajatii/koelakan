import { int, percent, rupiah } from "@/lib/format";
import type { Aggregate } from "@/lib/stats";

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="border-ink/80 p-4 [&:not(:first-child)]:border-t-2 sm:[&:not(:first-child)]:border-t-0 sm:[&:not(:first-child)]:border-l-2">
      <dt className="text-xs font-semibold uppercase tracking-wider text-ink-soft">{label}</dt>
      <dd className="num mt-1 text-2xl font-semibold sm:text-3xl">{value}</dd>
      {hint && <p className="mt-1 text-xs text-ink-soft">{hint}</p>}
    </div>
  );
}

/** Totals row, laid out like the bottom line of a ledger. */
export function StatsStrip({ agg }: { agg: Aggregate }) {
  return (
    <dl className="grid overflow-hidden rounded-lg border-2 border-ink bg-cream shadow-[3px_3px_0_0_rgba(42,33,24,0.85)] sm:grid-cols-4">
      <Stat label="Ronde selesai" value={int(agg.settledRounds)} hint={`${agg.failedRounds} gagal, ${agg.liveRounds} berjalan`} />
      <Stat label="Total barang" value={int(agg.totalQty)} hint="kg, di semua ronde selesai" />
      <Stat label="Hemat vs PIHPS" value={rupiah(agg.totalSaving)} hint="(harga acuan - harga menang) x jumlah" />
      <Stat label="Rata-rata di bawah PIHPS" value={percent(agg.avgPercentBelow)} hint="rata-rata tertimbang jumlah" />
    </dl>
  );
}
