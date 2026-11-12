/** Pure decision logic for warung and grosir agents (no I/O). */
import {
  FORGETFUL_GROSIR, SEED, buildPopulation, quote,
  type GrosirProfile, type WarungProfile,
} from "./sim-bridge.js";
import type { PolicyJson } from "./protocol.js";

export interface Population {
  readonly warungs: readonly WarungProfile[];
  readonly grosirs: readonly GrosirProfile[];
}

export const population = (seed: number = SEED): Population => buildPopulation(seed);

export function warungQty(pop: Population, short: string, item: string): bigint {
  return pop.warungs.find((w) => w.id === short)?.qty[item] ?? 0n;
}

export function grosirQuote(pop: Population, short: string, item: string): bigint {
  const g = pop.grosirs.find((x) => x.id === short);
  return g === undefined ? 0n : quote(g, item);
}

/** This grosir commits but never reveals (forfeit path). */
export const neverReveals = (short: string): boolean => short === FORGETFUL_GROSIR;

export type JoinDecision =
  | { readonly action: "join"; readonly qty: bigint }
  | { readonly action: "skip"; readonly reason: string };

export interface JoinInput {
  readonly account: string;
  readonly phase: string;
  readonly item: string;
  readonly ceiling: bigint;
  readonly participants: readonly string[];
  readonly maxParticipants: number;
  readonly wantedQty: bigint;
  readonly policy: PolicyJson | null;
  readonly available: bigint;
  readonly spent: bigint;
}

const skip = (reason: string): JoinDecision => ({ action: "skip", reason });

/** Mirrors the contract's join_round checks, clamping qty to what is affordable. */
export function decideJoin(i: JoinInput): JoinDecision {
  if (i.phase !== "Join") return skip(`round is in phase ${i.phase}`);
  if (i.wantedQty < 1n) return skip("warung does not need this item");
  if (i.policy === null) return skip("no owner policy set");
  if (!i.policy.auto_join) return skip("auto_join is off: owner must join");
  if (i.participants.includes(i.account)) return skip("already joined");
  if (i.participants.length >= i.maxParticipants) return skip("round is full");
  const max = i.policy.max_price[i.item];
  if (max === undefined) return skip("item not in owner policy");
  if (i.ceiling > BigInt(max)) return skip(`ceiling ${i.ceiling} above owner max_price ${max}`);
  const budgetLeft = BigInt(i.policy.weekly_budget) - i.spent;
  const byBudget = budgetLeft / i.ceiling;
  const byBalance = i.available / i.ceiling;
  const qty = [i.wantedQty, byBudget, byBalance].reduce((a, b) => (b < a ? b : a));
  if (qty < 1n) return skip(`cannot afford 1 unit (balance ${i.available}, budget left ${budgetLeft})`);
  return { action: "join", qty };
}

export type BidDecision =
  | { readonly action: "commit"; readonly price: bigint }
  | { readonly action: "skip"; readonly reason: string };

export interface BidInput {
  readonly short: string;
  readonly price: bigint;
  readonly ceiling: bigint;
  readonly bond: bigint;
  readonly wallet: bigint;
}

/** Sim strategy: bid only if price <= ceiling and the bond is affordable. The forgetful grosir always commits. */
export function decideBid(i: BidInput): BidDecision {
  if (i.price < 1n) return { action: "skip", reason: "no quote for this item" };
  if (i.price > i.ceiling && !neverReveals(i.short)) {
    return { action: "skip", reason: `quote ${i.price} above ceiling ${i.ceiling}` };
  }
  if (i.wallet < i.bond) return { action: "skip", reason: `wallet ${i.wallet} below bond ${i.bond}` };
  return { action: "commit", price: i.price };
}

/** One warung stays silent so finalize's default-accept path runs: the last participant. */
export function pickSilent(participants: readonly string[]): string | null {
  return participants.length === 0 ? null : (participants[participants.length - 1] ?? null);
}
