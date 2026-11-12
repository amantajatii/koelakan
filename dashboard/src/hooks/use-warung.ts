"use client";

import { useCallback, useEffect, useState } from "react";
import { fetchWarung } from "@/lib/agent-api";
import type { WarungRecord } from "@/lib/agent-types";
import { isDelegationKey } from "@/lib/delegation";
import { fetchAccessKey } from "@/lib/rpc";

export interface WarungData {
  /** Saved standing order and recent agent actions; null when not registered or the service is down. */
  record: WarungRecord | null;
  /** The service could not be reached (distinct from "not registered"). */
  apiDown: boolean;
  /** Delegation read straight from chain; null while unknown. */
  delegated: boolean | null;
  chainError: string | null;
  refresh: () => void;
  refreshAfterTx: () => void;
}

const POLL_MS = 15_000;
const AFTER_TX_DELAYS = [2_500, 6_000];

/** Owner-specific data: the service's record plus the chain's own view of the delegated key. */
export function useWarung(accountId: string | null, servicePublicKey: string | null): WarungData {
  const [record, setRecord] = useState<WarungRecord | null>(null);
  const [apiDown, setApiDown] = useState(false);
  const [delegated, setDelegated] = useState<boolean | null>(null);
  const [chainError, setChainError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!accountId) {
      setRecord(null);
      setDelegated(null);
      return;
    }
    const [api, chain] = await Promise.allSettled([
      fetchWarung(accountId),
      servicePublicKey ? fetchAccessKey(accountId, servicePublicKey) : Promise.resolve(undefined),
    ]);
    if (api.status === "fulfilled") {
      setApiDown(!api.value.ok && api.value.kind !== "not_registered");
      setRecord(api.value.ok ? api.value.data : null);
    }
    if (chain.status === "fulfilled") {
      setDelegated(chain.value === undefined ? null : isDelegationKey(chain.value));
      setChainError(null);
    } else {
      setChainError(chain.reason instanceof Error ? chain.reason.message : "Could not read your access keys.");
    }
  }, [accountId, servicePublicKey]);

  useEffect(() => {
    const first = setTimeout(() => void load(), 0);
    const id = setInterval(() => {
      if (document.visibilityState === "visible") void load();
    }, POLL_MS);
    return () => {
      clearTimeout(first);
      clearInterval(id);
    };
  }, [load]);

  const refreshAfterTx = useCallback(() => {
    void load();
    AFTER_TX_DELAYS.forEach((ms) => setTimeout(() => void load(), ms));
  }, [load]);

  return { record, apiDown, delegated, chainError, refresh: () => void load(), refreshAfterTx };
}
