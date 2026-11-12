import type { Bid, Item, RoundView } from "./types";

export const isSettled = (r: RoundView): boolean => r.state === "Settled" || r.state === "Closed";

/** (ref_price - clearing_price) x total_qty, as in RULES §5.1. Zero when nothing cleared. */
export function savingOf(r: RoundView): bigint {
  if (r.saving !== null) return BigInt(r.saving);
  if (r.clearing_price === null) return 0n;
  return (BigInt(r.ref_price) - BigInt(r.clearing_price)) * BigInt(r.total_qty);
}

/** Saving as a share of the PIHPS value of the lot (0-100). */
export function savingPercent(r: RoundView): number {
  if (r.clearing_price === null) return 0;
  const ref = Number(r.ref_price);
  return ref === 0 ? 0 : ((ref - Number(r.clearing_price)) / ref) * 100;
}

export interface Aggregate {
  rounds: number;
  settledRounds: number;
  failedRounds: number;
  liveRounds: number;
  totalQty: number;
  totalSaving: bigint;
  /** Quantity-weighted average discount versus PIHPS across settled rounds (0-100). */
  avgPercentBelow: number;
  participations: number;
  forfeited: bigint;
}

export function aggregate(rounds: readonly RoundView[]): Aggregate {
  const settled = rounds.filter(isSettled);
  const refValue = settled.reduce((a, r) => a + BigInt(r.ref_price) * BigInt(r.total_qty), 0n);
  const totalSaving = settled.reduce((a, r) => a + savingOf(r), 0n);
  const avg = refValue === 0n ? 0 : Number((totalSaving * 10_000n) / refValue) / 100;
  return {
    rounds: rounds.length,
    settledRounds: settled.length,
    failedRounds: rounds.filter((r) => r.state === "Failed").length,
    liveRounds: rounds.filter((r) => r.state === "Active").length,
    totalQty: settled.reduce((a, r) => a + r.total_qty, 0),
    totalSaving,
    avgPercentBelow: avg,
    participations: rounds.reduce((a, r) => a + r.participants.length, 0),
    forfeited: rounds.reduce((a, r) => a + forfeitedBond(r), 0n),
  };
}

/** Bids that never revealed forfeit their bond to buyers (RULES §5.5). */
export const forfeitedBids = (r: RoundView): Bid[] => r.bids.filter((b) => b.revealed_price === null);

export const forfeitedBond = (r: RoundView): bigint =>
  isSettled(r) || r.state === "Failed" ? forfeitedBids(r).reduce((a, b) => a + BigInt(b.bond), 0n) : 0n;

/** Integer pro-rata split; dust goes to the largest qty (earliest on ties), as in the contract. */
export function proRataShares(total: bigint, qtys: readonly bigint[]): bigint[] {
  const totalQty = qtys.reduce((a, b) => a + b, 0n);
  if (totalQty === 0n) return qtys.map(() => 0n);
  const shares = qtys.map((q) => (total * q) / totalQty);
  const rest = total - shares.reduce((a, b) => a + b, 0n);
  if (rest === 0n) return shares;
  const best = qtys.reduce((bi, q, i) => (q > (qtys[bi] ?? 0n) ? i : bi), 0);
  return shares.map((s, i) => (i === best ? s + rest : s));
}

export const winnerBid = (r: RoundView): Bid | null => (r.winner === null ? null : (r.bids[r.winner] ?? null));

export const itemOf = (items: readonly Item[], id: string): Item | undefined => items.find((i) => i.id === id);

/** Percent the PIHPS price sits above HET (positive means the market is above the official ceiling). */
export function aboveHetPercent(item: Item): number | null {
  if (item.het === null) return null;
  return ((Number(item.ref_price) - Number(item.het)) / Number(item.het)) * 100;
}
