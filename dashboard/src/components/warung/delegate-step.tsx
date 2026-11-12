"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { Notice } from "@/components/ui/notice";
import { StepCard, TxResult, type StepState } from "@/components/judge/step-card";
import { addDelegationKey, revokeDelegationKey } from "@/lib/delegation";
import { config } from "@/lib/config";
import { formatNear } from "@/lib/status-format";
import { useWallet, type CallResult } from "@/lib/wallet";

interface Props {
  accountId: string | null;
  /** From GET /status; null when the service is offline. */
  servicePublicKey: string | null;
  allowanceNear: string;
  delegated: boolean | null;
  chainError: string | null;
  onDone: () => void;
  index: string;
  status: StepState;
}

export function DelegateStep({ accountId, servicePublicKey, allowanceNear, delegated, chainError, onDone, index, status }: Props) {
  const { keyAction } = useWallet();
  const [busy, setBusy] = useState<"add" | "revoke" | null>(null);
  const [result, setResult] = useState<CallResult | null>(null);

  async function run(kind: "add" | "revoke"): Promise<void> {
    if (!servicePublicKey) return;
    setBusy(kind);
    setResult(null);
    const r = await keyAction(kind === "add" ? addDelegationKey(servicePublicKey) : revokeDelegationKey(servicePublicKey));
    setResult(r);
    setBusy(null);
    if (r.ok) onDone();
  }

  return (
    <StepCard
      index={index}
      stepId="delegate"
      title="Delegate to the Koelakan agent"
      state={status}
      intro={<>Adds a function-call key to your account for the service&apos;s agent. It can only call <code className="font-mono text-xs text-ink">join_round</code> on <code className="font-mono text-xs text-ink">{config.marketId}</code>, with a gas allowance of <span className="num">{formatNear(allowanceNear)}</span> and no way to attach a deposit. Your wallet asks you to approve this once.</>}
    >
      {accountId && (
        <>
          {servicePublicKey ? (
            <p className="break-all text-xs text-muted">Agent key: <span className="font-mono">{servicePublicKey}</span></p>
          ) : (
            <Notice tone="warn">The agent&apos;s public key comes from the service, which is offline right now. Try again in a moment.</Notice>
          )}
          <p className="flex flex-wrap items-center gap-2 text-sm">
            Status:
            <Chip tone={delegated ? "good" : "neutral"}>
              {delegated === null ? "checking the chain" : delegated ? "Delegated, the agent can join for you" : "Not delegated"}
            </Chip>
          </p>
          {chainError && <Notice tone="error" role="alert">Could not read your access keys: {chainError}</Notice>}
          <div className="flex flex-wrap items-center gap-3">
            {!delegated && (
              <Button onClick={() => void run("add")} busy={busy === "add"} disabled={!servicePublicKey || busy !== null}>
                Delegate to the agent
              </Button>
            )}
            {delegated && (
              <Button variant="secondary" onClick={() => void run("revoke")} busy={busy === "revoke"} disabled={busy !== null}>
                Revoke agent key
              </Button>
            )}
          </div>
          <TxResult result={result} />
        </>
      )}
    </StepCard>
  );
}
