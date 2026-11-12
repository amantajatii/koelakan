import Link from "next/link";
import { Panel, SectionTitle } from "@/components/ui/panel";
import { Stamp } from "@/components/ui/stamp";
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
      <h3 className="text-sm font-semibold uppercase tracking-wider text-ink-soft">What the agent did</h3>
      {apiDown ? (
        <p className="mt-2 text-sm text-ink-soft">Agent service offline. Its action log is unavailable; the rounds below come straight from the chain.</p>
      ) : !actions || actions.length === 0 ? (
        <p className="mt-2 text-sm text-ink-soft">Nothing yet. Once you save a standing order, each round shows up here as joined or skipped, with the reason.</p>
      ) : (
        <ul className="mt-2 divide-y divide-dashed divide-rule text-sm">
          {actions.map((a) => (
            <li key={`${a.round_id}-${a.at}`} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2">
              <Stamp tone={a.action === "joined" ? "good" : "neutral"}>{a.action}</Stamp>
              <Link href={`/rounds/${a.round_id}`} className="font-semibold underline decoration-rule underline-offset-4 hover:text-chili">Round #{a.round_id}</Link>
              {a.qty !== null && <span className="num">{a.qty} kg</span>}
              {a.reason && <span className="text-ink-soft">{a.reason}</span>}
              <span className="ml-auto text-xs text-ink-soft">{formatDateTime(Date.parse(a.at))}</span>
              {a.tx && <a className="num text-xs underline underline-offset-4" target="_blank" rel="noreferrer" href={txUrl(a.tx)}>tx</a>}
            </li>
          ))}
        </ul>
      )}

      <h3 className="mt-6 text-sm font-semibold uppercase tracking-wider text-ink-soft">Rounds you took part in (from the chain)</h3>
      {participations.length === 0 ? (
        <p className="mt-2 text-sm text-ink-soft">No rounds yet.</p>
      ) : (
        <div className="mt-2 overflow-x-auto">
          <table className="w-full min-w-[34rem] text-left text-sm">
            <caption className="sr-only">Your rounds with outcome, amount paid and refund</caption>
            <thead>
              <tr className="border-b-2 border-ink text-xs uppercase tracking-wider text-ink-soft">
                <th scope="col" className="py-2 pr-3 font-semibold">Round</th>
                <th scope="col" className="py-2 pr-3 font-semibold">Outcome</th>
                <th scope="col" className="py-2 pr-3 text-right font-semibold">Paid</th>
                <th scope="col" className="py-2 text-right font-semibold">Refund</th>
              </tr>
            </thead>
            <tbody>
              {participations.map((p) => (
                <tr key={p.round.id} className="border-b border-dashed border-rule">
                  <th scope="row" className="py-2 pr-3 font-normal">
                    <Link href={`/rounds/${p.round.id}`} className="font-semibold underline decoration-rule underline-offset-4 hover:text-chili">#{p.round.id}</Link>
                    <span className="block text-xs text-ink-soft">{itemLabel(itemOf(items, p.round.item), p.round.item)}, {p.qty} {itemOf(items, p.round.item)?.unit ?? "units"}</span>
                  </th>
                  <td className="py-2 pr-3"><Stamp tone={p.tone}>{p.outcome}</Stamp></td>
                  <td className="num py-2 pr-3 text-right">{rupiah(p.paid)}</td>
                  <td className="num py-2 text-right">{rupiah(p.refund)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Panel>
  );
}
