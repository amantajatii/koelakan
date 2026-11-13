"use client";

import { useState } from "react";
import { Countdown } from "@/components/shared/countdown";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { SectionTitle, panelClass } from "@/components/ui/panel";
import { Chip } from "@/components/ui/chip";
import { ItemImage } from "@/components/shared/produce-art";
import { Notice } from "@/components/ui/notice";
import { PackageCheck } from "lucide-react";
import { TxResult } from "@/components/judge/step-card";
import { useTx } from "@/hooks/use-tx";
import { rupiah } from "@/lib/format";
import { itemPlainName } from "@/lib/items";
import { confirmDeliveryCall, disputeCall, type PendingAction } from "@/lib/owner-actions";
import { itemOf } from "@/lib/stats";
import type { Item } from "@/lib/types";
import { nsToMs } from "@/lib/json";
import { dayKey, formatClock, formatDateTime } from "@/lib/format";
import Link from "next/link";

type Pending = { kind: "confirm" | "dispute"; action: PendingAction } | null;

const receivedAt = (deadlineMs: number, nowMs: number): string =>
  dayKey(deadlineMs) === dayKey(nowMs) ? `${formatClock(deadlineMs)} WIB` : formatDateTime(deadlineMs);

interface PendingActionsProps {
  actions: PendingAction[];
  items: Item[];
  nowMs: number;
  onDone: () => void;
  readOnly?: boolean;
}

export function PendingActions({ actions, items, nowMs, onDone, readOnly = false }: PendingActionsProps) {
  const tx = useTx(onDone);
  const [asking, setAsking] = useState<Pending>(null);

  async function go(): Promise<void> {
    if (!asking) return;
    const call = asking.kind === "confirm" ? confirmDeliveryCall : disputeCall;
    const r = await tx.run(call(asking.action.round.id));
    if (r.ok) setAsking(null);
  }

  const hasAny = actions.length > 0;
  return (
    <section aria-labelledby="needs-action" className={hasAny ? "on-dark rounded-card bg-night p-5 text-white sm:p-6" : panelClass}>
      <SectionTitle aside={hasAny ? <Chip tone="warn">{actions.length} waiting</Chip> : null}>
        <span id="needs-action">Needs you</span>
      </SectionTitle>
      {!hasAny ? (
        <div className="flex items-start gap-3 text-sm text-muted">
          <span aria-hidden className="flex size-9 shrink-0 items-center justify-center rounded-full bg-brand-soft text-brand-ink"><PackageCheck className="size-5" /></span>
          <p className="pt-1"><strong className="font-semibold text-ink">Nothing needs you right now.</strong> When goods are on their way you see them here. If you do nothing, an order counts as received on its own when the delivery time ends.</p>
        </div>
      ) : (
        <>
          <ul className="space-y-3">
            {actions.map((a) => {
              const item = itemOf(items, a.round.item);
              return (
                <li key={a.round.id} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3 rounded-2xl bg-night-raised p-4">
                  <div className="flex min-w-0 flex-1 basis-64 items-center gap-3 text-sm">
                    <ItemImage itemId={a.round.item} size="md" plain />
                    <div className="min-w-0">
                      <p className="font-bold">
                        {a.participant.qty} {item?.unit ?? "units"} {itemPlainName(item, a.round.item)} from{" "}
                        <Link href={`/rounds/${a.round.id}`} className="font-semibold underline decoration-white/40 underline-offset-4 hover:decoration-brand">round #{a.round.id}</Link>
                      </p>
                      <p className="mt-0.5 text-night-muted">
                        If it arrived fine, do nothing: it counts as received at <span className="num font-semibold text-white">{receivedAt(a.deadlineMs, nowMs)}</span> (<Countdown deadlineMs={a.deadlineMs} nowMs={nowMs} /> left). <span className="num">{rupiah(a.amount)}</span> is held until then.
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button variant="onBrand" disabled={readOnly} onClick={() => { tx.reset(); setAsking({ kind: "dispute", action: a }); }}>Report a problem</Button>
                    <Button disabled={readOnly} onClick={() => { tx.reset(); setAsking({ kind: "confirm", action: a }); }}>Confirm now</Button>
                  </div>
                </li>
              );
            })}
          </ul>
          {readOnly && <p className="mt-3 text-sm text-night-muted">Only the owner can report a problem or confirm. Sign in to act on your own deliveries.</p>}
        </>
      )}
      <div className="mt-3"><TxResult result={asking ? null : tx.result} /></div>
      <ConfirmDialog
        open={asking !== null}
        title={asking?.kind === "confirm" ? "Confirm that the goods arrived?" : "Report a problem with this delivery?"}
        confirmLabel={asking?.kind === "confirm" ? "Yes, pay the wholesaler" : "Yes, open a dispute"}
        tone={asking?.kind === "dispute" ? "danger" : "default"}
        busy={tx.busy}
        onConfirm={() => void go()}
        onCancel={() => setAsking(null)}
      >
        {asking?.kind === "confirm" ? (
          <>
            <p><strong className="text-ink">{rupiah(asking.action.amount)}</strong> is paid to the wholesaler (grosir) right away. This cannot be undone.</p>
            <p>Waiting is fine: if you do nothing, the order counts as received at the delivery time anyway. Only confirm early when the goods are in your shop and match the order.</p>
          </>
        ) : asking ? (
          <>
            <p>Your payment of <strong className="text-ink">{rupiah(asking.action.amount)}</strong> stays frozen until the arbiter rules. After this you can no longer confirm this delivery. Report only if the goods did not arrive or do not match.</p>
            <ul className="list-disc space-y-1 pl-5">
              <li>If the arbiter sides with you: you get your payment back, plus your share of the wholesaler&apos;s deposit (bond).</li>
              <li>If the arbiter sides with the wholesaler: the wholesaler is paid.</li>
              <li>If the arbiter does not rule by {formatDateTime(nsToMs(asking.action.round.arbiter_deadline))}: your payment is refunded, with no bond share.</li>
            </ul>
          </>
        ) : null}
        {tx.result && !tx.result.ok && <Notice tone="error" role="alert">{tx.result.error}</Notice>}
      </ConfirmDialog>
    </section>
  );
}
