"use client";

import Link from "next/link";
import { cn } from "@/components/ui/cn";
import { useAgentStatus } from "@/hooks/use-agent-status";
import { useNow } from "@/hooks/use-now";
import { statusBadge, type BadgeTone } from "@/lib/status-format";

const DOT: Record<BadgeTone, string> = { good: "bg-brand-ink", warn: "bg-warn", bad: "bg-danger", neutral: "bg-muted" };
const PILL: Record<BadgeTone, string> = {
  good: "bg-surface text-ink shadow-card hover:bg-brand-soft",
  warn: "bg-warn-soft text-warn hover:bg-warn-soft/70",
  bad: "bg-danger-soft text-danger hover:bg-danger-soft/70",
  neutral: "bg-surface text-muted shadow-card",
};

/** Agent service pill: dot, label, and (when online) last tick and next round. */
export function StatusBadge({ compact = false, className }: { compact?: boolean; className?: string }) {
  const { status, loading } = useAgentStatus();
  const now = useNow(0);
  if (loading || now === 0) {
    return (
      <span className={cn("inline-flex min-h-11 items-center gap-2 rounded-full bg-surface px-4 shadow-card lg:min-h-10 text-xs font-semibold text-muted", className)}>
        <span className="size-2 rounded-full bg-line-strong" aria-hidden />
        Checking agent
      </span>
    );
  }
  const badge = statusBadge(status, now);
  return (
    <Link
      href="/status"
      className={cn("inline-flex min-h-11 items-center gap-2 rounded-full px-4 text-xs lg:min-h-10 font-semibold transition-colors duration-150", PILL[badge.tone], className)}
    >
      <span aria-hidden className={cn("size-2 shrink-0 rounded-full", DOT[badge.tone], badge.tone === "good" && "live-dot")} />
      <span>{badge.label}</span>
      {!compact && badge.detail && <span className="hidden font-medium opacity-80 xl:inline">{badge.detail}</span>}
    </Link>
  );
}
