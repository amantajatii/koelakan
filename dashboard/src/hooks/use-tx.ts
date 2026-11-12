"use client";

import { useCallback, useState } from "react";
import type { FunctionCallSpec } from "@/lib/tx";
import { useWallet, type CallResult } from "@/lib/wallet";

export interface TxState {
  busy: boolean;
  result: CallResult | null;
  run: (spec: FunctionCallSpec) => Promise<CallResult>;
  reset: () => void;
}

/** Runs one wallet call at a time and remembers its latest result for the step card. */
export function useTx(onSuccess?: () => void): TxState {
  const { call } = useWallet();
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<CallResult | null>(null);

  const run = useCallback(
    async (spec: FunctionCallSpec): Promise<CallResult> => {
      setBusy(true);
      setResult(null);
      const r = await call(spec);
      setResult(r);
      setBusy(false);
      if (r.ok) onSuccess?.();
      return r;
    },
    [call, onSuccess],
  );

  return { busy, result, run, reset: () => setResult(null) };
}
