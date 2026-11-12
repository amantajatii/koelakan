"use client";

import { Button } from "@/components/ui/button";
import { StepCard, TxResult, type StepState } from "@/components/judge/step-card";
import { useTx } from "@/hooks/use-tx";
import { rupiah } from "@/lib/format";
import { faucetCall } from "@/lib/tx";

interface Props {
  accountId: string | null;
  tidr: bigint | null;
  marketAvailable: bigint | null;
  onDone: () => void;
}

export function FaucetStep({ accountId, tidr, marketAvailable, onDone }: Props) {
  const tx = useTx(onDone);
  const hasFunds = (tidr ?? 0n) > 0n || (marketAvailable ?? 0n) > 0n;
  const state: StepState = !accountId ? "locked" : hasFunds ? "done" : "ready";
  return (
    <StepCard
      index="2"
      title="Ambil tIDR"
      state={state}
      intro={<>Faucet memberi <span className="num">Rp1.000.000</span> tIDR (rupiah uji coba), sekali per jam per akun, dan mendaftarkan akun Anda di token. Perlu tanda tangan dompet penuh.</>}
    >
      {accountId && (
        <>
          <p className="text-sm">Saldo tIDR di dompet: <strong className="num">{tidr === null ? "memuat" : rupiah(tidr)}</strong></p>
          <Button onClick={() => void tx.run(faucetCall())} busy={tx.busy}>Ambil tIDR</Button>
          <TxResult result={tx.result} />
        </>
      )}
    </StepCard>
  );
}
