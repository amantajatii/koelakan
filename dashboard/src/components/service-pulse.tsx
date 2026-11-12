"use client";

import Link from "next/link";
import { ArrowRight, Clock, Repeat } from "lucide-react";
import { StatusBadge } from "@/components/status-badge";
import { Panel } from "@/components/ui/panel";
import { Skeleton } from "@/components/ui/states";
import { useAgentStatus } from "@/hooks/use-agent-status";
import { useNow } from "@/hooks/use-now";
import { cadenceLine, formatNextOpen, isStale } from "@/lib/status-format";

/** Live agent-service summary: state, cadence, next round. Used on the overview and on /warung. */
export function ServicePulse({ heading = "Agent service", showBadge = true }: { heading?: string; showBadge?: boolean }) {
  const { status, loading } = useAgentStatus();
  const now = useNow(0);
  const online = status !== null && now > 0 && !isStale(status, now);
  return (
    <Panel aria-labelledby="service-pulse">
      <div className="flex items-center justify-between gap-3">
        <h2 id="service-pulse" className="text-lg font-bold tracking-tight">{heading}</h2>
        {showBadge && <StatusBadge compact />}
      </div>
      {loading ? (
        <Skeleton className="mt-4 h-14" />
      ) : status ? (
        <dl className="mt-4 space-y-3 text-sm">
          <div className="flex items-center gap-3">
            <span aria-hidden className="flex size-9 shrink-0 items-center justify-center rounded-full bg-brand-soft text-brand-ink"><Repeat className="size-4" /></span>
            <div><dt className="text-xs text-muted">Rounds open</dt><dd className="font-semibold">{cadenceLine(status)}</dd></div>
          </div>
          <div className="flex items-center gap-3">
            <span aria-hidden className="flex size-9 shrink-0 items-center justify-center rounded-full bg-brand-soft text-brand-ink"><Clock className="size-4" /></span>
            <div><dt className="text-xs text-muted">Next round</dt><dd className="num font-semibold">{now === 0 ? "..." : formatNextOpen(status.next_open_at, now)}</dd></div>
          </div>
          {!online && <p className="text-xs text-warn">The service has not ticked recently, so the next round may be late.</p>}
        </dl>
      ) : (
        <p className="mt-3 text-sm text-muted">Agent service offline. On-chain data is still live.</p>
      )}
      <Link href="/status" className="mt-4 inline-flex min-h-10 items-center gap-1.5 text-sm font-semibold text-brand-ink hover:text-brand">
        Full status <ArrowRight className="size-4" aria-hidden />
      </Link>
    </Panel>
  );
}
