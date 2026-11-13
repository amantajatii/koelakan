"use client";

import Link from "next/link";
import { Activity, CalendarClock, ChevronRight, CircleCheck, Flame, Layers, Users } from "lucide-react";
import { RecentEvents } from "@/components/status/recent-events";
import { PhaseDurations, Stat } from "@/components/status/stat-card";
import { OfflineNote } from "@/components/shared/offline-note";
import { PhaseBadge } from "@/components/shared/phase-badge";
import { ItemImage } from "@/components/shared/produce-art";
import { StatusBadge } from "@/components/shared/status-badge";
import { Chip } from "@/components/ui/chip";
import { Panel, SectionTitle } from "@/components/ui/panel";
import { LoadingRegion, Skeleton } from "@/components/ui/states";
import { useAgentStatus } from "@/hooks/use-agent-status";
import { useNow } from "@/hooks/use-now";
import type { AgentStatus } from "@/lib/agent-types";
import { formatClock, formatDateTime, int, shortAccount } from "@/lib/format";
import { cadenceLine, formatAgo, formatNear, formatNextOpen } from "@/lib/status-format";
import type { Phase } from "@/lib/types";

const PHASES: readonly string[] = ["Join", "Commit", "Reveal", "ReadyToSettle", "Delivery", "AwaitingFinalize", "Failed", "Closed"];

export function StatusView() {
  const { status, loading, checkedAt } = useAgentStatus();
  const now = useNow(0);
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <StatusBadge />
        {checkedAt && <span className="text-xs text-muted">Checked {formatClock(checkedAt)} WIB, refreshes every 15 s</span>}
      </div>
      <OfflineNote />
      {loading && <LoadingRegion label="Loading service status…" className="space-y-4"><Skeleton className="h-28" /><Skeleton className="h-48" /></LoadingRegion>}
      {status && now > 0 && <Online status={status} now={now} />}
    </div>
  );
}

function Online({ status, now }: { status: AgentStatus; now: number }) {
  return (
    <>
      <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat icon={Layers} tint="bg-info-soft text-info" label="Rounds open" value={cadenceLine(status)} hint={`checked every ${status.tick_secs} s`} />
        <Stat icon={CalendarClock} tint="bg-eggs text-eggs-ink" label="Next round" value={formatNextOpen(status.next_open_at, now)} hint={status.next_open_at ? formatDateTime(Date.parse(status.next_open_at)) : undefined} />
        <Stat icon={Activity} tint="bg-brand-soft text-brand-ink" label="Last tick" value={status.last_tick_at ? formatAgo(now - Date.parse(status.last_tick_at)) : "never"} />
        <Stat icon={Users} tint="bg-sugar text-sugar-ink" label="Delegated warungs" value={`${int(status.agents.delegated_warungs)}`} hint={`${int(status.agents.seeded_warungs)} seeded test warungs`} />
      </dl>

      <div className="grid items-start gap-6 lg:grid-cols-2">
        <Panel aria-labelledby="cadence">
          <SectionTitle><span id="cadence">Round schedule</span></SectionTitle>
          <p className="text-sm text-muted">Each round runs through four timed phases, then delivery:</p>
          <PhaseDurations cadence={status.cadence} />
        </Panel>

        <Panel aria-labelledby="budget">
          <SectionTitle><span id="budget">Service budget</span></SectionTitle>
          <p className="text-sm">
            Estimated gas spend: <strong className="num">{formatNear(status.budget.est_near_per_day)}</strong> per day. Each delegated key carries a <span className="num">{formatNear(status.service_fc_allowance_near)}</span> allowance.
          </p>
          {status.budget.low_accounts.length === 0 ? (
            <p className="mt-4 inline-flex items-center gap-2 rounded-full bg-brand-soft px-3.5 py-2 text-sm font-semibold text-brand-ink"><CircleCheck className="size-4" aria-hidden /> All service accounts have enough NEAR.</p>
          ) : (
            <div className="mt-4 text-sm">
              <p className="flex items-center gap-2 font-semibold text-danger"><Flame className="size-4" aria-hidden /> Low on NEAR:</p>
              <ul className="mt-2 flex flex-wrap gap-2">{status.budget.low_accounts.map((a) => <li key={a}><Chip tone="bad">{shortAccount(a)}</Chip></li>)}</ul>
            </div>
          )}
        </Panel>
      </div>

      <Panel aria-labelledby="active">
        <SectionTitle><span id="active">Active rounds</span></SectionTitle>
        {status.active_rounds.length === 0 ? (
          <p className="text-sm text-muted">No round is running. The next one opens {formatNextOpen(status.next_open_at, now)}.</p>
        ) : (
          <ul className="-mx-1.5 space-y-1">
            {status.active_rounds.map((r) => (
              <li key={r.id}>
                <Link href={`/rounds/${r.id}`} className="flex min-h-[4.5rem] items-center gap-3 rounded-2xl p-2.5 transition-colors duration-150 hover:bg-ground">
                  <ItemImage itemId={r.item} size="md" plain className="rounded-2xl" />
                  <span className="min-w-0 flex-1"><strong className="font-bold">Round #{r.id}</strong><span className="block truncate text-sm text-muted">{r.item}</span></span>
                  {PHASES.includes(r.phase) ? <PhaseBadge phase={r.phase as Phase} /> : <Chip>{r.phase}</Chip>}
                  <ChevronRight className="hidden size-4 shrink-0 text-muted sm:block" aria-hidden />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <RecentEvents events={status.recent_events} />
    </>
  );
}
