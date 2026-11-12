"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, StepCard, TxResult, inputClass, type StepState } from "@/components/judge/step-card";
import { useTx } from "@/hooks/use-tx";
import { parseAmount } from "@/lib/amount";
import { rupiah } from "@/lib/format";
import { itemLabel } from "@/lib/items";
import { setPolicyCall } from "@/lib/tx";
import type { Item, Policy } from "@/lib/types";

const DEFAULT_BUDGET = "2000000";

interface Props {
  accountId: string | null;
  items: Item[];
  policy: Policy | null;
  onDone: () => void;
  index?: string;
  status?: StepState;
}

export function PolicyStep({ accountId, items, policy, onDone, index = "4", status }: Props) {
  const tx = useTx(onDone);
  const [edits, setEdits] = useState<Record<string, string>>({});
  const [budgetEdit, setBudgetEdit] = useState<string | null>(null);
  const [autoEdit, setAutoEdit] = useState<boolean | null>(null);
  const budgetRaw = budgetEdit ?? policy?.weekly_budget ?? DEFAULT_BUDGET;
  const autoJoin = autoEdit ?? policy?.auto_join ?? true;

  const maxRaw = (item: Item): string => edits[item.id] ?? policy?.max_price[item.id] ?? item.ref_price;
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

  const state: StepState = status ?? (!accountId ? "locked" : policy ? "done" : "ready");
  return (
    <StepCard
      index={index}
      title="Set your policy"
      state={state}
      intro={<>A price limit per item and a weekly budget, enforced by the contract, not by the agent. <code className="num">set_policy</code> needs 1 yocto, so only your own full-access key can change it.</>}
    >
      {accountId && (
        <>
          <fieldset className="grid gap-3 sm:grid-cols-2">
            <legend className="mb-1 text-sm font-semibold">Max price per item (default = PIHPS reference price)</legend>
            {items.map((item) => (
              <Field key={item.id} id={`max-${item.id}`} label={`${itemLabel(item)} per ${item.unit}`}>
                <input id={`max-${item.id}`} inputMode="numeric" className={inputClass} value={maxRaw(item)} onChange={(e) => setEdits((prev) => ({ ...prev, [item.id]: e.target.value }))} />
              </Field>
            ))}
          </fieldset>
          <Field id="budget" label="Weekly budget (tIDR)" hint="Total that may be locked or spent per 7 days.">
            <input id="budget" inputMode="numeric" className={inputClass} value={budgetRaw} onChange={(e) => setBudgetEdit(e.target.value)} />
          </Field>
          <label className="flex cursor-pointer items-start gap-3 rounded-md border-2 border-rule bg-paper/40 p-3 text-sm">
            <input type="checkbox" className="mt-1 size-5 shrink-0 accent-[#28634a]" checked={autoJoin} onChange={(e) => setAutoEdit(e.target.checked)} />
            <span>
              <strong>Let my agent join rounds automatically</strong> (<code className="num">auto_join</code>)
              <span className="mt-0.5 block text-ink-soft">
                On: the agent may join on your behalf, always inside the limits above. Off: the contract rejects every agent join and only you can join, with your own key.
              </span>
            </span>
          </label>
          {policy && <p className="text-sm text-ink-soft">Active policy: budget <span className="num">{rupiah(policy.weekly_budget)}</span>, {Object.keys(policy.max_price).length} items, auto_join {policy.auto_join ? "on" : "off"}.</p>}
          {parsed === null && <p className="text-sm font-semibold text-chili">Every field must be a number greater than 0.</p>}
          <Button onClick={() => parsed && void tx.run(setPolicyCall(parsed))} busy={tx.busy} disabled={parsed === null}>
            {policy ? "Update policy" : "Save policy"}
          </Button>
          <TxResult result={tx.result} />
        </>
      )}
    </StepCard>
  );
}
