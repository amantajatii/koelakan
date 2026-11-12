"use client";

import Link from "next/link";
import { cn } from "@/components/ui/cn";
import { useAgentStatus } from "@/hooks/use-agent-status";
import { useNow } from "@/hooks/use-now";
import { statusBadge, type BadgeTone } from "@/lib/status-format";

const DOT: Record<BadgeTone, string> = { good: "bg-brand", warn: "bg-[#c98a12]", bad: "bg-danger", neutral: "bg-muted" };
const PILL: Record<BadgeTone, string> = {
  good: "bg-brand-soft text-brand-ink hover:bg-[#d4eee4]",
  warn: "bg-warn-soft text-warn hover:bg-[#ffe8b8]",
  bad: "bg-danger-soft text-danger hover:bg-[#fbd5d5]",
  neutral: "bg-ground text-muted",
};

/** Agent service pill: dot, label, and (when online) last tick and next round. */
export function StatusBadge({ compact = false, className }: { compact?: boolean; className?: string }) {
  const { status, loading } = useAgentStatus();
  const now = useNow(0);
  if (loading || now === 0) {
    return (
      <span className={cn("inline-flex min-h-9 items-center gap-2 rounded-full bg-ground px-3 text-xs font-semibold text-muted", className)}>
        <span className="size-2 rounded-full bg-line-strong" aria-hidden />
        Checking agent
      </span>
    );
  }
  const badge = statusBadge(status, now);
  return (
    <Link
      href="/status"
      className={cn("inline-flex min-h-9 items-center gap-2 rounded-full px-3 text-xs font-semibold transition-colors duration-150", PILL[badge.tone], className)}
      title="Open the service status page"
    >
      <span aria-hidden className={cn("size-2 shrink-0 rounded-full", DOT[badge.tone], badge.tone === "good" && "live-dot")} />
      <span>{badge.label}</span>
      {!compact && badge.detail && <span className="hidden font-medium opacity-80 xl:inline">{badge.detail}</span>}
    </Link>
  );
}
