"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { fetchStatus, type ApiFailure } from "@/lib/agent-api";
import type { AgentStatus } from "@/lib/agent-types";

export const STATUS_POLL_MS = 15_000;

interface AgentStatusState {
  status: AgentStatus | null;
  failure: ApiFailure | null;
  /** True until the first response (success or failure) arrives. */
  loading: boolean;
  /** Epoch ms of the latest completed check. */
  checkedAt: number | null;
  refresh: () => void;
}

const Ctx = createContext<AgentStatusState | null>(null);

/** One shared 15 s poll of GET /status for the header badge, home, /status and /warung. */
export function AgentStatusProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AgentStatus | null>(null);
  const [failure, setFailure] = useState<ApiFailure | null>(null);
  const [loading, setLoading] = useState(true);
  const [checkedAt, setCheckedAt] = useState<number | null>(null);

  const run = useCallback(async () => {
    const r = await fetchStatus();
    if (r.ok) {
      setStatus(r.data);
      setFailure(null);
    } else {
      // Offline wins immediately: stale numbers would claim a live service.
      setStatus(null);
      setFailure(r);
    }
    setCheckedAt(Date.now());
    setLoading(false);
  }, []);

  useEffect(() => {
    const first = setTimeout(() => void run(), 0);
    const id = setInterval(() => {
      if (document.visibilityState === "visible") void run();
    }, STATUS_POLL_MS);
    return () => {
      clearTimeout(first);
      clearInterval(id);
    };
  }, [run]);

  const value = useMemo(() => ({ status, failure, loading, checkedAt, refresh: () => void run() }), [status, failure, loading, checkedAt, run]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAgentStatus(): AgentStatusState {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAgentStatus must be used inside AgentStatusProvider");
  return ctx;
}
