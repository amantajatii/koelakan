"use client";

import Link from "next/link";
import { cn } from "@/components/ui/cn";
import { useAgentStatus } from "@/hooks/use-agent-status";
import { useNow } from "@/hooks/use-now";
import { statusBadge, type BadgeTone } from "@/lib/status-format";

const DOT: Record<BadgeTone, string> = { good: "bg-pandan", warn: "bg-kunyit", bad: "bg-chili", neutral: "bg-ink-soft" };

/** Compact service indicator: dot, label, and (when online) last tick and next round. */
export function StatusBadge({ compact = false, className }: { compact?: boolean; className?: string }) {
  const { status, loading } = useAgentStatus();
  const now = useNow(0);
  if (loading || now === 0) {
    return <span className={cn("inline-flex items-center gap-2 text-xs text-ink-soft", className)}><span className="size-2 rounded-full bg-rule" aria-hidden />Checking agent</span>;
  }
  const badge = statusBadge(status, now);
  return (
    <Link href="/status" className={cn("inline-flex min-h-8 items-center gap-2 rounded-md px-1 text-xs font-semibold hover:text-chili", className)} title="Open the service status page">
      <span aria-hidden className={cn("size-2.5 shrink-0 rounded-full", DOT[badge.tone], badge.tone === "good" && "animate-pulse")} />
      <span>{badge.label}</span>
      {!compact && badge.detail && <span className="font-normal text-ink-soft">{badge.detail}</span>}
    </Link>
  );
}
