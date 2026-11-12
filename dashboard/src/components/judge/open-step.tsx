"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, StepCard, TxResult, inputClass } from "@/components/judge/step-card";
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
      index="6"
      title="Open a round"
      state={accountId ? "optional" : "locked"}
      intro={<>Anyone can call <code className="num">open_round</code>. The round max price is set to the PIHPS reference price (the highest allowed). Demo durations: joining {d.join} s, sealed bids {d.commit} s, reveal {d.reveal} s, delivery {d.delivery} s.</>}
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
          <div className="rounded-md border-2 border-kunyit bg-kunyit-soft/60 p-3 text-sm">
            <p className="font-semibold">Grosir bids only appear if the grosir agents are running.</p>
            <p className="mt-1">
              The grosir and warung agents run from the repo: <code className="num">cd agents &amp;&amp; pnpm round</code> opens its
              own round and then drives the whole cycle. A round opened from here is not handled by that command, so without
              grosirs bidding it will <strong>fail</strong> and your funds are refunded in full. To see the full cycle, run that
              command and join the round it opens in step 5 while its joining window is still open.
            </p>
          </div>
        </>
      )}
    </StepCard>
  );
}
