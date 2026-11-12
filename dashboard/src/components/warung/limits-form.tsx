"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, TxResult, inputClass } from "@/components/judge/step-card";
import { Notice } from "@/components/ui/notice";
import { BudgetSummary } from "@/components/warung/budget-summary";
import { TechNote, codeClass } from "@/components/warung/tech-note";
import { parseAmount } from "@/lib/amount";
import { limitsBatch } from "@/lib/batch";
import { planBudget } from "@/lib/budget";
import { config } from "@/lib/config";
import { rupiah } from "@/lib/format";
import { itemLabel } from "@/lib/items";
import { limitsMissing } from "@/lib/steps";
import { setPolicyCall } from "@/lib/tx";
import type { Item, Policy } from "@/lib/types";
import { useTx } from "@/hooks/use-tx";
import { useWallet, type CallResult } from "@/lib/wallet";
import { formatNear } from "@/lib/status-format";

const DEFAULT_BUDGET = "2000000";

interface Props {
  mode: "setup" | "edit";
  accountId: string;
  items: Item[];
  policy: Policy | null;
  delegated: boolean | null;
  servicePublicKey: string | null;
  allowanceNear: string;
  /** Saved standing order, to show what one round costs against the budget. */
  demand: Readonly<Record<string, number>> | null;
  spent: bigint;
  roundEveryMin: number | null;
  readOnly?: boolean;
  onDone: () => void;
}

/** Price limits, weekly budget and the agent's permission. Setup sends everything in one wallet approval. */
export function LimitsForm({ mode, accountId, items, policy, delegated, servicePublicKey, allowanceNear, demand, spent, roundEveryMin, readOnly = false, onDone }: Props) {
  const { callBatch } = useWallet();
  const tx = useTx(onDone);
  const [edits, setEdits] = useState<Record<string, string>>({});
  const [budgetEdit, setBudgetEdit] = useState<string | null>(null);
  const [autoEdit, setAutoEdit] = useState<boolean | null>(null);
  const [batchBusy, setBatchBusy] = useState(false);
  const [batchResult, setBatchResult] = useState<CallResult | null>(null);

  const budgetRaw = budgetEdit ?? policy?.weekly_budget ?? DEFAULT_BUDGET;
  const autoJoin = autoEdit ?? policy?.auto_join ?? true;
  const dirty = Object.keys(edits).length > 0 || budgetEdit !== null || autoEdit !== null;
  const missing = limitsMissing({ policy, delegated });

  const parsed = useMemo(() => {
    const max: Record<string, string> = {};
    for (const item of items) {
      const v = parseAmount(edits[item.id] ?? policy?.max_price[item.id] ?? item.ref_price);
      if (v === null || v === 0n) return null;
      max[item.id] = v.toString();
    }
    const budget = parseAmount(budgetRaw);
    if (budget === null || budget === 0n) return null;
    return { max_price: max, weekly_budget: budget.toString(), auto_join: autoJoin } satisfies Policy;
  }, [items, edits, policy, budgetRaw, autoJoin]);

  const plan = useMemo(
    () => planBudget({ demand: demand ?? {}, items, weeklyBudget: parsed ? BigInt(parsed.weekly_budget) : null, spent, roundEveryMin }),
    [demand, items, parsed, spent, roundEveryMin],
  );

  const setupNeedsPolicy = missing.policy || dirty;
  const canSubmit = parsed !== null && !readOnly && (mode === "edit" || servicePublicKey !== null || !missing.delegation);

  async function submit(): Promise<void> {
    if (!parsed) return;
    if (mode === "edit") {
      await tx.run(setPolicyCall(parsed));
      return;
    }
    setBatchBusy(true);
    setBatchResult(null);
    const r = await callBatch(limitsBatch({ accountId, policy: setupNeedsPolicy ? parsed : null, servicePublicKey, includeDelegation: missing.delegation }));
    setBatchResult(r);
    setBatchBusy(false);
    if (r.ok) onDone();
  }

  const label = mode === "edit" ? "Update limits" : missing.policy ? "Save limits and allow the agent" : "Allow the agent to shop for me";
  const result = mode === "edit" ? tx.result : batchResult;

  return (
    <div className="space-y-4">
      <Field id={`budget-${mode}`} label="Most you want to spend each week (Rp)" hint="The contract refuses any purchase that would go over this.">
        <input id={`budget-${mode}`} inputMode="numeric" className={inputClass} value={budgetRaw} disabled={readOnly} onChange={(e) => setBudgetEdit(e.target.value)} aria-invalid={parsed === null} aria-describedby={`budget-${mode}-hint`} />
      </Field>

      <details className="group rounded-xl border border-line px-3.5" open={mode === "edit"}>
        <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-2 text-sm font-semibold">
          Never pay more than the market price
          <span className="text-xs font-medium text-muted group-open:hidden">Change per item</span>
        </summary>
        <fieldset className="grid gap-3 pb-4 sm:grid-cols-2">
          <legend className="mb-2 text-xs text-muted">Highest price per kg you accept. We start at today&apos;s PIHPS market price, the most the rules ever allow.</legend>
          {items.map((item) => (
            <Field key={item.id} id={`max-${mode}-${item.id}`} label={`${itemLabel(item)} (Rp per ${item.unit})`}>
              <input
                id={`max-${mode}-${item.id}`}
                inputMode="numeric"
                className={inputClass}
                disabled={readOnly}
                value={edits[item.id] ?? policy?.max_price[item.id] ?? item.ref_price}
                onChange={(e) => setEdits((prev) => ({ ...prev, [item.id]: e.target.value }))}
              />
            </Field>
          ))}
        </fieldset>
      </details>

      <label className={`flex min-h-11 items-start gap-3 rounded-xl bg-ground p-3.5 text-sm transition-colors duration-150 ${readOnly ? "" : "cursor-pointer hover:bg-brand-soft"}`}>
        <input type="checkbox" className="mt-0.5 size-5 shrink-0" checked={autoJoin} disabled={readOnly} onChange={(e) => setAutoEdit(e.target.checked)} />
        <span>
          <strong>Let the agent shop for me</strong>
          <span className="mt-0.5 block text-muted">On: the agent joins group buys for you, always inside the limits above. Off: it does nothing until you switch this back on.</span>
        </span>
      </label>

      <BudgetSummary plan={plan} weeklyBudget={parsed ? BigInt(parsed.weekly_budget) : null} spent={spent} showUsage={policy !== null} />

      {parsed === null && <p className="text-sm font-semibold text-danger">Enter whole numbers above 0 for the budget and every price, for example 2000000.</p>}
      {mode === "setup" && !servicePublicKey && missing.delegation && (
        <Notice tone="warn">The agent service is offline, so we cannot add the agent yet. Try again in a moment; your limits are not lost.</Notice>
      )}
      {readOnly && <p className="text-sm text-muted">Limits are read-only in the demo. Sign in to set your own.</p>}
      {!readOnly && (
        <div className="space-y-3">
          <Button onClick={() => void submit()} busy={mode === "edit" ? tx.busy : batchBusy} disabled={!canSubmit}>{label}</Button>
          {mode === "setup" && <p className="text-xs text-muted">One approval in your wallet. The agent can only join group buys, never withdraw your money.</p>}
          <TxResult result={result} />
        </div>
      )}
      <TechNote>
        <p>
          <code className={codeClass}>set_policy</code> on <code className={codeClass}>{config.marketId}</code> stores your max price per item, weekly budget and <code className={codeClass}>auto_join</code> flag. It needs 1 yocto, so only your full-access key can change it, never the agent.
        </p>
        {mode === "setup" && (
          <p>
            An <code className={codeClass}>AddKey</code> action on your own account adds the service&apos;s function-call key: receiver <code className={codeClass}>{config.marketId}</code>, method <code className={codeClass}>join_round</code> only, gas allowance <span className="num">{formatNear(allowanceNear)}</span>, no deposit. Both go through <code className={codeClass}>signAndSendTransactions</code> as two transactions in one approval; a wallet without batching asks twice.
          </p>
        )}
        {servicePublicKey && <p className="break-all">Agent key: <span className="font-mono text-xs">{servicePublicKey}</span></p>}
        {policy && <p>Active on-chain: budget <span className="num">{rupiah(policy.weekly_budget)}</span>, {Object.keys(policy.max_price).length} items, <code className={codeClass}>auto_join</code> {policy.auto_join ? "on" : "off"}.</p>}
      </TechNote>
    </div>
  );
}
