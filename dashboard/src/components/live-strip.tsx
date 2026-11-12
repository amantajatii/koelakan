"use client";

import Link from "next/link";
import { cn } from "@/components/ui/cn";
import { useAgentStatus } from "@/hooks/use-agent-status";
import { useNow } from "@/hooks/use-now";
import { cadenceLine, formatNextOpen, isStale } from "@/lib/status-format";

/** One-line production framing for the home hero, driven by the service's real cadence. */
export function LiveStrip() {
  const { status, loading } = useAgentStatus();
  const now = useNow(0);
  const online = status !== null && now > 0 && !isStale(status, now);
  return (
    <p className="mb-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm font-semibold">
      <span aria-hidden className={cn("size-2.5 rounded-full", loading ? "bg-rule" : online ? "animate-pulse bg-pandan" : "bg-kunyit")} />
      <span>Live on NEAR testnet</span>
      {loading ? null : status ? (
        <span className="font-normal text-ink-soft">
          rounds open {cadenceLine(status)}{now > 0 && <> · next round {formatNextOpen(status.next_open_at, now)}</>}
        </span>
      ) : (
        <span className="font-normal text-ink-soft">agent service offline right now, on-chain data below is still live</span>
      )}
      <Link href="/status" className="font-normal underline decoration-rule underline-offset-4 hover:text-chili">status</Link>
    </p>
  );
}
