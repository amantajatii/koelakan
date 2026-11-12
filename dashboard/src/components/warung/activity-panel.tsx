import Link from "next/link";
import { Panel, SectionTitle, linkClass } from "@/components/ui/panel";
import { Chip } from "@/components/ui/chip";
import { TableWrap, tableClass, td, tdRight, th, thRight, theadClass, trClass } from "@/components/ui/table";
import type { WarungAction } from "@/lib/agent-types";
import { txUrl } from "@/lib/config";
import { formatDateTime, rupiah } from "@/lib/format";
import { itemLabel } from "@/lib/items";
import type { Participation } from "@/lib/owner-actions";
import { itemOf } from "@/lib/stats";
import type { Item } from "@/lib/types";

interface Props {
  actions: WarungAction[] | null;
  apiDown: boolean;
  participations: Participation[];
  items: Item[];
}

export function ActivityPanel({ actions, apiDown, participations, items }: Props) {
  return (
    <Panel aria-labelledby="activity">
      <SectionTitle><span id="activity">My agent activity</span></SectionTitle>
      <h3 className="text-sm font-bold">What the agent did</h3>
      {apiDown ? (
        <p className="mt-2 text-sm text-muted">Agent service offline. Its action log is unavailable; the rounds below come straight from the chain.</p>
      ) : !actions || actions.length === 0 ? (
        <p className="mt-2 text-sm text-muted">Nothing yet. Once you save a standing order, each round shows up here as joined or skipped, with the reason.</p>
      ) : (
        <ul className="mt-2 divide-y divide-line text-sm">
          {actions.map((a) => (
            <li key={`${a.round_id}-${a.at}`} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2.5">
              <Chip tone={a.action === "joined" ? "good" : "neutral"}>{a.action}</Chip>
              <Link href={`/rounds/${a.round_id}`} className={linkClass}>Round #{a.round_id}</Link>
              {a.qty !== null && <span className="num">{a.qty} kg</span>}
              {a.reason && <span className="text-muted">{a.reason}</span>}
              <span className="ml-auto text-xs text-muted">{formatDateTime(Date.parse(a.at))}</span>
              {a.tx && <a className={`num text-xs ${linkClass}`} target="_blank" rel="noreferrer" href={txUrl(a.tx)}>tx</a>}
            </li>
          ))}
        </ul>
      )}

      <h3 className="mt-7 text-sm font-bold">Rounds you took part in (from the chain)</h3>
      {participations.length === 0 ? (
        <p className="mt-2 text-sm text-muted">No rounds yet.</p>
      ) : (
        <TableWrap className="mt-2">
          <table className={`${tableClass} min-w-[34rem]`}>
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
              {participations.map((p) => (
                <tr key={p.round.id} className={trClass}>
                  <th scope="row" className={`${td} font-normal`}>
                    <Link href={`/rounds/${p.round.id}`} className={`num ${linkClass}`}>#{p.round.id}</Link>
                    <span className="block text-xs text-muted">{itemLabel(itemOf(items, p.round.item), p.round.item)}, {p.qty} {itemOf(items, p.round.item)?.unit ?? "units"}</span>
                  </th>
                  <td className={td}><Chip tone={p.tone}>{p.outcome}</Chip></td>
                  <td className={tdRight}>{rupiah(p.paid)}</td>
                  <td className={tdRight}>{rupiah(p.refund)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableWrap>
      )}
    </Panel>
  );
}
