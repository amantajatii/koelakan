"use client";

import Link from "next/link";
import { Panel } from "@/components/ui/panel";
import { StatusBadge } from "@/components/status-badge";
import { useAgentStatus } from "@/hooks/use-agent-status";
import { useNow } from "@/hooks/use-now";
import { cadenceLine, formatNextOpen } from "@/lib/status-format";

export function ServiceCard() {
  const { status } = useAgentStatus();
  const now = useNow(0);
  return (
    <Panel aria-labelledby="service-card" className="p-4 sm:p-4">
      <h2 id="service-card" className="font-display text-xl font-semibold">Agent service</h2>
      <div className="mt-2"><StatusBadge compact /></div>
      {status ? (
        <dl className="mt-2 space-y-1 text-sm">
          <div className="flex justify-between gap-3"><dt className="text-ink-soft">Rounds open</dt><dd>{cadenceLine(status)}</dd></div>
          <div className="flex justify-between gap-3"><dt className="text-ink-soft">Next round</dt><dd className="num">{now === 0 ? "..." : formatNextOpen(status.next_open_at, now)}</dd></div>
          <div className="flex justify-between gap-3"><dt className="text-ink-soft">Warungs delegated</dt><dd className="num">{status.agents.delegated_warungs}</dd></div>
        </dl>
      ) : (
        <p className="mt-2 text-sm text-ink-soft">Agent service offline. On-chain data is still live.</p>
      )}
      <Link href="/status" className="mt-2 inline-block text-sm font-semibold underline underline-offset-4 hover:text-chili">Full status</Link>
    </Panel>
  );
}
