import type { AccountId, MarketState, Round } from "./types.js";
import { ContractPanic } from "./util.js";

/** Pure balance helpers. Each returns a new state. */

export function balanceOf(s: MarketState, a: AccountId): bigint {
  return s.balances[a] ?? 0n;
}

export function heldOf(s: MarketState, a: AccountId): bigint {
  return s.held[a] ?? 0n;
}

export function spentKey(a: AccountId, week: bigint): string {
  return `${a}|${week}`;
}

export function spentOf(s: MarketState, a: AccountId, week: bigint): bigint {
  return s.spent[spentKey(a, week)] ?? 0n;
}

export function setBalance(s: MarketState, a: AccountId, amt: bigint): MarketState {
  return { ...s, balances: { ...s.balances, [a]: amt } };
}

export function credit(s: MarketState, a: AccountId, amt: bigint): MarketState {
  return amt === 0n ? s : setBalance(s, a, balanceOf(s, a) + amt);
}

export function addHeld(s: MarketState, a: AccountId, amt: bigint): MarketState {
  return { ...s, held: { ...s.held, [a]: heldOf(s, a) + amt } };
}

export function subHeld(s: MarketState, a: AccountId, amt: bigint): MarketState {
  if (amt === 0n) return s;
  const h = heldOf(s, a);
  if (h < amt) throw new ContractPanic("attempt to subtract with overflow");
  return { ...s, held: { ...s.held, [a]: h - amt } };
}

export function addSpent(s: MarketState, a: AccountId, week: bigint, amt: bigint): MarketState {
  return { ...s, spent: { ...s.spent, [spentKey(a, week)]: spentOf(s, a, week) + amt } };
}

/** Subtracts a refund from the week's counter, saturating at 0. */
export function unspend(s: MarketState, a: AccountId, week: bigint, amt: bigint): MarketState {
  if (amt === 0n) return s;
  const cur = spentOf(s, a, week);
  const next = cur > amt ? cur - amt : 0n;
  return { ...s, spent: { ...s.spent, [spentKey(a, week)]: next } };
}

export function getRound(s: MarketState, id: number): Round {
  const r = s.rounds[id];
  if (r === undefined) throw new ContractPanic("no such round");
  return r;
}

export function putRound(s: MarketState, r: Round): MarketState {
  return { ...s, rounds: s.rounds.map((x) => (x.id === r.id ? r : x)) };
}
