"use client";

import { useMemo, useState } from "react";
import { Countdown } from "@/components/countdown";
import { Button } from "@/components/ui/button";
import { Field, StepCard, TxResult, inputClass, type StepState } from "@/components/judge/step-card";
import { cn } from "@/components/ui/cn";
import { useNow } from "@/hooks/use-now";
import { useTx } from "@/hooks/use-tx";
import type { AccountSnapshot } from "@/hooks/use-judge";
import { parseQty } from "@/lib/amount";
import { rupiah } from "@/lib/format";
import { nsToMs } from "@/lib/json";
import { checkJoin } from "@/lib/join-check";
import { derivePhase } from "@/lib/phase";
import { itemOf } from "@/lib/stats";
import { joinRoundCall } from "@/lib/tx";
import type { Item, RoundView } from "@/lib/types";

const DEFAULT_QTY = "10";

interface Props {
  accountId: string | null;
  rounds: RoundView[];
  items: Item[];
  account: AccountSnapshot | null;
  clockOffsetMs: number;
  onDone: () => void;
}

export function JoinStep({ accountId, rounds, items, account, clockOffsetMs, onDone }: Props) {
  const tx = useTx(onDone);
  const now = useNow(0) + clockOffsetMs;
  const live = now > clockOffsetMs + 1;
  const [pickedId, setPickedId] = useState<number | null>(null);
  const [qtyRaw, setQtyRaw] = useState(DEFAULT_QTY);

  const open = useMemo(() => (live ? rounds.filter((r) => derivePhase(r, now) === "Join") : []), [rounds, now, live]);
  const round = open.find((r) => r.id === pickedId) ?? open[open.length - 1] ?? null;
  const item = round ? itemOf(items, round.item) : undefined;
  const qty = parseQty(qtyRaw);

  const problems = accountId
    ? checkJoin({ round, item, qty, policy: account?.policy ?? null, balance: account?.balance ?? null, spent: account?.spent ?? null, nowMs: now, account: accountId })
    : [];
  const joined = rounds.some((r) => r.participants.some((p) => p.account_id === accountId));
  const state: StepState = !accountId ? "locked" : joined ? "done" : "ready";
  const cost = round && qty > 0 ? BigInt(round.ceiling_price) * BigInt(qty) : null;

  return (
    <StepCard
      index="5"
      title="Ikut ronde"
      state={state}
      intro={<>Memanggil <code className="num">join_round</code> dengan <strong className="text-ink">kunci terbatas</strong>, jadi dompet tidak meminta tanda tangan lagi (pada MyNearWallet). Kontrak yang menolak bila melewati kebijakan Anda; pemeriksaan di bawah meniru aturan itu sebelum Anda mengirim.</>}
    >
      {accountId && (
        <>
          {open.length === 0 ? (
            <p className="rounded-md border-2 border-dashed border-rule p-3 text-sm">
              Tidak ada ronde yang sedang menerima pendaftaran. Buka ronde di langkah 6, lalu segera ikut sebelum waktu pendaftaran habis.
            </p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-[1fr_8rem]">
              <Field id="pilih-ronde-ikut" label="Ronde terbuka">
                <select id="pilih-ronde-ikut" className={inputClass} value={round?.id ?? ""} onChange={(e) => setPickedId(Number(e.target.value))}>
                  {open.map((r) => <option key={r.id} value={r.id}>#{r.id} {itemOf(items, r.item)?.name ?? r.item} (maks {rupiah(r.ceiling_price)})</option>)}
                </select>
              </Field>
              <Field id="jumlah-ikut" label={`Jumlah (${item?.unit ?? "unit"})`}>
                <input id="jumlah-ikut" inputMode="numeric" className={inputClass} value={qtyRaw} onChange={(e) => setQtyRaw(e.target.value)} />
              </Field>
            </div>
          )}
          {round && (
            <p className="text-sm text-ink-soft">
              Pendaftaran ditutup dalam <Countdown deadlineMs={nsToMs(round.join_deadline)} nowMs={now} />
              {cost !== null && <> · dana dikunci <strong className="num text-ink">{rupiah(cost)}</strong> ({qty} x {rupiah(round.ceiling_price)})</>}
            </p>
          )}
          <PreCheck problems={problems} hasRound={round !== null} />
          <div className="flex flex-wrap items-center gap-3">
            <Button onClick={() => round && void tx.run(joinRoundCall(round.id, qty))} busy={tx.busy} disabled={round === null || problems.length > 0}>
              Ikut ronde
            </Button>
            {round && problems.length > 0 && (
              <Button variant="ghost" onClick={() => void tx.run(joinRoundCall(round.id, qty))} disabled={tx.busy}>
                Kirim tetap, biar kontrak yang menolak
              </Button>
            )}
          </div>
          <TxResult result={tx.result} />
        </>
      )}
    </StepCard>
  );
}

function PreCheck({ problems, hasRound }: { problems: ReturnType<typeof checkJoin>; hasRound: boolean }) {
  if (!hasRound) return null;
  const ok = problems.length === 0;
  return (
    <div aria-live="polite" className={cn("rounded-md border-2 px-3 py-2 text-sm", ok ? "border-pandan bg-pandan-soft/60" : "border-kunyit bg-kunyit-soft/60")}>
      <p className="font-semibold">{ok ? "Pemeriksaan awal lolos: kontrak akan menerima pendaftaran ini." : "Pendaftaran ini akan ditolak kontrak:"}</p>
      {!ok && <ul className="mt-1 list-disc space-y-0.5 pl-5">{problems.map((p) => <li key={p.code}>{p.message}</li>)}</ul>}
    </div>
  );
}
