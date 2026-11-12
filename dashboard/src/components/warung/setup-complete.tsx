"use client";

import { useState } from "react";
import { CircleCheck, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TxResult } from "@/components/judge/step-card";
import { LimitsForm } from "@/components/warung/limits-form";
import { revokeDelegationKey } from "@/lib/delegation";
import type { Item, Policy } from "@/lib/types";
import { useWallet, type CallResult } from "@/lib/wallet";

interface Props {
  accountId: string;
  items: Item[];
  policy: Policy | null;
  servicePublicKey: string | null;
  allowanceNear: string;
  demand: Readonly<Record<string, number>> | null;
  spent: bigint;
  roundEveryMin: number | null;
  readOnly: boolean;
  onDone: () => void;
}

/** Once setup is finished the stepper folds into this single row: edit limits or stop the agent. */
export function SetupComplete({ accountId, items, policy, servicePublicKey, allowanceNear, demand, spent, roundEveryMin, readOnly, onDone }: Props) {
  const { keyAction } = useWallet();
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<CallResult | null>(null);

  async function revoke(): Promise<void> {
    if (!servicePublicKey) return;
    setBusy(true);
    setResult(null);
    const r = await keyAction(revokeDelegationKey(servicePublicKey));
    setResult(r);
    setBusy(false);
    if (r.ok) onDone();
  }

  return (
    <details id="setup" className="group scroll-mt-6 rounded-card border border-line bg-surface p-5 shadow-card sm:p-6">
      <summary className="flex min-h-11 cursor-pointer list-none items-center gap-3">
        <span aria-hidden className="flex size-8 shrink-0 items-center justify-center rounded-full bg-brand text-white"><CircleCheck className="size-4" /></span>
        <span className="min-w-0 flex-1">
          <span className="font-bold tracking-tight">Setup complete</span>
          <span className="text-muted"> · edit limits or stop the agent</span>
        </span>
        <ChevronDown className="size-5 shrink-0 text-muted transition-transform duration-200 group-open:rotate-180" aria-hidden />
      </summary>
      <div className="mt-5 grid gap-8 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <section aria-labelledby="edit-limits">
          <h2 id="edit-limits" className="mb-3 text-lg font-bold tracking-tight">Your limits</h2>
          <LimitsForm mode="edit" accountId={accountId} items={items} policy={policy} delegated servicePublicKey={servicePublicKey} allowanceNear={allowanceNear} demand={demand} spent={spent} roundEveryMin={roundEveryMin} readOnly={readOnly} onDone={onDone} />
        </section>
        <section aria-labelledby="stop-agent" className="space-y-3 text-sm">
          <h2 id="stop-agent" className="text-lg font-bold tracking-tight">Stop the agent</h2>
          <p className="text-muted">Takes away the agent&apos;s permission to shop for you. Your balance, limits and past orders stay exactly as they are. You can allow it again any time.</p>
          {readOnly ? (
            <p className="text-muted">Not available in the demo. Sign in to manage your own agent.</p>
          ) : (
            <Button variant="secondary" onClick={() => void revoke()} busy={busy} disabled={!servicePublicKey}>Stop the agent</Button>
          )}
          <TxResult result={result} />
        </section>
      </div>
    </details>
  );
}
