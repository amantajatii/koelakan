"use client";

import { useAgentStatus } from "@/hooks/use-agent-status";
import { OFFLINE_MESSAGE } from "@/lib/agent-api";

/** Shown wherever the service is needed. Renders nothing while it is reachable or still being checked. */
export function OfflineNote({ className }: { className?: string }) {
  const { status, loading, refresh } = useAgentStatus();
  if (loading || status) return null;
  return (
    <div role="status" className={`flex flex-wrap items-center justify-between gap-3 rounded-lg border-2 border-kunyit bg-kunyit-soft/60 p-3 text-sm ${className ?? ""}`}>
      <p><strong>{OFFLINE_MESSAGE.split(". ")[0]}.</strong> On-chain data is still live; the 24/7 agents will resume when the service is back.</p>
      <button type="button" onClick={refresh} className="rounded-md border-2 border-ink bg-cream px-3 py-1.5 text-xs font-semibold hover:bg-kunyit-soft">Check again</button>
    </div>
  );
}
