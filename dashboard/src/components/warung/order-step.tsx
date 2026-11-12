"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, StepCard, inputClass, type StepState } from "@/components/judge/step-card";
import { cn } from "@/components/ui/cn";
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
  index: string;
  status: StepState;
}

type Notice = { tone: "ok" | "error"; text: string } | null;

export function OrderStep({ accountId, items, record, apiOnline, onSaved, index, status }: Props) {
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

  return (
    <StepCard
      index={index}
      title="Standing order"
      state={status}
      intro={<>How much your agent buys each round, in kg. Zero means skip that item. You sign it with your wallet (no transaction, no fee), so the service knows the order is really yours. Set every item to 0 to unregister.</>}
    >
      {accountId && (
        <>
          {!apiOnline && <p role="status" className="rounded-md border-2 border-kunyit bg-kunyit-soft/60 px-3 py-2 text-sm">Agent service offline. You can still use everything on-chain; saving a standing order waits until it is back.</p>}
          <div className="grid gap-3 sm:grid-cols-2">
            {items.map((item) => (
              <Field key={item.id} id={`qty-${item.id}`} label={`${itemLabel(item)} (${item.unit} per round)`}>
                <input id={`qty-${item.id}`} inputMode="numeric" className={inputClass} value={raw[item.id]} onChange={(e) => setEdits((p) => ({ ...p, [item.id]: e.target.value }))} disabled={!apiOnline} />
              </Field>
            ))}
          </div>
          {!check.ok && <p className="text-sm font-semibold text-chili">{check.message}</p>}
          <Button onClick={() => void save()} busy={busy} disabled={!apiOnline || !check.ok}>
            {clearing ? "Clear standing order" : "Sign and save order"}
          </Button>
          {notice && (
            <p role="status" className={cn("rounded-md border-2 px-3 py-2 text-sm", notice.tone === "ok" ? "border-pandan bg-pandan-soft/60" : "border-chili bg-chili-soft/60")}>
              {notice.text}
            </p>
          )}
          <p className="text-sm text-ink-soft">
            Saved order:{" "}
            {saved.length === 0 ? "none yet." : saved.map(([id, q]) => `${itemLabel(items.find((i) => i.id === id), id)} ${q} ${items.find((i) => i.id === id)?.unit ?? "kg"}`).join(", ") + " per round."}
          </p>
        </>
      )}
    </StepCard>
  );
}
