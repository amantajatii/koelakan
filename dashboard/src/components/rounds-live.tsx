"use client";

import Link from "next/link";
import { PhaseBadge } from "@/components/phase-badge";
import { Countdown } from "@/components/countdown";
import { RoundCard } from "@/components/round-card";
import { EmptyState, ErrorNote, Skeleton } from "@/components/ui/states";
import { useLive } from "@/hooks/use-live";
import { useNow } from "@/hooks/use-now";
import { int, percent, rupiah } from "@/lib/format";
import { fetchOverview, type Overview } from "@/lib/overview";
import { currentDeadlineMs, derivePhase } from "@/lib/phase";
import { isSettled, itemOf, savingOf, savingPercent } from "@/lib/stats";

const REFRESH_MS = 10_000;

export function RoundsLive({ initial, renderedAt }: { initial: Overview | null; renderedAt: number }) {
  const { data, error, loading, refresh } = useLive(fetchOverview, initial, REFRESH_MS);
  const now = useNow(renderedAt);

  if (!data) {
    return loading
      ? <div role="status" aria-label="Memuat ronde" className="space-y-3"><Skeleton className="h-14" /><Skeleton className="h-14" /><Skeleton className="h-14" /></div>
      : <ErrorNote message={error ?? "Tidak ada balasan."} onRetry={refresh} />;
  }
  if (data.rounds.length === 0) {
    return <EmptyState title="Belum ada ronde">Buka ronde pertama dari halaman <Link className="underline" href="/coba">Coba sendiri</Link>.</EmptyState>;
  }
  const rounds = [...data.rounds].reverse();
  return (
    <div className="space-y-4">
      {error && <ErrorNote message={error} onRetry={refresh} />}
      <div className="grid gap-4 md:hidden">
        {rounds.map((r) => <RoundCard key={r.id} round={r} items={data.items} nowMs={now} />)}
      </div>
      <div className="hidden overflow-x-auto rounded-lg border-2 border-ink bg-cream shadow-[3px_3px_0_0_rgba(42,33,24,0.85)] md:block">
        <table className="w-full text-left text-sm">
          <caption className="sr-only">Semua ronde Koelakan</caption>
          <thead>
            <tr className="border-b-2 border-ink text-xs uppercase tracking-wider text-ink-soft">
              <th scope="col" className="px-4 py-3 font-semibold">Ronde</th>
              <th scope="col" className="py-3 pr-3 font-semibold">Barang</th>
              <th scope="col" className="py-3 pr-3 font-semibold">Fase</th>
              <th scope="col" className="py-3 pr-3 text-right font-semibold">Warung</th>
              <th scope="col" className="py-3 pr-3 text-right font-semibold">Total</th>
              <th scope="col" className="py-3 pr-3 text-right font-semibold">Harga menang</th>
              <th scope="col" className="py-3 pr-4 text-right font-semibold">Hemat vs PIHPS</th>
            </tr>
          </thead>
          <tbody>
            {rounds.map((r) => {
              const item = itemOf(data.items, r.item);
              const phase = derivePhase(r, now);
              const deadline = currentDeadlineMs(r, now);
              return (
                <tr key={r.id} className="border-b border-dashed border-rule last:border-0 hover:bg-kunyit-soft/40">
                  <th scope="row" className="px-4 py-3 font-normal">
                    <Link href={`/rounds/${r.id}`} className="num font-semibold underline decoration-rule underline-offset-4 hover:text-chili">#{r.id}</Link>
                  </th>
                  <td className="py-3 pr-3">{item?.name ?? r.item}</td>
                  <td className="py-3 pr-3">
                    <PhaseBadge phase={phase} />
                    {deadline !== null && <span className="ml-2 text-xs text-ink-soft"><Countdown deadlineMs={deadline} nowMs={now} /></span>}
                  </td>
                  <td className="num py-3 pr-3 text-right">{r.participants.length}</td>
                  <td className="num py-3 pr-3 text-right">{int(r.total_qty)} {item?.unit}</td>
                  <td className="num py-3 pr-3 text-right">{r.clearing_price === null ? "-" : rupiah(r.clearing_price)}</td>
                  <td className="num py-3 pr-4 text-right">
                    {isSettled(r) ? <span className="text-pandan">{rupiah(savingOf(r))} <span className="text-xs">({percent(savingPercent(r))})</span></span> : "-"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
