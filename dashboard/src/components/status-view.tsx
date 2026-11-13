"use client";

import Link from "next/link";
import { useState } from "react";
import { Activity, CalendarClock, ChevronDown, ChevronRight, CircleCheck, Flame, Layers, Users, type LucideIcon } from "lucide-react";
import { OfflineNote } from "@/components/offline-note";
import { PhaseBadge } from "@/components/phase-badge";
import { ItemImage } from "@/components/produce-art";
import { StatusBadge } from "@/components/status-badge";
import { cn } from "@/components/ui/cn";
import { Chip } from "@/components/ui/chip";
import { Panel, SectionTitle, linkClass } from "@/components/ui/panel";
import { LoadingRegion, Skeleton } from "@/components/ui/states";
import { useAgentStatus } from "@/hooks/use-agent-status";
import { useNow } from "@/hooks/use-now";
import type { AgentStatus } from "@/lib/agent-types";
import { accountUrl, txUrl } from "@/lib/config";
import { formatClock, formatDateTime, int, shortAccount, shortHash } from "@/lib/format";
import { cadenceLine, formatAgo, formatNear, formatNextOpen } from "@/lib/status-format";
import type { Phase } from "@/lib/types";

const EVENT_PREVIEW = 15;

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

const EVENT_LINK = "num text-xs text-muted underline decoration-line-strong underline-offset-4 hover:text-ink";

function Stat({ label, value, hint, icon: Icon, tint }: { label: string; value: string; hint?: string; icon: LucideIcon; tint: string }) {
  return (
    <div className="flex items-start gap-4 rounded-card bg-surface p-5 shadow-card">
      <span aria-hidden className={cn("flex size-11 shrink-0 items-center justify-center rounded-2xl", tint)}><Icon className="size-5" /></span>
      <div className="min-w-0">
        <dt className="text-xs font-semibold text-muted">{label}</dt>
        <dd className="num mt-1 text-xl font-bold">{value}</dd>
        {hint && <p className="mt-0.5 text-xs text-muted">{hint}</p>}
      </div>
    </div>
  );
}

function PhaseDurations({ cadence: c }: { cadence: AgentStatus["cadence"] }) {
  const rows = [["Joining", c.join_secs], ["Sealed bids", c.commit_secs], ["Reveal", c.reveal_secs], ["Delivery", c.delivery_secs]] as const;
  const longest = Math.max(1, ...rows.map(([, secs]) => secs));
  return (
    <ol className="mt-4 space-y-4 text-sm">
      {rows.map(([name, secs]) => (
        <li key={name}>
          <div className="flex items-baseline justify-between gap-3"><span className="font-bold">{name}</span><span className="num text-muted">{secs} s</span></div>
          <div aria-hidden className="mt-1.5 h-2 overflow-hidden rounded-full bg-ground">
            <div className="h-full rounded-full bg-night" style={{ width: `${Math.max(3, (secs / longest) * 100)}%` }} />
          </div>
        </li>
      ))}
    </ol>
  );
}

function Online({ status, now }: { status: AgentStatus; now: number }) {
  const [showAllEvents, setShowAllEvents] = useState(false);
  const events = showAllEvents ? status.recent_events : status.recent_events.slice(0, EVENT_PREVIEW);
  const hiddenEvents = status.recent_events.length - EVENT_PREVIEW;
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

      <Panel aria-labelledby="events">
        <SectionTitle><span id="events">Recent events</span></SectionTitle>
        {status.recent_events.length === 0 ? (
          <p className="text-sm text-muted">No events yet. Rounds opening, bids and settlements appear here as the service works.</p>
        ) : (
          <>
            <ol className="space-y-1">
              {events.map((e, i) => (
                <li key={`${e.at}-${i}`} className="flex flex-col gap-1.5 rounded-2xl px-3 py-3 text-sm odd:bg-ground/60 sm:flex-row sm:flex-wrap sm:items-baseline sm:gap-x-3">
                  <span className="flex items-baseline gap-3">
                    <time dateTime={e.at} className="num w-12 shrink-0 text-xs text-muted">{formatClock(Date.parse(e.at))}</time>
                    <Chip tone="info">{e.kind.replace(/_/g, " ")}</Chip>
                  </span>
                  <span className="min-w-0 sm:flex-1">
                    {e.message}
                    {e.round_id !== null && <> <Link className={linkClass} href={`/rounds/${e.round_id}`}>round #{e.round_id}</Link></>}
                    {e.account && <> <a className={EVENT_LINK} href={accountUrl(e.account)} target="_blank" rel="noreferrer">{shortAccount(e.account)}</a></>}
                  </span>
                  {e.tx && <a className={EVENT_LINK} href={txUrl(e.tx)} target="_blank" rel="noreferrer">{shortHash(e.tx)}</a>}
                </li>
              ))}
            </ol>
            {hiddenEvents > 0 && (
              <button
                type="button"
                aria-expanded={showAllEvents}
                onClick={() => setShowAllEvents((v) => !v)}
                className={`${linkClass} mt-3 inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold`}
              >
                {showAllEvents ? "Show latest 15 only" : `Show all ${status.recent_events.length} events`}
                <ChevronDown className={`size-4 transition-transform ${showAllEvents ? "rotate-180" : ""}`} aria-hidden />
              </button>
            )}
          </>
        )}
      </Panel>
    </>
  );
}
