"use client";

import Link from "next/link";
import { OfflineNote } from "@/components/offline-note";
import { StatusBadge } from "@/components/status-badge";
import { PhaseBadge } from "@/components/phase-badge";
import { Panel, SectionTitle } from "@/components/ui/panel";
import { Skeleton } from "@/components/ui/states";
import { Stamp } from "@/components/ui/stamp";
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
      <div className="flex flex-wrap items-center gap-4">
        <StatusBadge />
        {checkedAt && <span className="text-xs text-ink-soft">Checked {formatClock(checkedAt)} WIB, refreshes every 15 s</span>}
      </div>
      <OfflineNote />
      {loading && <Skeleton className="h-48" />}
      {status && now > 0 && <Online status={status} now={now} />}
    </div>
  );
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-lg border-2 border-ink/80 bg-cream p-4">
      <dt className="text-xs font-semibold uppercase tracking-wider text-ink-soft">{label}</dt>
      <dd className="num mt-1 text-2xl font-semibold">{value}</dd>
      {hint && <p className="mt-0.5 text-xs text-ink-soft">{hint}</p>}
    </div>
  );
}

function Online({ status, now }: { status: AgentStatus; now: number }) {
  const c = status.cadence;
  return (
    <>
      <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Rounds open" value={cadenceLine(status)} hint={`checked every ${status.tick_secs} s`} />
        <Stat label="Next round" value={formatNextOpen(status.next_open_at, now)} hint={status.next_open_at ? formatDateTime(Date.parse(status.next_open_at)) : undefined} />
        <Stat label="Last tick" value={status.last_tick_at ? formatAgo(now - Date.parse(status.last_tick_at)) : "never"} />
        <Stat label="Delegated warungs" value={`${int(status.agents.delegated_warungs)}`} hint={`${int(status.agents.seeded_warungs)} seeded test warungs`} />
      </dl>

      <section aria-labelledby="cadence">
        <SectionTitle><span id="cadence">Round schedule</span></SectionTitle>
        <Panel>
          <p className="text-sm text-ink-soft">Each round runs through four timed phases, then delivery:</p>
          <ol className="mt-3 grid gap-2 text-sm sm:grid-cols-4">
            {([["Joining", c.join_secs], ["Sealed bids", c.commit_secs], ["Reveal", c.reveal_secs], ["Delivery", c.delivery_secs]] as const).map(([name, secs]) => (
              <li key={name} className="rounded-md border-2 border-rule bg-paper/40 px-3 py-2"><span className="block font-semibold">{name}</span><span className="num text-ink-soft">{secs} s</span></li>
            ))}
          </ol>
        </Panel>
      </section>

      <section aria-labelledby="active">
        <SectionTitle><span id="active">Active rounds</span></SectionTitle>
        {status.active_rounds.length === 0 ? (
          <p className="rounded-lg border-2 border-dashed border-rule p-4 text-sm text-ink-soft">No round is running. The next one opens {formatNextOpen(status.next_open_at, now)}.</p>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {status.active_rounds.map((r) => (
              <li key={r.id}>
                <Link href={`/rounds/${r.id}`} className="flex items-center justify-between gap-3 rounded-lg border-2 border-ink/80 bg-cream p-3 hover:bg-kunyit-soft">
                  <span><strong className="font-display text-lg">Round #{r.id}</strong><span className="block text-sm text-ink-soft">{r.item}</span></span>
                  {PHASES.includes(r.phase) ? <PhaseBadge phase={r.phase as Phase} /> : <Stamp>{r.phase}</Stamp>}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="budget">
        <SectionTitle><span id="budget">Service budget</span></SectionTitle>
        <Panel>
          <p className="text-sm">
            Estimated gas spend: <strong className="num">{formatNear(status.budget.est_near_per_day)}</strong> per day. Each delegated key carries a <span className="num">{formatNear(status.service_fc_allowance_near)}</span> allowance.
          </p>
          {status.budget.low_accounts.length === 0 ? (
            <p className="mt-2 text-sm text-pandan">All service accounts have enough NEAR.</p>
          ) : (
            <div className="mt-2 text-sm">
              <p className="font-semibold text-chili">Low on NEAR:</p>
              <ul className="mt-1 flex flex-wrap gap-2">{status.budget.low_accounts.map((a) => <li key={a}><Stamp tone="bad">{shortAccount(a)}</Stamp></li>)}</ul>
            </div>
          )}
        </Panel>
      </section>

      <section aria-labelledby="events">
        <SectionTitle><span id="events">Recent events</span></SectionTitle>
        {status.recent_events.length === 0 ? (
          <p className="rounded-lg border-2 border-dashed border-rule p-4 text-sm text-ink-soft">No events yet.</p>
        ) : (
          <ol className="divide-y divide-dashed divide-rule rounded-lg border-2 border-ink/80 bg-cream">
            {status.recent_events.map((e, i) => (
              <li key={`${e.at}-${i}`} className="flex flex-wrap items-baseline gap-x-3 gap-y-1 px-4 py-2.5 text-sm">
                <time dateTime={e.at} className="num w-12 shrink-0 text-xs text-ink-soft">{formatClock(Date.parse(e.at))}</time>
                <Stamp tone="info">{e.kind.replace(/_/g, " ")}</Stamp>
                <span className="min-w-0 flex-1">
                  {e.message}
                  {e.round_id !== null && <> <Link className="underline decoration-rule underline-offset-4" href={`/rounds/${e.round_id}`}>round #{e.round_id}</Link></>}
                  {e.account && <> <a className="num text-xs text-ink-soft underline decoration-rule underline-offset-4" href={accountUrl(e.account)} target="_blank" rel="noreferrer">{shortAccount(e.account)}</a></>}
                </span>
                {e.tx && <a className="num text-xs underline underline-offset-4" href={txUrl(e.tx)} target="_blank" rel="noreferrer">{shortHash(e.tx)}</a>}
              </li>
            ))}
          </ol>
        )}
      </section>
    </>
  );
}
