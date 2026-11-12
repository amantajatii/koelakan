"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, StepCard, TxResult, inputClass, type StepState } from "@/components/judge/step-card";
import { useTx } from "@/hooks/use-tx";
import { parseAmount } from "@/lib/amount";
import { rupiah } from "@/lib/format";
import { setPolicyCall } from "@/lib/tx";
import type { Item, Policy } from "@/lib/types";

const DEFAULT_BUDGET = "2000000";

interface Props {
  accountId: string | null;
  items: Item[];
  policy: Policy | null;
  onDone: () => void;
}

export function PolicyStep({ accountId, items, policy, onDone }: Props) {
  const tx = useTx(onDone);
  const [edits, setEdits] = useState<Record<string, string>>({});
  const [budgetRaw, setBudgetRaw] = useState(DEFAULT_BUDGET);

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
    return { max_price: max, weekly_budget: budget.toString(), auto_join: true } satisfies Policy;
  }, [items, edits, policy, budgetRaw]);

  const state: StepState = !accountId ? "locked" : policy ? "done" : "ready";
  return (
    <StepCard
      index="4"
      title="Atur kebijakan"
      state={state}
      intro={<>Batas harga per barang dan anggaran mingguan, ditegakkan kontrak. <code className="num">set_policy</code> memerlukan 1 yocto, jadi hanya kunci penuh Anda yang bisa mengubahnya, bukan agen. <code className="num">auto_join</code> dinyalakan agar kunci terbatas boleh ikut ronde.</>}
    >
      {accountId && (
        <>
          <fieldset className="grid gap-3 sm:grid-cols-2">
            <legend className="mb-1 text-sm font-semibold">Harga maksimum per barang (default = harga acuan PIHPS)</legend>
            {items.map((item) => (
              <Field key={item.id} id={`max-${item.id}`} label={`${item.name} per ${item.unit}`}>
                <input id={`max-${item.id}`} inputMode="numeric" className={inputClass} value={maxRaw(item)} onChange={(e) => setEdits((prev) => ({ ...prev, [item.id]: e.target.value }))} />
              </Field>
            ))}
          </fieldset>
          <Field id="anggaran" label="Anggaran mingguan (tIDR)" hint="Total yang boleh dikunci atau dibelanjakan per 7 hari.">
            <input id="anggaran" inputMode="numeric" className={inputClass} value={budgetRaw} onChange={(e) => setBudgetRaw(e.target.value)} />
          </Field>
          {policy && <p className="text-sm text-ink-soft">Kebijakan aktif: anggaran <span className="num">{rupiah(policy.weekly_budget)}</span>, {Object.keys(policy.max_price).length} barang.</p>}
          {parsed === null && <p className="text-sm font-semibold text-chili">Semua isian harus berupa angka lebih dari 0.</p>}
          <Button onClick={() => parsed && void tx.run(setPolicyCall(parsed))} busy={tx.busy} disabled={parsed === null}>
            {policy ? "Perbarui kebijakan" : "Simpan kebijakan"}
          </Button>
          <TxResult result={tx.result} />
        </>
      )}
    </StepCard>
  );
}
