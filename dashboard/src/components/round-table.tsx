import Link from "next/link";
import { Countdown } from "@/components/countdown";
import { ItemImage } from "@/components/produce-art";
import { PhaseBadge } from "@/components/phase-badge";
import { RoundRow } from "@/components/round-card";
import { TableWrap, td, tdRight, tableClass, theadClass, th, thRight, trClass } from "@/components/ui/table";
import { int, percent, rupiah } from "@/lib/format";
import { itemLabel } from "@/lib/items";
import { currentDeadlineMs, derivePhase } from "@/lib/phase";
import { isSettled, itemOf, savingOf, savingPercent } from "@/lib/stats";
import type { Item, RoundView } from "@/lib/types";

/** Rounds as a table from md up and as list rows on phones. Caller supplies the order. */
export function RoundTable({ rounds, items, nowMs, caption }: { rounds: RoundView[]; items: Item[]; nowMs: number; caption: string }) {
  return (
    <>
      <div className="divide-y divide-line md:hidden">
        {rounds.map((r) => <RoundRow key={r.id} round={r} items={items} nowMs={nowMs} />)}
      </div>
      <TableWrap className="hidden md:block">
        <table className={tableClass}>
          <caption className="sr-only">{caption}</caption>
          <thead className={theadClass}>
            <tr>
              <th scope="col" className={th}>Round</th>
              <th scope="col" className={th}>Phase</th>
              <th scope="col" className={thRight}>Warungs</th>
              <th scope="col" className={thRight}>Total</th>
              <th scope="col" className={thRight}>Winning price</th>
              <th scope="col" className={thRight}>Saved vs PIHPS</th>
            </tr>
          </thead>
          <tbody>
            {rounds.map((r) => {
              const item = itemOf(items, r.item);
              const phase = derivePhase(r, nowMs);
              const deadline = currentDeadlineMs(r, nowMs);
              return (
                <tr key={r.id} className={trClass}>
                  <th scope="row" className={`${td} font-normal`}>
                    <Link href={`/rounds/${r.id}`} className="flex items-center gap-3 rounded-lg">
                      <ItemImage itemId={r.item} size="sm" plain />
                      <span>
                        <span className="block font-semibold">{itemLabel(item, r.item)}</span>
                        <span className="num text-xs text-muted">Round #{r.id}</span>
                      </span>
                    </Link>
                  </th>
                  <td className={td}>
                    <span className="inline-flex items-center gap-2">
                      <PhaseBadge phase={phase} />
                      {deadline !== null && <span className="text-xs text-muted"><Countdown deadlineMs={deadline} nowMs={nowMs} /></span>}
                    </span>
                  </td>
                  <td className={tdRight}>{r.participants.length}</td>
                  <td className={tdRight}>{int(r.total_qty)} {item?.unit}</td>
                  <td className={tdRight}>{r.clearing_price === null ? "-" : rupiah(r.clearing_price)}</td>
                  <td className={tdRight}>
                    {isSettled(r) ? (
                      <span className="font-semibold text-brand-ink">{rupiah(savingOf(r))} <span className="text-xs font-medium">({percent(savingPercent(r))})</span></span>
                    ) : "-"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </TableWrap>
    </>
  );
}
