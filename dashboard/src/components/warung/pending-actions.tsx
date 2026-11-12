"use client";

import { useState } from "react";
import { Countdown } from "@/components/countdown";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Panel, SectionTitle, linkClass } from "@/components/ui/panel";
import { Chip } from "@/components/ui/chip";
import { ItemImage } from "@/components/produce-art";
import { Notice } from "@/components/ui/notice";
import { PackageCheck } from "lucide-react";
import { TxResult } from "@/components/judge/step-card";
import { useTx } from "@/hooks/use-tx";
import { rupiah } from "@/lib/format";
import { itemLabel } from "@/lib/items";
import { confirmDeliveryCall, disputeCall, type PendingAction } from "@/lib/owner-actions";
import { itemOf } from "@/lib/stats";
import type { Item } from "@/lib/types";
import { nsToMs } from "@/lib/json";
import { formatDateTime } from "@/lib/format";
import Link from "next/link";

type Pending = { kind: "confirm" | "dispute"; action: PendingAction } | null;

export function PendingActions({ actions, items, nowMs, onDone }: { actions: PendingAction[]; items: Item[]; nowMs: number; onDone: () => void }) {
  const tx = useTx(onDone);
  const [asking, setAsking] = useState<Pending>(null);

  async function go(): Promise<void> {
    if (!asking) return;
    const call = asking.kind === "confirm" ? confirmDeliveryCall : disputeCall;
    const r = await tx.run(call(asking.action.round.id));
    if (r.ok) setAsking(null);
  }

  return (
    <Panel aria-labelledby="needs-action">
      <SectionTitle aside={actions.length > 0 ? <Chip tone="warn">{actions.length} waiting</Chip> : null}>
        <span id="needs-action">Needs you</span>
      </SectionTitle>
      {actions.length === 0 ? (
        <div className="flex items-start gap-3 rounded-2xl bg-ground p-4 text-sm text-muted">
          <PackageCheck className="mt-0.5 size-5 shrink-0 text-brand" aria-hidden />
          <p><strong className="font-semibold text-ink">Nothing needs you right now.</strong> When goods arrive for a settled round, confirm receipt or report a problem here. If you do nothing, the order counts as received when the delivery window ends.</p>
        </div>
      ) : (
        <>
          <p className="mb-3 text-sm text-muted">
            Goods for these rounds should have arrived. Confirm receipt to pay the grosir, or report a problem. If you do nothing, the order counts as received when the delivery window ends.
          </p>
          <ul className="divide-y divide-line">
            {actions.map((a) => (
              <li key={a.round.id} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3 py-3.5 first:pt-0 last:pb-0">
                <div className="flex min-w-0 items-center gap-3 text-sm">
                  <ItemImage itemId={a.round.item} size="md" plain />
                  <div className="min-w-0">
                    <Link href={`/rounds/${a.round.id}`} className={linkClass}>
                      Round #{a.round.id}: {itemLabel(itemOf(items, a.round.item), a.round.item)}
                    </Link>
                    <p className="mt-0.5 text-muted">
                      {a.participant.qty} {itemOf(items, a.round.item)?.unit ?? "units"} · <span className="num">{rupiah(a.amount)}</span> in escrow · decide within <Countdown deadlineMs={a.deadlineMs} nowMs={nowMs} />
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button onClick={() => { tx.reset(); setAsking({ kind: "confirm", action: a }); }}>Confirm received</Button>
                  <Button variant="secondary" onClick={() => { tx.reset(); setAsking({ kind: "dispute", action: a }); }}>Report a problem</Button>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
      <div className="mt-3"><TxResult result={asking ? null : tx.result} /></div>
      <ConfirmDialog
        open={asking !== null}
        title={asking?.kind === "confirm" ? "Confirm that the goods arrived?" : "Report a problem with this delivery?"}
        confirmLabel={asking?.kind === "confirm" ? "Yes, pay the grosir" : "Yes, open a dispute"}
        tone={asking?.kind === "dispute" ? "danger" : "default"}
        busy={tx.busy}
        onConfirm={() => void go()}
        onCancel={() => setAsking(null)}
      >
        {asking?.kind === "confirm" ? (
          <>
            <p><strong className="text-ink">{rupiah(asking.action.amount)}</strong> is released to the grosir right away. This cannot be undone.</p>
            <p>Only confirm once the goods are in your shop and match the order.</p>
          </>
        ) : asking ? (
          <>
            <p>Your payment of <strong className="text-ink">{rupiah(asking.action.amount)}</strong> stays frozen until the arbiter rules. You can no longer confirm this round.</p>
            <ul className="list-disc space-y-1 pl-5">
              <li>If the arbiter sides with you: you get the payment back plus your share of the grosir&apos;s bond.</li>
              <li>If the arbiter sides with the grosir: the grosir is paid.</li>
              <li>If the arbiter does not rule by {formatDateTime(nsToMs(asking.action.round.arbiter_deadline))}: your payment is refunded, with no bond share.</li>
            </ul>
          </>
        ) : null}
        {tx.result && !tx.result.ok && <Notice tone="error" role="alert">{tx.result.error}</Notice>}
      </ConfirmDialog>
    </Panel>
  );
}
