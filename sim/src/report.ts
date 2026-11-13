/** Report shapes for a simulated run (serialised to sim/out/run.json) and the per-round report builder. */
import { proRataShares, saving, type Round } from "./engine.js";

export interface BidReport {
  seller: string;
  bond: bigint;
  revealedPrice: bigint | null;
  valid: boolean;
}

export interface RoundReport {
  round: number;
  item: string;
  refPrice: bigint;
  ceilingPrice: bigint;
  participants: number;
  rejectedJoins: { account: string; reason: string }[];
  totalQty: bigint;
  state: string;
  bids: BidReport[];
  winner: string | null;
  clearingPrice: bigint | null;
  saving: bigint | null;
  forfeited: bigint;
  forfeitShares: { account: string; amount: bigint }[];
  disputes: { account: string; refunded: boolean }[];
}

export interface RunReport {
  seed: number;
  rounds: RoundReport[];
  totalIn: bigint;
  totalOut: bigint;
  conserved: boolean;
}

export function buildRoundReport(roundId: number, before: Round, after: Round, rejected: RoundReport["rejectedJoins"], disputes: RoundReport["disputes"]): RoundReport {
  const unrevealed = after.bids.filter((b) => b.revealedPrice === null);
  const forfeited = unrevealed.reduce((a, b) => a + b.bond, 0n);
  const shares = forfeited > 0n ? proRataShares(forfeited, after.participants.map((p) => p.qty)) : [];
  return {
    round: roundId,
    item: after.item,
    refPrice: after.refPrice,
    ceilingPrice: after.ceilingPrice,
    participants: before.participants.length,
    rejectedJoins: rejected,
    totalQty: after.totalQty,
    state: after.state,
    bids: after.bids.map((b) => ({ seller: b.sellerId, bond: b.bond, revealedPrice: b.revealedPrice, valid: b.valid })),
    winner: after.winner === null ? null : (after.bids[after.winner]?.sellerId ?? null),
    clearingPrice: after.clearingPrice,
    saving: saving(after),
    forfeited,
    forfeitShares: after.participants.map((p, i) => ({ account: p.accountId, amount: shares[i] ?? 0n })).filter(() => forfeited > 0n),
    disputes,
  };
}
