"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { Lock, Users } from "lucide-react";
import { Thread } from "@/components/chat/thread";
import { cn } from "@/components/ui/cn";
import { inputClass } from "@/components/ui/field";
import { linkClass } from "@/components/ui/panel";
import { EmptyState, ErrorNote, Skeleton } from "@/components/ui/states";
import { useLive } from "@/hooks/use-live";
import { ownerName, shortAccount } from "@/lib/format";
import { itemLabel } from "@/lib/items";
import { fetchOverview, type Overview } from "@/lib/overview";
import { itemOf } from "@/lib/stats";
import { buildRoundChat, filterByAccount } from "@/lib/wa";

const REFRESH_MS = 15_000;
const ALL = "__all__";

function Avatar({ label, active }: { label: string; active: boolean }) {
  return (
    <span aria-hidden className={cn("flex size-10 shrink-0 items-center justify-center rounded-full text-sm font-bold", active ? "bg-brand text-white" : "bg-brand-soft text-brand-ink")}>
      {label}
    </span>
  );
}

export function ChatLive({ initial }: { initial: Overview | null }) {
  const { data, error, loading, refresh } = useLive(fetchOverview, initial, REFRESH_MS);
  const params = useSearchParams();
  const requested = Number(params.get("round"));
  const [roundChoice, setRoundChoice] = useState<number | null>(Number.isInteger(requested) && params.has("round") ? requested : null);
  const requestedWarung = params.get("warung");
  const [warungChoice, setWarungChoice] = useState<string | null>(requestedWarung);

  const withParticipants = useMemo(() => (data?.rounds ?? []).filter((r) => r.participants.length > 0), [data]);
  const round = useMemo(() => {
    if (!data) return null;
    const picked = roundChoice !== null ? data.rounds.find((r) => r.id === roundChoice) : undefined;
    return picked ?? withParticipants[withParticipants.length - 1] ?? null;
  }, [data, roundChoice, withParticipants]);
  const item = data && round ? itemOf(data.items, round.item) : undefined;

  const messages = useMemo(() => (round && item ? buildRoundChat(round, item) : []), [round, item]);

  if (!data) {
    return loading ? <Skeleton className="h-[34rem]" /> : <ErrorNote message={error ?? "No response."} onRetry={refresh} />;
  }
  if (!round || !item) {
    return (
      <EmptyState title="No conversations yet">
        Chats appear once a warung has joined a round. <Link className={linkClass} href="/warung">Run your warung</Link> to start one.
      </EmptyState>
    );
  }

  const accounts = round.participants.map((p) => p.account_id).sort();
  const warung = warungChoice !== null && warungChoice !== ALL && accounts.includes(warungChoice) ? warungChoice : warungChoice === ALL ? null : (accounts[0] ?? null);
  const shown = filterByAccount(messages, warung);

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-4 lg:grid-cols-[19rem_minmax(0,1fr)]">
      <aside aria-label="Conversations" className="flex min-w-0 flex-col rounded-card border border-line bg-surface p-4 shadow-card lg:max-h-[38rem]">
        <label htmlFor="pick-round" className="mb-1.5 block text-sm font-semibold">Round</label>
        <select
          id="pick-round"
          className={cn(inputClass, "mb-4 font-semibold")}
          value={round.id}
          onChange={(e) => { setRoundChoice(Number(e.target.value)); setWarungChoice(null); }}
        >
          {withParticipants.map((r) => (
            <option key={r.id} value={r.id}>#{r.id} {itemLabel(itemOf(data.items, r.item), r.item)}</option>
          ))}
        </select>
        <p id="warung-list-label" className="mb-2 text-sm font-semibold">Warung agents</p>
        <ul aria-labelledby="warung-list-label" className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1 lg:flex-1 lg:flex-col lg:overflow-y-auto lg:overflow-x-hidden lg:pb-0">
          <li className="shrink-0">
            <button
              type="button"
              aria-pressed={warung === null}
              onClick={() => setWarungChoice(ALL)}
              className={cn("flex min-h-14 w-full items-center gap-3 rounded-2xl p-2 pr-4 text-left transition-colors duration-150", warung === null ? "bg-brand-soft" : "hover:bg-ground")}
            >
              <span aria-hidden className={cn("flex size-10 shrink-0 items-center justify-center rounded-full", warung === null ? "bg-brand text-white" : "bg-brand-soft text-brand-ink")}><Users className="size-4" /></span>
              <span className="whitespace-nowrap text-sm font-semibold">All warungs <span className="num font-medium text-muted">({accounts.length})</span></span>
            </button>
          </li>
          {accounts.map((a) => (
            <li key={a} className="shrink-0">
              <button
                type="button"
                aria-pressed={warung === a}
                onClick={() => setWarungChoice(a)}
                className={cn("flex min-h-14 w-full items-center gap-3 rounded-2xl p-2 pr-4 text-left transition-colors duration-150", warung === a ? "bg-brand-soft" : "hover:bg-ground")}
              >
                <Avatar label={shortAccount(a).slice(-2)} active={warung === a} />
                <span className="min-w-0 whitespace-nowrap">
                  <span className="num block text-sm font-semibold">{shortAccount(a)}</span>
                  <span className="block text-xs text-muted">{ownerName(a)}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
        {error && <div className="mt-3"><ErrorNote message={error} onRetry={refresh} /></div>}
      </aside>

      <section aria-label="Agent conversation" className="flex min-w-0 flex-col overflow-hidden rounded-card border border-line bg-surface shadow-card">
        <header className="flex items-center gap-3 border-b border-line px-5 py-3.5">
          <Avatar label={warung ? shortAccount(warung).slice(-2) : "All"} active />
          <div className="min-w-0">
            <h2 className="truncate font-bold leading-tight">{warung ? `Agent ${shortAccount(warung)}` : "All warung agents"}</h2>
            <p className="truncate text-xs text-muted">
              {warung ? `for ${ownerName(warung)} · ` : ""}round <span className="num">#{round.id}</span>, {itemLabel(item)}
            </p>
          </div>
          <Link href={`/rounds/${round.id}`} className={`${linkClass} ml-auto hidden shrink-0 text-sm sm:block`}>Round page</Link>
        </header>
        <div className="max-h-[32rem] min-h-80 flex-1 overflow-y-auto bg-ground/70 p-4 sm:p-5" tabIndex={0}>
          {shown.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted">No messages for this selection yet.</p>
          ) : (
            <Thread messages={shown} showSender={warung === null} />
          )}
        </div>
        <footer className="flex items-start gap-2 border-t border-line px-5 py-3 text-xs text-muted">
          <Lock className="mt-0.5 size-3.5 shrink-0" aria-hidden />
          <p>
            Read-only. Agents act within the policy you set in the contract. Messages are generated from on-chain round data, not stored on a server; the contract does not record a time for each event, so message times are estimates inside the real phase windows.
          </p>
        </footer>
      </section>
    </div>
  );
}
