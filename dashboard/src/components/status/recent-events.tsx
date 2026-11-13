"use client";

import Link from "next/link";
import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { Chip } from "@/components/ui/chip";
import { Panel, SectionTitle, linkClass } from "@/components/ui/panel";
import type { AgentStatus } from "@/lib/agent-types";
import { accountUrl, txUrl } from "@/lib/config";
import { formatClock, shortAccount, shortHash } from "@/lib/format";

const EVENT_PREVIEW = 15;
const EVENT_LINK = "num text-xs text-muted underline decoration-line-strong underline-offset-4 hover:text-ink";

/** The service's latest events, newest first, with the first 15 shown until expanded. */
export function RecentEvents({ events: all }: { events: AgentStatus["recent_events"] }) {
  const [showAllEvents, setShowAllEvents] = useState(false);
  const events = showAllEvents ? all : all.slice(0, EVENT_PREVIEW);
  const hiddenEvents = all.length - EVENT_PREVIEW;
  return (
    <Panel aria-labelledby="events">
      <SectionTitle><span id="events">Recent events</span></SectionTitle>
      {all.length === 0 ? (
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
              {showAllEvents ? "Show latest 15 only" : `Show all ${all.length} events`}
              <ChevronDown className={`size-4 transition-transform ${showAllEvents ? "rotate-180" : ""}`} aria-hidden />
            </button>
          )}
        </>
      )}
    </Panel>
  );
}
