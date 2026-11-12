"use client";

import { useCallback, useEffect, useState } from "react";
import { fetchOverview, type Overview } from "@/lib/overview";
import { fetchChainTimeMs } from "@/lib/rpc";
import { getBalance, getPolicy, getSpent, getTidrBalance, invalidateAccount } from "@/lib/market";
import type { Balance, Policy } from "@/lib/types";

export interface AccountSnapshot {
  tidr: bigint;
  balance: Balance;
  policy: Policy | null;
  spent: bigint;
}

export interface JudgeData {
  overview: Overview | null;
  account: AccountSnapshot | null;
  error: string | null;
  loading: boolean;
  /** Chain time minus browser time, in ms. */
  clockOffsetMs: number;
  refresh: () => void;
  /** Refresh now and again shortly after, because `final` reads trail the tx by a few seconds. */
  refreshAfterTx: () => void;
}

const POLL_MS = 12_000;
const AFTER_TX_DELAYS = [2_500, 6_000];

async function loadAccount(accountId: string): Promise<AccountSnapshot> {
  const [tidr, balance, policy, spent] = await Promise.all([
    getTidrBalance(accountId),
    getBalance(accountId),
    getPolicy(accountId),
    getSpent(accountId),
  ]);
  return { tidr: BigInt(tidr), balance, policy, spent: BigInt(spent) };
}

/** Live data for the judge flow: catalogue, rounds, and the signed-in account's market state. */
export function useJudge(accountId: string | null): JudgeData {
  const [overview, setOverview] = useState<Overview | null>(null);
  const [account, setAccount] = useState<AccountSnapshot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [clockOffsetMs, setClockOffsetMs] = useState(0);

  const refresh = useCallback(async () => {
    try {
      setOverview(await fetchOverview());
      setAccount(accountId ? await loadAccount(accountId) : null);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load data.");
    } finally {
      setLoading(false);
    }
  }, [accountId]);

  useEffect(() => {
    const first = setTimeout(() => void refresh(), 0);
    const id = setInterval(() => {
      if (document.visibilityState === "visible") void refresh();
    }, POLL_MS);
    return () => {
      clearTimeout(first);
      clearInterval(id);
    };
  }, [refresh]);

  useEffect(() => {
    let alive = true;
    const syncClock = async (): Promise<void> => {
      try {
        const chain = await fetchChainTimeMs();
        if (alive) setClockOffsetMs(chain - Date.now());
      } catch {
        // keep the browser clock
      }
    };
    void syncClock();
    return () => {
      alive = false;
    };
  }, []);

  const refreshAfterTx = useCallback(() => {
    const reload = (): void => {
      if (accountId) invalidateAccount(accountId);
      void refresh();
    };
    reload();
    AFTER_TX_DELAYS.forEach((ms) => setTimeout(reload, ms));
  }, [accountId, refresh]);

  return { overview, account, error, loading, clockOffsetMs, refresh: () => void refresh(), refreshAfterTx };
}
