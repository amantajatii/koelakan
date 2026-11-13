/** Read-only helpers over market state: balance view, saving, and the conservation invariant. */
import { balanceOf, heldOf } from "./ledger.js";
import type { AccountId, MarketState, Round } from "./types.js";

export function getBalance(s: MarketState, a: AccountId): { available: bigint; held: bigint } {
  return { available: balanceOf(s, a), held: heldOf(s, a) };
}

export function saving(r: Round): bigint | null {
  return r.clearingPrice === null ? null : (r.refPrice - r.clearingPrice) * r.totalQty;
}

/** Conservation invariant: tokenHeld == sum(available) + sum(held in rounds). */
export function checkInvariant(s: MarketState): void {
  const avail = Object.values(s.balances).reduce((a, b) => a + b, 0n);
  let inRounds = 0n;
  for (const r of s.rounds) {
    inRounds += r.participants.reduce((a, p) => a + p.held, 0n);
    inRounds += r.bids.reduce((a, b) => a + b.bondHeld, 0n);
  }
  const heldMap = Object.values(s.held).reduce((a, b) => a + b, 0n);
  if (heldMap !== inRounds) throw new Error("held map out of sync");
  if (s.tokenHeld !== avail + inRounds) throw new Error("conservation invariant broken");
}
