"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { ItemImage } from "@/components/produce-art";
import { Chip } from "@/components/ui/chip";
import { cn } from "@/components/ui/cn";
import { inputBase } from "@/components/ui/field";
import { Notice } from "@/components/ui/notice";
import { Panel } from "@/components/ui/panel";
import type { StepState } from "@/components/judge/step-card";
import { submitDemand } from "@/lib/agent-api";
import type { WarungRecord } from "@/lib/agent-types";
import { itemLabel } from "@/lib/items";
import { buildSignRequest, buildSubmission, isUnregister, parseDemandInputs, parseSignCallback } from "@/lib/nep413";
import { savePendingSign, takePendingSign } from "@/lib/pending-sign";
import type { Item } from "@/lib/types";
import { useWallet } from "@/lib/wallet";

interface Props {
  accountId: string | null;
  items: Item[];
  record: WarungRecord | null;
  apiOnline: boolean;
  onSaved: () => void;
  status: StepState;
}

const DEFAULT_QTY = "10";
const isIncluded = (value: string | undefined): boolean => /^\d+$/.test((value ?? "").trim()) && Number(value) > 0;

type Notice = { tone: "ok" | "error"; text: string } | null;

/** The owner's standing order as a shopping-list checklist: tick an item, set kg per round, save once. */
export function StandingOrderCard({ accountId, items, record, apiOnline, onSaved, status }: Props) {
  const { signMessage } = useWallet();
  const [edits, setEdits] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<Notice>(null);
  const resumed = useRef(false);

  const raw = useMemo(() => Object.fromEntries(items.map((i) => [i.id, edits[i.id] ?? String(record?.demand[i.id] ?? 0)])), [items, edits, record]);
  const check = parseDemandInputs(raw);

  const send = useCallback(
    async (body: Parameters<typeof submitDemand>[0], clearing: boolean) => {
      const r = await submitDemand(body);
      if (r.ok) {
        setEdits({});
        setNotice({ tone: "ok", text: clearing ? "Standing order cleared. Your agent will skip future rounds." : "Standing order saved. Your agent will use it from the next round." });
        onSaved();
      } else {
        setNotice({ tone: "error", text: r.message });
      }
    },
    [onSaved],
  );

  // A redirect wallet returns here with the signature in the URL hash: finish the pending save.
  useEffect(() => {
    if (resumed.current || !accountId) return;
    const signed = parseSignCallback(window.location.hash);
    if (!signed) return;
    resumed.current = true;
    const pending = takePendingSign();
    history.replaceState(null, "", window.location.pathname + window.location.search);
    if (!pending || pending.accountId !== accountId) return;
    void (async () => {
      setBusy(true);
      await send(
        { account_id: pending.accountId, public_key: signed.publicKey, signature: signed.signature, nonce: pending.nonceBase64, recipient: pending.recipient, message: pending.message },
        isUnregister((JSON.parse(pending.message) as { demand: Record<string, number> }).demand),
      );
      setBusy(false);
    })();
  }, [accountId, send]);

  async function save(): Promise<void> {
    if (!accountId || !check.ok) return;
    setBusy(true);
    setNotice(null);
    const req = buildSignRequest(accountId, check.demand);
    savePendingSign(req);
    const out = await signMessage(req);
    if (out.status !== "redirected") takePendingSign();
    if (out.status === "signed") {
      await send(buildSubmission(req, out.signed), isUnregister(check.demand));
    } else if (out.status === "failed") {
      setNotice({ tone: "error", text: out.error });
    } else {
      setNotice({ tone: "ok", text: "Finish signing in your wallet. You will come back here automatically." });
    }
    setBusy(false);
  }

  const clearing = check.ok && isUnregister(check.demand);
  const saved = record ? Object.entries(record.demand).filter(([, q]) => q > 0) : [];

  const setQty = (id: string, value: string): void => setEdits((p) => ({ ...p, [id]: value }));

  return (
    <Panel aria-labelledby="standing-order-heading" id="standing-order" className="scroll-mt-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="standing-order-heading" className="text-lg font-bold tracking-tight">Standing order</h2>
        <Chip tone={status === "done" ? "good" : "neutral"}>{status === "done" ? "Saved" : "Not set"}</Chip>
      </div>
      <p className="mt-1.5 text-sm text-muted">
        How much your agent buys each round, in kg. Untick an item to skip it. You sign it with your wallet (no transaction, no fee), so the service knows the order is really yours. Untick everything to unregister.
      </p>
      {accountId && (
        <div className="mt-4 space-y-4">
          {!apiOnline && <Notice tone="warn">Agent service offline. You can still use everything on-chain; saving a standing order waits until it is back.</Notice>}
          <ul className="divide-y divide-line rounded-2xl border border-line">
            {items.map((item) => {
              const included = isIncluded(raw[item.id]);
              const lastQty = record?.demand[item.id];
              return (
                <li key={item.id} className="flex items-center gap-3 px-3 py-2.5">
                  <input
                    type="checkbox"
                    id={`inc-${item.id}`}
                    className="size-5 shrink-0"
                    checked={included}
                    disabled={!apiOnline}
                    onChange={(e) => setQty(item.id, e.target.checked ? (lastQty && lastQty > 0 ? String(lastQty) : DEFAULT_QTY) : "0")}
                  />
                  <label htmlFor={`inc-${item.id}`} className="flex min-w-0 flex-1 cursor-pointer items-center gap-3 py-1">
                    <ItemImage itemId={item.id} size="sm" plain />
                    <span className="min-w-0">
                      <span className={cn("block truncate text-sm font-semibold", !included && "text-muted")}>{itemLabel(item)}</span>
                      <span className="block text-xs text-muted">{item.unit} per round</span>
                    </span>
                  </label>
                  <label htmlFor={`qty-${item.id}`} className="sr-only">{`${itemLabel(item)} (${item.unit} per round)`}</label>
                  <input
                    id={`qty-${item.id}`}
                    inputMode="numeric"
                    className={cn(inputBase, "w-20 text-center")}
                    value={raw[item.id]}
                    onChange={(e) => setQty(item.id, e.target.value)}
                    disabled={!apiOnline}
                  />
                </li>
              );
            })}
          </ul>
          {!check.ok && <p className="text-sm font-semibold text-danger">{check.message}</p>}
          <Button onClick={() => void save()} busy={busy} disabled={!apiOnline || !check.ok} className="w-full">
            {clearing ? "Clear standing order" : "Sign and save order"}
          </Button>
          {notice && <Notice tone={notice.tone === "ok" ? "ok" : "error"}>{notice.text}</Notice>}
          <p className="text-sm text-muted">
            Saved order:{" "}
            {saved.length === 0 ? "none yet." : saved.map(([id, q]) => `${itemLabel(items.find((i) => i.id === id), id)} ${q} ${items.find((i) => i.id === id)?.unit ?? "kg"}`).join(", ") + " per round."}
          </p>
        </div>
      )}
    </Panel>
  );
}
