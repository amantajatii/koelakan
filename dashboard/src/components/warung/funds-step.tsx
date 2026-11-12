"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, TxResult, inputClass } from "@/components/judge/step-card";
import { Notice } from "@/components/ui/notice";
import { TechNote, codeClass } from "@/components/warung/tech-note";
import { useNow } from "@/hooks/use-now";
import { parseAmount } from "@/lib/amount";
import { faucetCooldownLeftMs, fundsBatch, planFunds } from "@/lib/batch";
import { config } from "@/lib/config";
import { rupiah } from "@/lib/format";
import { useWallet, type CallResult } from "@/lib/wallet";

const DEFAULT_AMOUNT = "500000";
const FAUCET_AMOUNT = 1_000_000n;
const storageKey = (account: string): string => `koelakan:faucet:${account}`;

function readLastClaim(account: string): number | null {
  try {
    const v = Number(window.localStorage.getItem(storageKey(account)));
    return Number.isFinite(v) && v > 0 ? v : null;
  } catch {
    return null;
  }
}
function saveLastClaim(account: string): void {
  try {
    window.localStorage.setItem(storageKey(account), String(Date.now()));
  } catch {
    // private mode: the cooldown just will not be remembered
  }
}

interface Props {
  accountId: string;
  /** Test rupiah in the wallet; null while loading. */
  tidr: bigint | null;
  onDone: () => void;
}

/** Add test money: claim free test rupiah (when needed) and move it into the market in one approval. */
export function FundsStep({ accountId, tidr, onDone }: Props) {
  const { callBatch } = useWallet();
  const now = useNow(0);
  const [raw, setRaw] = useState(DEFAULT_AMOUNT);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<CallResult | null>(null);

  const wanted = parseAmount(raw);
  const invalid = wanted === null || wanted === 0n;
  const wallet = tidr ?? 0n;
  const plan = invalid || tidr === null || now === 0 ? null : planFunds({ tidr: wallet, wanted, cooldownLeftMs: faucetCooldownLeftMs(readLastClaim(accountId), now) });
  const tooMuch = wanted !== null && !invalid && wanted > wallet + FAUCET_AMOUNT;
  const error = invalid ? "Enter a whole number above 0, for example 500000." : tooMuch ? `Free test money tops up to ${rupiah(FAUCET_AMOUNT)} at a time. Enter ${rupiah(wallet + FAUCET_AMOUNT)} or less.` : null;

  async function submit(): Promise<void> {
    if (!plan || plan.blocked || plan.depositAmount === 0n) return;
    setBusy(true);
    setResult(null);
    const r = await callBatch(fundsBatch(plan));
    setResult(r);
    setBusy(false);
    if (plan.includeFaucet && r.ok) saveLastClaim(accountId);
    if (r.ok) onDone();
  }

  const hint = plan === null ? null : plan.blocked
    ? `Free test money was claimed recently and is available again in about ${plan.blocked.minutesLeft} min. Try again then.`
    : plan.includeFaucet
      ? `We claim free test rupiah first, then move ${rupiah(plan.depositAmount)} to your market balance. One approval.`
      : plan.depositAmount < (wanted ?? 0n)
        ? `Free test money is cooling down, so we move the ${rupiah(plan.depositAmount)} you already have.`
        : `You already hold enough test rupiah, so we only move ${rupiah(plan.depositAmount)} to your market balance.`;

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted">Your agent pays from a balance kept safe in the market contract. Test rupiah is free play money, so nothing real is at stake.</p>
      <Field id="funds-amount" label="Test money to add (Rp)" hint={wanted && !invalid ? `Adds ${rupiah(wanted)} to your market balance.` : undefined}>
        <input id="funds-amount" inputMode="numeric" className={inputClass} value={raw} onChange={(e) => setRaw(e.target.value)} aria-invalid={error !== null} aria-describedby={error ? "funds-err" : "funds-amount-hint"} />
      </Field>
      {error && <p id="funds-err" className="text-sm font-semibold text-danger">{error}</p>}
      {!error && hint && <p className={plan?.blocked ? "text-sm font-semibold text-warn" : "text-sm text-muted"}>{hint}</p>}
      <p className="text-xs text-muted">In your wallet: <span className="num font-semibold text-ink">{tidr === null ? "loading" : rupiah(tidr)}</span></p>
      <Button onClick={() => void submit()} busy={busy} disabled={error !== null || plan === null || plan.blocked !== null}>Add test money</Button>
      <TxResult result={result} />
      {result && !result.ok && <Notice tone="warn">If your wallet only finished part of this, press the button again. It continues from what is already done.</Notice>}
      <TechNote>
        <p>
          Two transactions in one approval (<code className={codeClass}>signAndSendTransactions</code>): <code className={codeClass}>faucet()</code> on <code className={codeClass}>{config.tidrId}</code> (<span className="num">Rp1,000,000</span> tIDR, one claim per hour, also registers your account on the token), then <code className={codeClass}>ft_transfer_call</code> to <code className={codeClass}>{config.marketId}</code> with message <code className={codeClass}>deposit</code> and 1 yocto.
        </p>
        <p>The faucet is skipped when your wallet already holds enough tIDR or the hour has not passed. A wallet without batching asks twice.</p>
      </TechNote>
    </div>
  );
}
