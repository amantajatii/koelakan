"use client";

import { CloudOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/components/ui/cn";
import { useAgentStatus } from "@/hooks/use-agent-status";
import { OFFLINE_MESSAGE } from "@/lib/agent-api";

/** Shown wherever the service is needed. Renders nothing while it is reachable or still being checked. */
export function OfflineNote({ className }: { className?: string }) {
  const { status, loading, refresh } = useAgentStatus();
  if (loading || status) return null;
  return (
    <div role="status" className={cn("flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-warn-soft p-4 text-sm ring-1 ring-inset ring-warn/20", className)}>
      <p className="flex items-start gap-2.5">
        <CloudOff className="mt-0.5 size-4 shrink-0 text-warn" aria-hidden />
        <span><strong className="font-semibold">{OFFLINE_MESSAGE.split(". ")[0]}.</strong> On-chain data is still live; the 24/7 agents will resume when the service is back.</span>
      </p>
      <Button variant="secondary" onClick={refresh} className="min-h-10">Check again</Button>
    </div>
  );
}
