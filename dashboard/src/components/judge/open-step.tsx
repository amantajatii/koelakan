"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, StepCard, TxResult, inputClass } from "@/components/judge/step-card";
import { Notice } from "@/components/ui/notice";
import { useTx } from "@/hooks/use-tx";
import { parseQty } from "@/lib/amount";
import { DEMO_DURATIONS } from "@/lib/config";
import { rupiah } from "@/lib/format";
import { itemLabel } from "@/lib/items";
import { openRoundCall } from "@/lib/tx";
import type { Item } from "@/lib/types";

const DEFAULT_MIN_QTY = "100";

export function OpenStep({ accountId, items, onDone }: { accountId: string | null; items: Item[]; onDone: () => void }) {
  const tx = useTx(onDone);
  const [itemId, setItemId] = useState<string | null>(null);
  const [minRaw, setMinRaw] = useState(DEFAULT_MIN_QTY);
  const item = items.find((i) => i.id === itemId) ?? items[0];
  const minQty = parseQty(minRaw);
  const d = DEMO_DURATIONS;

  return (
    <StepCard
      index="+"
      title="Open a round (demo)"
      state={accountId ? "optional" : "locked"}
      intro={<>Anyone can call <code className="font-mono text-xs text-ink">open_round</code>. The round max price is set to the PIHPS reference price (the highest allowed). Demo durations: joining {d.join} s, sealed bids {d.commit} s, reveal {d.reveal} s, delivery {d.delivery} s.</>}
    >
      {accountId && item && (
        <>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field id="pick-item" label="Item">
              <select id="pick-item" className={inputClass} value={item.id} onChange={(e) => setItemId(e.target.value)}>
                {items.map((i) => <option key={i.id} value={i.id}>{itemLabel(i)}</option>)}
              </select>
            </Field>
            <Field id="min-lot" label={`Minimum lot (${item.unit})`} hint={`Max price ${rupiah(item.ref_price)}/${item.unit}`}>
              <input id="min-lot" inputMode="numeric" className={inputClass} value={minRaw} onChange={(e) => setMinRaw(e.target.value)} />
            </Field>
          </div>
          <Button variant="secondary" onClick={() => void tx.run(openRoundCall(item.id, BigInt(item.ref_price), minQty))} busy={tx.busy} disabled={minQty < 1}>
            Open round
          </Button>
          <TxResult result={tx.result} />
          <Notice tone="info" role="none">
            <p className="font-semibold">You do not need this: the 24/7 agent service already opens rounds on a schedule.</p>
            <p className="mt-1">
              The service&apos;s grosir agents bid on any open round now, including one you open here, so it should settle on its own.
              If the service is offline, nobody bids and the round <strong>fails</strong>; your funds are refunded in full.
            </p>
          </Notice>
        </>
      )}
    </StepCard>
  );
}
