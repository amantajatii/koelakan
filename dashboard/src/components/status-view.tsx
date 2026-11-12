"use client";

import Link from "next/link";
import { CircleCheck, Flame } from "lucide-react";
import { OfflineNote } from "@/components/offline-note";
import { PhaseBadge } from "@/components/phase-badge";
import { StatusBadge } from "@/components/status-badge";
import { Chip } from "@/components/ui/chip";
import { Panel, SectionTitle, linkClass } from "@/components/ui/panel";
import { Skeleton } from "@/components/ui/states";
import { useAgentStatus } from "@/hooks/use-agent-status";
import { useNow } from "@/hooks/use-now";
import type { AgentStatus } from "@/lib/agent-types";
import { accountUrl, txUrl } from "@/lib/config";
import { formatClock, formatDateTime, int, shortAccount, shortHash } from "@/lib/format";
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
      {loading && <div role="status" aria-label="Loading service status" className="space-y-4"><Skeleton className="h-28" /><Skeleton className="h-48" /></div>}
      {status && now > 0 && <Online status={status} now={now} />}
    </div>
  );
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="px-5 py-4 sm:px-6">
      <dt className="text-xs font-semibold text-muted">{label}</dt>
      <dd className="num mt-1 text-xl font-bold">{value}</dd>
      {hint && <p className="mt-0.5 text-xs text-muted">{hint}</p>}
    </div>
  );
}

function Online({ status, now }: { status: AgentStatus; now: number }) {
  const c = status.cadence;
  return (
    <>
      <dl className="grid divide-y divide-line overflow-hidden rounded-card border border-line bg-surface shadow-card sm:grid-cols-2 sm:divide-y-0 lg:grid-cols-4 lg:divide-x">
        <Stat label="Rounds open" value={cadenceLine(status)} hint={`checked every ${status.tick_secs} s`} />
        <Stat label="Next round" value={formatNextOpen(status.next_open_at, now)} hint={status.next_open_at ? formatDateTime(Date.parse(status.next_open_at)) : undefined} />
        <Stat label="Last tick" value={status.last_tick_at ? formatAgo(now - Date.parse(status.last_tick_at)) : "never"} />
        <Stat label="Delegated warungs" value={`${int(status.agents.delegated_warungs)}`} hint={`${int(status.agents.seeded_warungs)} seeded test warungs`} />
      </dl>

      <div className="grid items-start gap-6 lg:grid-cols-2">
        <Panel aria-labelledby="cadence">
          <SectionTitle><span id="cadence">Round schedule</span></SectionTitle>
          <p className="text-sm text-muted">Each round runs through four timed phases, then delivery:</p>
          <ol className="mt-3 divide-y divide-line text-sm">
            {([["Joining", c.join_secs], ["Sealed bids", c.commit_secs], ["Reveal", c.reveal_secs], ["Delivery", c.delivery_secs]] as const).map(([name, secs]) => (
              <li key={name} className="flex items-baseline justify-between gap-3 py-2.5"><span className="font-semibold">{name}</span><span className="num text-muted">{secs} s</span></li>
            ))}
          </ol>
        </Panel>

        <Panel aria-labelledby="budget">
          <SectionTitle><span id="budget">Service budget</span></SectionTitle>
          <p className="text-sm">
            Estimated gas spend: <strong className="num">{formatNear(status.budget.est_near_per_day)}</strong> per day. Each delegated key carries a <span className="num">{formatNear(status.service_fc_allowance_near)}</span> allowance.
          </p>
          {status.budget.low_accounts.length === 0 ? (
            <p className="mt-3 flex items-center gap-2 text-sm font-semibold text-brand-ink"><CircleCheck className="size-4" aria-hidden /> All service accounts have enough NEAR.</p>
          ) : (
            <div className="mt-3 text-sm">
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
          <ul className="divide-y divide-line">
            {status.active_rounds.map((r) => (
              <li key={r.id}>
                <Link href={`/rounds/${r.id}`} className="flex min-h-14 items-center justify-between gap-3 py-3 transition-colors duration-150 hover:bg-ground/70">
                  <span><strong className="font-bold">Round #{r.id}</strong><span className="block text-sm text-muted">{r.item}</span></span>
                  {PHASES.includes(r.phase) ? <PhaseBadge phase={r.phase as Phase} /> : <Chip>{r.phase}</Chip>}
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
          <ol className="divide-y divide-line">
            {status.recent_events.map((e, i) => (
              <li key={`${e.at}-${i}`} className="flex flex-wrap items-baseline gap-x-3 gap-y-1 py-3 text-sm">
                <time dateTime={e.at} className="num w-12 shrink-0 text-xs text-muted">{formatClock(Date.parse(e.at))}</time>
                <Chip tone="info">{e.kind.replace(/_/g, " ")}</Chip>
                <span className="min-w-0 flex-1">
                  {e.message}
                  {e.round_id !== null && <> <Link className={linkClass} href={`/rounds/${e.round_id}`}>round #{e.round_id}</Link></>}
                  {e.account && <> <a className="num text-xs text-muted underline decoration-line-strong underline-offset-4 hover:text-ink" href={accountUrl(e.account)} target="_blank" rel="noreferrer">{shortAccount(e.account)}</a></>}
                </span>
                {e.tx && <a className="num text-xs text-muted underline decoration-line-strong underline-offset-4 hover:text-ink" href={txUrl(e.tx)} target="_blank" rel="noreferrer">{shortHash(e.tx)}</a>}
              </li>
            ))}
          </ol>
        )}
      </Panel>
    </>
  );
}
