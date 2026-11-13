import Link from "next/link";
import { Panel, SectionTitle, linkClass } from "@/components/ui/panel";
import { Chip } from "@/components/ui/chip";
import { ItemImage } from "@/components/shared/produce-art";
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
          <ul aria-label="Your rounds with outcome, amount paid and refund" className="space-y-2">
            {rows.map((row) => (
              <li key={row.roundId} className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-2xl bg-ground p-3">
                {row.itemId ? <ItemImage itemId={row.itemId} size="md" plain /> : <span aria-hidden className="size-12 shrink-0 rounded-full bg-surface" />}
                <div className="min-w-0 flex-1 basis-40">
                  <p className="font-bold">
                    <Link href={`/rounds/${row.roundId}`} className={`num ${linkClass}`}>#{row.roundId}</Link>
                    <span className="text-muted"> · </span>
                    {describe(row, items)}
                  </p>
                  {row.paid !== null && row.refund !== null ? (
                    <p className="num mt-0.5 flex flex-wrap items-baseline gap-x-3 text-sm text-muted">
                      <span>Paid <strong className="font-semibold text-ink">{rupiah(row.paid)}</strong></span>
                      <span>Refund <strong className="font-semibold text-ink">{rupiah(row.refund)}</strong></span>
                      <Receipt tx={row.tx} />
                    </p>
                  ) : (
                    <p className="mt-0.5 text-sm text-muted"><Receipt tx={row.tx} /></p>
                  )}
                  {row.reason && <p className="mt-0.5 text-xs text-muted">{row.reason}</p>}
                </div>
                <Chip tone={row.tone}>{row.outcome}</Chip>
              </li>
            ))}
          </ul>
        </>
      )}
    </Panel>
  );
}
