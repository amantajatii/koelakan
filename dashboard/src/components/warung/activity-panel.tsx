import Link from "next/link";
import { Panel, SectionTitle, linkClass } from "@/components/ui/panel";
import { Chip } from "@/components/ui/chip";
import { TableWrap, tableClass, td, tdRight, th, thRight, theadClass, trClass } from "@/components/ui/table";
import { txUrl } from "@/lib/config";
import { rupiah } from "@/lib/format";
import { itemLabel } from "@/lib/items";
import { buildOwnerRoundRows, type OwnerRoundRow } from "@/lib/round-rows";
import type { WarungAction } from "@/lib/agent-types";
import type { Participation } from "@/lib/owner-actions";
import { itemOf } from "@/lib/stats";
import type { Item, RoundView } from "@/lib/types";

interface Props {
  actions: WarungAction[] | null;
  apiDown: boolean;
  participations: Participation[];
  items: Item[];
  rounds: RoundView[];
}

function describe(row: OwnerRoundRow, items: Item[]): string {
  const item = row.itemId ? itemOf(items, row.itemId) : undefined;
  const name = row.itemId ? itemLabel(item, row.itemId) : "Round";
  return row.qty === null ? name : `${name} · ${row.qty} ${item?.unit ?? "units"}`;
}

function Outcome({ row }: { row: OwnerRoundRow }) {
  return (
    <>
      <Chip tone={row.tone}>{row.outcome}</Chip>
      {row.reason && <span className="mt-1 block text-xs text-muted">{row.reason}</span>}
    </>
  );
}

function Receipt({ tx }: { tx: string | null }) {
  return tx ? <a className={`num text-xs ${linkClass}`} target="_blank" rel="noreferrer" href={txUrl(tx)}>receipt</a> : null;
}

/** Every round the owner joined, plus the ones the agent skipped and why. Stacked rows on phones, a table from sm up. */
export function ActivityPanel({ actions, apiDown, participations, items, rounds }: Props) {
  const rows = buildOwnerRoundRows(participations, actions, rounds);
  return (
    <Panel aria-labelledby="activity">
      <SectionTitle><span id="activity">Your rounds</span></SectionTitle>
      {rows.length === 0 ? (
        <p className="text-sm text-muted">
          {apiDown
            ? "No rounds yet, and the agent service is offline so its log is unavailable. Rounds you join come straight from the blockchain."
            : "No rounds yet. Once your agent joins one, it shows here with what you paid and what came back. Rounds it skips show up with the reason."}
        </p>
      ) : (
        <>
          <ul className="divide-y divide-line sm:hidden">
            {rows.map((row) => (
              <li key={row.roundId} className="space-y-1.5 py-3 first:pt-0 last:pb-0">
                <p className="font-semibold">
                  <Link href={`/rounds/${row.roundId}`} className={`num ${linkClass}`}>#{row.roundId}</Link>
                  <span className="text-muted"> · </span>
                  {describe(row, items)}
                </p>
                <p><Outcome row={row} /></p>
                {row.paid !== null && row.refund !== null && (
                  <p className="num flex flex-wrap items-baseline gap-x-4 text-sm">
                    <span><span className="text-muted">Paid </span><strong>{rupiah(row.paid)}</strong></span>
                    <span><span className="text-muted">Refund </span><strong>{rupiah(row.refund)}</strong></span>
                    <Receipt tx={row.tx} />
                  </p>
                )}
              </li>
            ))}
          </ul>
          <TableWrap className="hidden sm:block">
            <table className={tableClass}>
              <caption className="sr-only">Your rounds with outcome, amount paid and refund</caption>
              <thead className={theadClass}>
                <tr>
                  <th scope="col" className={th}>Round</th>
                  <th scope="col" className={th}>Outcome</th>
                  <th scope="col" className={thRight}>Paid</th>
                  <th scope="col" className={thRight}>Refund</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.roundId} className={trClass}>
                    <th scope="row" className={`${td} font-normal`}>
                      <Link href={`/rounds/${row.roundId}`} className={`num ${linkClass}`}>#{row.roundId}</Link>
                      <span className="block text-xs text-muted">{describe(row, items)}</span>
                    </th>
                    <td className={td}><Outcome row={row} /></td>
                    <td className={tdRight}>{row.paid === null ? "-" : rupiah(row.paid)}</td>
                    <td className={tdRight}>
                      {row.refund === null ? "-" : rupiah(row.refund)}
                      {row.tx && <span className="block"><Receipt tx={row.tx} /></span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableWrap>
        </>
      )}
    </Panel>
  );
}
