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
}

export function DepositStep({ accountId, tidr, available, onDone }: Props) {
  const tx = useTx(onDone);
  const [raw, setRaw] = useState(DEFAULT_DEPOSIT);
  const amount = parseAmount(raw);
  const tooMuch = amount !== null && tidr !== null && amount > tidr;
  const invalid = amount === null || amount === 0n;
  const state: StepState = !accountId ? "locked" : (available ?? 0n) > 0n ? "done" : "ready";
  const error = invalid ? "Isi jumlah angka lebih dari 0." : tooMuch ? `Saldo tIDR di dompet hanya ${rupiah(tidr ?? 0n)}. Ambil tIDR dulu.` : null;
  return (
    <StepCard
      index="3"
      title="Setor ke market"
      state={state}
      intro={<>Memindahkan tIDR ke saldo patungan Anda di kontrak lewat <code className="num">ft_transfer_call</code> (pesan <code className="num">deposit</code>, 1 yocto). Dana inilah yang dikunci saat Anda ikut ronde.</>}
    >
      {accountId && (
        <>
          <Field id="jumlah-setor" label="Jumlah setoran (tIDR)" hint={amount ? `Setor ${rupiah(amount)}` : undefined}>
            <input id="jumlah-setor" inputMode="numeric" className={inputClass} value={raw} onChange={(e) => setRaw(e.target.value)} aria-invalid={error !== null} aria-describedby={error ? "setor-err" : "jumlah-setor-hint"} />
          </Field>
          {error && <p id="setor-err" className="text-sm font-semibold text-chili">{error}</p>}
          <Button onClick={() => amount !== null && void tx.run(depositCall(amount))} busy={tx.busy} disabled={error !== null}>Setor ke market</Button>
          <TxResult result={tx.result} />
        </>
      )}
    </StepCard>
  );
}
