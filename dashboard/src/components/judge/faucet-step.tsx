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
  index?: string;
  status?: StepState;
}

export function FaucetStep({ accountId, tidr, marketAvailable, onDone, index = "2", status }: Props) {
  const tx = useTx(onDone);
  const hasFunds = (tidr ?? 0n) > 0n || (marketAvailable ?? 0n) > 0n;
  const state: StepState = status ?? (!accountId ? "locked" : hasFunds ? "done" : "ready");
  return (
    <StepCard
      index={index}
      stepId="faucet"
      title="Get test rupiah"
      state={state}
      intro={<>The faucet gives <span className="num">Rp1,000,000</span> tIDR (test rupiah), once per hour per account, and registers your account on the token. Needs a full wallet signature.</>}
    >
      {accountId && (
        <>
          <p className="text-sm">tIDR in wallet: <strong className="num">{tidr === null ? "loading" : rupiah(tidr)}</strong></p>
          <Button onClick={() => void tx.run(faucetCall())} busy={tx.busy}>Get test rupiah</Button>
          <TxResult result={tx.result} />
        </>
      )}
    </StepCard>
  );
}
