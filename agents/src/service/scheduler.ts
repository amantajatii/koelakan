/** Pure scheduling decisions: which round to open, which to settle/finalize, who acts. No I/O. */
import { mulberry32 } from "../sim-bridge.js";
import type { ItemView, RoundView } from "../chain/views.js";
import type { SchedulerState } from "./state.js";

const NS_PER_MS = 1_000_000;
const MS_PER_MIN = 60_000;

const isTerminal = (r: RoundView): boolean => r.phase === "Failed" || r.phase === "Closed";
export const activeRounds = (rounds: readonly RoundView[]): RoundView[] => rounds.filter((r) => !isTerminal(r));

export type AdminAction = "settle" | "finalize";

/** Settle/finalize are permissionless and fully determined by the derived phase (incl. early fail). */
export function adminAction(r: RoundView): AdminAction | null {
  if (r.phase === "ReadyToSettle") return "settle";
  if (r.phase === "AwaitingFinalize") return "finalize";
  return null;
}

/** Latest known open time in ms: persisted value or any round seen on chain (e.g. opened from the dashboard). */
export function lastOpenMs(sched: SchedulerState, rounds: readonly RoundView[]): number | null {
  const seen = rounds.map((r) => Math.floor(r.opened_at / NS_PER_MS));
  const all = [...seen, ...(sched.last_open_at_ms === null ? [] : [sched.last_open_at_ms])];
  return all.length === 0 ? null : Math.max(...all);
}

export const nextOpenAtMs = (lastMs: number | null, everyMin: number, nowMs: number): number =>
  lastMs === null ? nowMs : lastMs + everyMin * MS_PER_MIN;

export interface OpenPlan {
  readonly item: ItemView;
  readonly nextRotation: number;
}

export interface OpenInput {
  readonly nowMs: number;
  readonly everyMin: number;
  readonly rounds: readonly RoundView[];
  readonly items: readonly ItemView[];
  readonly sched: SchedulerState;
}

/** Rotates items; at most one active round per item; one new round per cadence slot. */
export function planOpen(i: OpenInput): OpenPlan | null {
  const items = [...i.items].sort((a, b) => a.id.localeCompare(b.id));
  if (items.length === 0) return null;
  if (i.nowMs < nextOpenAtMs(lastOpenMs(i.sched, i.rounds), i.everyMin, i.nowMs)) return null;
  const busy = new Set(activeRounds(i.rounds).map((r) => r.item));
  for (let k = 0; k < items.length; k += 1) {
    const idx = (i.sched.rotation + k) % items.length;
    const item = items[idx] as ItemView;
    if (!busy.has(item.id)) return { item, nextRotation: idx + 1 };
  }
  return null;
}

/** First round id that may still be active: skips the contiguous terminal prefix. */
export function advanceScan(rounds: readonly RoundView[], scanFrom: number): number {
  const sorted = [...rounds].sort((a, b) => a.id - b.id);
  let cursor = scanFrom;
  for (const r of sorted) {
    if (r.id !== cursor || !isTerminal(r)) break;
    cursor += 1;
  }
  return cursor;
}

// Seeded, deterministic randomness: restarts make the same choices.
const hashStr = (s: string): number => [...s].reduce((h, c) => Math.imul(h ^ c.charCodeAt(0), 16777619) >>> 0, 2166136261);
const rngFor = (seed: number, roundId: number, salt: string): (() => number) => mulberry32(seed ^ Math.imul(roundId + 1, 2654435761) ^ hashStr(salt));

function shuffled<T>(items: readonly T[], rand: () => number): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j] as T, out[i] as T];
  }
  return out;
}

/** A seeded-random subset of `min..max` candidates for this round. */
export function pickSubset<T>(seed: number, roundId: number, salt: string, candidates: readonly T[], min: number, max: number): T[] {
  const rand = rngFor(seed, roundId, salt);
  const want = min + Math.floor(rand() * (max - min + 1));
  return shuffled(candidates, rand).slice(0, Math.min(want, candidates.length));
}

/** True with probability `prob`, stable for (round, account). */
export const rollForget = (seed: number, roundId: number, account: string, prob: number): boolean =>
  rngFor(seed, roundId, `forget:${account}`)() < prob;
