"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Panel } from "@/components/ui/panel";
import { linkClass } from "@/components/ui/panel";
import { Skeleton } from "@/components/ui/states";
import { useAgentStatus } from "@/hooks/use-agent-status";
import { useNow } from "@/hooks/use-now";
import { formatCountdown } from "@/lib/format";
import { cadenceLine, isStale } from "@/lib/status-format";
import type { AgentStatus } from "@/lib/agent-types";

const MS_PER_MIN = 60_000;

/** Share of the gap between two rounds that has already passed (0-1). */
export function elapsedShare(status: AgentStatus, nowMs: number): number | null {
  if (!status.next_open_at) return null;
  const period = status.cadence.round_every_min * MS_PER_MIN;
  if (period <= 0) return null;
  const left = Date.parse(status.next_open_at) - nowMs;
  return Math.min(1, Math.max(0, 1 - left / period));
}

function Body({ status, now }: { status: AgentStatus; now: number }) {
  const share = now === 0 ? null : elapsedShare(status, now);
  const left = status.next_open_at ? Date.parse(status.next_open_at) - now : null;
  const active = status.active_rounds[0];
  return (
    <>
      <p className="num mt-3 text-4xl font-extrabold tracking-tight">
        {now === 0 || left === null ? "..." : left <= 0 ? "Any moment" : formatCountdown(left)}
      </p>
      <p className="mt-1 text-sm text-muted">until the next round opens</p>
      <div aria-hidden className="mt-4 h-2 overflow-hidden rounded-full bg-ground">
        <div className="h-full rounded-full bg-night transition-[width] duration-1000 ease-linear" style={{ width: `${Math.round((share ?? 0) * 100)}%` }} />
      </div>
      <dl className="mt-5 space-y-3 text-sm">
        <div className="flex items-baseline justify-between gap-3">
          <dt className="text-muted">Now</dt>
          <dd className="text-right font-semibold">{active ? <>Round <span className="num">#{active.id}</span>, {active.phase.toLowerCase()}</> : "No round open"}</dd>
        </div>
        <div className="flex items-baseline justify-between gap-3">
          <dt className="text-muted">Rounds open</dt>
          <dd className="font-semibold">{cadenceLine(status)}</dd>
        </div>
      </dl>
      {now > 0 && isStale(status, now) && <p className="mt-3 text-xs text-warn">The service has not ticked recently, so the next round may be late.</p>}
    </>
  );
}

/** Live countdown to the next round from the agent service. No calendar: only what the service reports. */
export function NextRoundCard() {
  const { status, loading } = useAgentStatus();
  const now = useNow(0);
  return (
    <Panel aria-labelledby="next-round-title">
      <h2 id="next-round-title" className="text-lg font-bold tracking-[-0.01em]">Next round</h2>
      {loading ? (
        <Skeleton className="mt-4 h-32" />
      ) : status ? (
        <Body status={status} now={now} />
      ) : (
        <p className="mt-3 text-sm text-muted">Agent service offline. On-chain data is still live.</p>
      )}
      <Link href="/status" className={`${linkClass} mt-4 inline-flex min-h-11 items-center gap-1.5 text-sm`}>
        Full status <ArrowRight className="size-4" aria-hidden />
      </Link>
    </Panel>
  );
}
