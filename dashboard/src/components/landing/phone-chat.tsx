"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CheckCheck, RotateCcw } from "lucide-react";
import { LogoMark } from "@/components/layout/logo";
import { cn } from "@/components/ui/cn";
import { useChatPlayback, useReducedMotion } from "@/hooks/use-chat-playback";
import { formatDateTime, percent, rupiah } from "@/lib/format";
import type { LandingBeat, LandingChat } from "@/lib/landing-chat";

const COUNT_MS = 950;

/** The winning price counts down from the PIHPS price once its card is on screen; final text is exact. */
function CountdownPrice({ from, to, active }: { from: bigint; to: bigint; active: boolean }) {
  const reduced = useReducedMotion();
  const [value, setValue] = useState<bigint | null>(null);
  useEffect(() => {
    if (!active || reduced) return;
    let frame = 0;
    const start = performance.now();
    const tick = (now: number): void => {
      const t = Math.min(1, (now - start) / COUNT_MS);
      const eased = 1 - Math.pow(1 - t, 4);
      setValue(from - ((from - to) * BigInt(Math.round(eased * 1000))) / 1000n);
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [active, reduced, from, to]);
  return <>{rupiah(active && !reduced && value !== null ? value : to)}</>;
}

function Beat({ beat, on }: { beat: LandingBeat; on: boolean }) {
  if (beat.kind === "result") {
    return (
      <li className="beat on-dark rounded-card bg-night p-4 text-white" data-on={on} data-kind="result" data-side="agent">
        <p className="text-xs font-semibold text-night-muted">Winning bid, {beat.winner}</p>
        <p className="num mt-1 text-[2rem] font-extrabold leading-none tracking-[-0.03em]">
          <CountdownPrice from={BigInt(beat.refPrice)} to={BigInt(beat.paid)} active={on} />
          <span className="text-sm font-semibold text-night-muted">/{beat.unit}</span>
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="num rounded-xl bg-night-raised px-3 py-1.5 text-xs text-night-muted">PIHPS <s>{rupiah(beat.refPrice)}</s></span>
          <span className="pill-wipe num rounded-full bg-brand px-3 py-1.5 text-xs font-bold text-ink">{percent(beat.percentBelow)} below PIHPS</span>
        </div>
      </li>
    );
  }
  const owner = beat.kind === "owner";
  return (
    <li className={cn("beat flex", owner && "justify-end")} data-on={on} data-kind={beat.kind} data-side={owner ? "owner" : "agent"}>
      <p className={cn("max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-snug", owner ? "rounded-br-md bg-brand/45 text-ink" : "rounded-bl-md bg-surface text-ink shadow-card")}>
        {beat.text}
        {owner && <CheckCheck aria-hidden className="ml-1.5 inline size-3.5 text-brand-ink" />}
      </p>
    </li>
  );
}

function Typing() {
  return (
    <li aria-hidden className="flex">
      <span className="flex items-center gap-1 rounded-2xl rounded-bl-md bg-surface px-3.5 py-3 shadow-card">
        <span className="typing-dot size-1.5 rounded-full bg-muted" />
        <span className="typing-dot size-1.5 rounded-full bg-muted" />
        <span className="typing-dot size-1.5 rounded-full bg-muted" />
      </span>
    </li>
  );
}

/** Navy phone replaying the latest real settled round as the agent's chat with the owner. */
export function PhoneChat({ chat, className }: { chat: LandingChat | null; className?: string }) {
  const stageRef = useRef<HTMLDivElement>(null);
  const beats = useMemo(() => chat?.beats ?? [], [chat]);
  const isAgent = useCallback((i: number) => beats[i]?.kind !== "owner", [beats]);
  const isResult = useCallback((i: number) => beats[i]?.kind === "result", [beats]);
  const { shown, typing, ready, done, replay } = useChatPlayback(beats.length, stageRef, isAgent, isResult);

  return (
    <figure className={cn("relative", className)}>
      <div className="on-dark mx-auto flex h-full max-w-[31rem] flex-col rounded-[2.75rem] bg-night p-3 shadow-[0_30px_60px_-30px_rgba(31,31,46,0.55)]">
        <div className="flex items-center gap-3 px-4 pb-3 pt-4">
          <LogoMark className="size-10" onDark />
          <div className="min-w-0">
            <p className="font-bold text-white">{chat ? `${chat.warung}'s agent` : "Your agent"}</p>
            <p className="text-xs text-night-muted">{chat ? `Round #${chat.roundId} · NEAR testnet` : "NEAR testnet"}</p>
          </div>
        </div>
        <div ref={stageRef} className={cn("chat-stage flex min-h-0 flex-1 flex-col overflow-hidden rounded-[2rem] bg-ground p-3.5", ready && "chat-js")}>
          {chat === null ? (
            <p className="m-auto max-w-[16rem] text-center text-sm text-muted">The latest settled round appears here once the chain answers.</p>
          ) : (
            <>
              <p aria-hidden className="flex shrink-0 justify-center pb-3">
                <span className="num rounded-full bg-surface px-3 py-1 text-xs font-semibold text-muted shadow-card">{formatDateTime(chat.openedAt)}</span>
              </p>
              {/* Newest messages stay at the bottom; on a short screen the oldest clip off the top, as in a chat app. */}
              <div className="flex min-h-0 flex-1 flex-col justify-end overflow-hidden">
                <ol aria-hidden className="space-y-2.5">
                  {beats.map((b, i) => <Beat key={i} beat={b} on={i < shown} />)}
                  {typing && <Typing />}
                </ol>
              </div>
            </>
          )}
        </div>
      </div>
      {chat && (
        <figcaption className="mx-auto mt-4 flex max-w-[31rem] flex-wrap items-center justify-between gap-x-4 gap-y-2 px-2 text-xs text-muted">
          <span>Replayed from round #{chat.roundId}. Grosir costs are simulated.{beats.some((b) => b.kind === "owner") && " The owner's reply is generated from an on-chain confirmation."}</span>
          <button
            type="button"
            onClick={replay}
            disabled={!done}
            className="inline-flex min-h-11 items-center gap-1.5 rounded-full px-3 font-semibold text-ink transition-colors duration-150 hover:bg-surface disabled:opacity-40"
          >
            <RotateCcw aria-hidden className="size-3.5" />
            Replay
          </button>
        </figcaption>
      )}
      {chat && (
        <ol className="sr-only">
          {beats.map((b, i) => (
            <li key={i}>
              {b.kind === "result" ? `Winning bid by ${b.winner}: ${rupiah(b.paid)} per ${b.unit}, ${percent(b.percentBelow)} below the PIHPS price of ${rupiah(b.refPrice)}.` : `${b.kind === "owner" ? "Owner" : "Agent"}: ${b.text}`}
            </li>
          ))}
        </ol>
      )}
    </figure>
  );
}
