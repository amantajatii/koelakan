"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, TxResult, inputClass } from "@/components/judge/step-card";
import { useTx } from "@/hooks/use-tx";
import { parseAmount } from "@/lib/amount";
import { rupiah } from "@/lib/format";
import { withdrawCall } from "@/lib/owner-actions";

/** Withdraw action that sits directly under the "ready to spend" balance in Your money. */
export function WithdrawRow({ available, onDone, readOnly = false }: { available: bigint; onDone: () => void; readOnly?: boolean }) {
  const tx = useTx(onDone);
  const [raw, setRaw] = useState("");
  const amount = parseAmount(raw);
  const error =
    raw.trim() === "" ? null : amount === null || amount === 0n ? "Enter an amount above 0, for example 100000." : amount > available ? `You only have ${rupiah(available)} ready to withdraw. Enter that or less.` : null;
  const ok = amount !== null && amount > 0n && amount <= available && !readOnly;

  return (
    <div className="border-b border-line py-3">
      <div className="grid grid-cols-[1fr_auto] items-end gap-2">
        <Field id="withdraw-amount" label="Withdraw to your wallet (Rp)">
          <input id="withdraw-amount" inputMode="numeric" className={inputClass} value={raw} onChange={(e) => setRaw(e.target.value)} disabled={readOnly} aria-invalid={error !== null} aria-describedby={error ? "withdraw-err" : undefined} />
        </Field>
        <Button variant="secondary" onClick={() => setRaw(available.toString())} disabled={available === 0n || readOnly}>All</Button>
      </div>
      {error && <p id="withdraw-err" className="mt-1.5 text-sm font-semibold text-danger">{error}</p>}
      <Button className="mt-3 w-full sm:w-auto" onClick={() => amount !== null && void tx.run(withdrawCall(amount))} busy={tx.busy} disabled={!ok}>Withdraw to wallet</Button>
      <p className="mt-2 text-xs text-muted">
        {readOnly
          ? "Withdrawing is turned off in the demo. Sign in to move your own money."
          : "Only you can do this; the agent cannot. Money held in open rounds stays held until the round ends."}
      </p>
      <div className="mt-2"><TxResult result={tx.result} /></div>
    </div>
  );
}
