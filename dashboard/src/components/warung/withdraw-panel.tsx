"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Panel, SectionTitle } from "@/components/ui/panel";
import { Field, TxResult, inputClass } from "@/components/judge/step-card";
import { useTx } from "@/hooks/use-tx";
import { parseAmount } from "@/lib/amount";
import { rupiah } from "@/lib/format";
import { withdrawCall } from "@/lib/owner-actions";

export function WithdrawPanel({ available, onDone }: { available: bigint; onDone: () => void }) {
  const tx = useTx(onDone);
  const [raw, setRaw] = useState("");
  const amount = parseAmount(raw);
  const error =
    raw.trim() === "" ? null : amount === null || amount === 0n ? "Enter a number greater than 0." : amount > available ? `You only have ${rupiah(available)} available.` : null;
  const ok = amount !== null && amount > 0n && amount <= available;

  return (
    <Panel aria-labelledby="withdraw">
      <SectionTitle><span id="withdraw">Withdraw</span></SectionTitle>
      <p className="text-sm text-ink-soft">
        Move available market balance back to your wallet. Funds locked in open rounds stay locked until the round ends. Needs your own key (1 yocto), so the agent can never do this.
      </p>
      <p className="mt-3 text-sm">Available: <strong className="num">{rupiah(available)}</strong></p>
      <div className="mt-2 grid max-w-md grid-cols-[1fr_auto] items-end gap-2">
        <Field id="withdraw-amount" label="Amount (tIDR)">
          <input id="withdraw-amount" inputMode="numeric" className={inputClass} value={raw} onChange={(e) => setRaw(e.target.value)} aria-invalid={error !== null} aria-describedby={error ? "withdraw-err" : undefined} />
        </Field>
        <Button variant="secondary" onClick={() => setRaw(available.toString())} disabled={available === 0n}>Max</Button>
      </div>
      {error && <p id="withdraw-err" className="mt-1 text-sm font-semibold text-chili">{error}</p>}
      <div className="mt-3 space-y-3">
        <Button onClick={() => amount !== null && void tx.run(withdrawCall(amount))} busy={tx.busy} disabled={!ok}>Withdraw to wallet</Button>
        <TxResult result={tx.result} />
      </div>
    </Panel>
  );
}
