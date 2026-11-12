"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, StepCard, TxResult, inputClass, type StepState } from "@/components/judge/step-card";
import { useTx } from "@/hooks/use-tx";
import { parseAmount } from "@/lib/amount";
import { rupiah } from "@/lib/format";
import { depositCall } from "@/lib/tx";

const DEFAULT_DEPOSIT = "500000";

interface Props {
  accountId: string | null;
  tidr: bigint | null;
  available: bigint | null;
  onDone: () => void;
  index?: string;
  status?: StepState;
}

export function DepositStep({ accountId, tidr, available, onDone, index = "3", status }: Props) {
  const tx = useTx(onDone);
  const [raw, setRaw] = useState(DEFAULT_DEPOSIT);
  const amount = parseAmount(raw);
  const tooMuch = amount !== null && tidr !== null && amount > tidr;
  const invalid = amount === null || amount === 0n;
  const state: StepState = status ?? (!accountId ? "locked" : (available ?? 0n) > 0n ? "done" : "ready");
  const error = invalid ? "Enter a number greater than 0." : tooMuch ? `Your wallet only has ${rupiah(tidr ?? 0n)} tIDR. Get test rupiah first.` : null;
  return (
    <StepCard
      index={index}
      title="Deposit to market"
      state={state}
      intro={<>Moves tIDR into your pooled balance in the contract via <code className="num">ft_transfer_call</code> (message <code className="num">deposit</code>, 1 yocto). This is the money that gets locked when you join a round.</>}
    >
      {accountId && (
        <>
          <Field id="deposit-amount" label="Deposit amount (tIDR)" hint={amount ? `Deposit ${rupiah(amount)}` : undefined}>
            <input id="deposit-amount" inputMode="numeric" className={inputClass} value={raw} onChange={(e) => setRaw(e.target.value)} aria-invalid={error !== null} aria-describedby={error ? "deposit-err" : "deposit-amount-hint"} />
          </Field>
          {error && <p id="deposit-err" className="text-sm font-semibold text-chili">{error}</p>}
          <Button onClick={() => amount !== null && void tx.run(depositCall(amount))} busy={tx.busy} disabled={error !== null}>Deposit to market</Button>
          <TxResult result={tx.result} />
        </>
      )}
    </StepCard>
  );
}
