"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Panel, SectionTitle } from "@/components/ui/panel";
import { Field, TxResult, inputClass } from "@/components/judge/step-card";
import { useTx } from "@/hooks/use-tx";
import { parseAmount } from "@/lib/amount";
import { rupiah } from "@/lib/format";
import { withdrawCall } from "@/lib/owner-actions";

export function WithdrawPanel({ available, onDone, readOnly = false }: { available: bigint; onDone: () => void; readOnly?: boolean }) {
  const tx = useTx(onDone);
  const [raw, setRaw] = useState("");
  const amount = parseAmount(raw);
  const error =
    raw.trim() === "" ? null : amount === null || amount === 0n ? "Enter an amount above 0, for example 100000." : amount > available ? `You only have ${rupiah(available)} ready to withdraw. Enter that or less.` : null;
  const ok = amount !== null && amount > 0n && amount <= available && !readOnly;

  return (
    <Panel aria-labelledby="withdraw">
      <SectionTitle><span id="withdraw">Withdraw</span></SectionTitle>
      <p className="text-sm text-muted">
        Move money that is ready to spend back to your wallet. Money held in open rounds stays held until the round ends. Only you can do this; the agent cannot.
      </p>
      <p className="mt-3 text-sm">Ready to withdraw: <strong className="num">{rupiah(available)}</strong></p>
      <div className="mt-2 grid grid-cols-[1fr_auto] items-end gap-2">
        <Field id="withdraw-amount" label="Amount (Rp)">
          <input id="withdraw-amount" inputMode="numeric" className={inputClass} value={raw} onChange={(e) => setRaw(e.target.value)} disabled={readOnly} aria-invalid={error !== null} aria-describedby={error ? "withdraw-err" : undefined} />
        </Field>
        <Button variant="secondary" onClick={() => setRaw(available.toString())} disabled={available === 0n || readOnly}>All</Button>
      </div>
      {error && <p id="withdraw-err" className="mt-1.5 text-sm font-semibold text-danger">{error}</p>}
      <div className="mt-4 space-y-3">
        <Button onClick={() => amount !== null && void tx.run(withdrawCall(amount))} busy={tx.busy} disabled={!ok}>Withdraw to wallet</Button>
        {readOnly && <p className="text-sm text-muted">Withdrawing is turned off in the demo. Sign in to move your own money.</p>}
        <TxResult result={tx.result} />
      </div>
    </Panel>
  );
}
