"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, StepCard, TxResult, inputClass } from "@/components/judge/step-card";
import { useTx } from "@/hooks/use-tx";
import { parseQty } from "@/lib/amount";
import { DEMO_DURATIONS } from "@/lib/config";
import { rupiah } from "@/lib/format";
import { openRoundCall } from "@/lib/tx";
import type { Item } from "@/lib/types";

const DEFAULT_MIN_QTY = "100";

export function OpenStep({ accountId, items, onDone }: { accountId: string | null; items: Item[]; onDone: () => void }) {
  const tx = useTx(onDone);
  const [itemId, setItemId] = useState<string | null>(null);
  const [minRaw, setMinRaw] = useState(DEFAULT_MIN_QTY);
  const item = items.find((i) => i.id === itemId) ?? items[0];
  const minQty = parseQty(minRaw);
  const d = DEMO_DURATIONS;

  return (
    <StepCard
      index="6"
      title="Buka ronde"
      state={accountId ? "optional" : "locked"}
      intro={<>Siapa saja boleh memanggil <code className="num">open_round</code>. Batas harga ronde diset sama dengan harga acuan PIHPS (maksimum yang diizinkan). Durasi demo: pendaftaran {d.join} dtk, tawaran {d.commit} dtk, buka {d.reveal} dtk, pengiriman {d.delivery} dtk.</>}
    >
      {accountId && item && (
        <>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field id="pilih-barang" label="Barang">
              <select id="pilih-barang" className={inputClass} value={item.id} onChange={(e) => setItemId(e.target.value)}>
                {items.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}
              </select>
            </Field>
            <Field id="min-lot" label={`Minimum lot (${item.unit})`} hint={`Batas harga ${rupiah(item.ref_price)}/${item.unit}`}>
              <input id="min-lot" inputMode="numeric" className={inputClass} value={minRaw} onChange={(e) => setMinRaw(e.target.value)} />
            </Field>
          </div>
          <Button variant="secondary" onClick={() => void tx.run(openRoundCall(item.id, BigInt(item.ref_price), minQty))} busy={tx.busy} disabled={minQty < 1}>
            Buka ronde
          </Button>
          <TxResult result={tx.result} />
          <div className="rounded-md border-2 border-kunyit bg-kunyit-soft/60 p-3 text-sm">
            <p className="font-semibold">Tawaran grosir hanya muncul jika agen grosir berjalan.</p>
            <p className="mt-1">
              Agen grosir dan warung dijalankan dari repo: <code className="num">cd agents &amp;&amp; pnpm round</code> membuka ronde
              sendiri lalu menjalankan seluruh siklusnya. Ronde yang dibuka dari sini tidak ikut diurus perintah itu, jadi tanpa
              grosir yang menawar, ronde ini akan <strong>gagal</strong> dan dana Anda dikembalikan penuh. Untuk melihat siklus
              lengkap, jalankan perintah itu dan ikut ronde yang ia buka di langkah 5 selama jendela pendaftarannya masih terbuka.
            </p>
          </div>
        </>
      )}
    </StepCard>
  );
}
