import type { Participation } from "./owner-actions";
import { isSettled } from "./stats";
import type { Item, RoundView } from "./types";

export interface ItemSnapshot {
  item: Item;
  /** Round the figures come from; null when the item never cleared. */
  roundId: number | null;
  /** Cleared price per unit. */
  paid: string | null;
  qty: number | null;
  /** Where `qty` comes from: a settled round, or the owner's standing order when nothing has settled yet. */
  qtySource: "round" | "standing" | null;
}

/** Latest settled round per catalogue item, for the market-wide view. */
export function marketSnapshots(items: readonly Item[], rounds: readonly RoundView[]): ItemSnapshot[] {
  return items.map((item) => {
    const latest = [...rounds].reverse().find((r) => r.item === item.id && isSettled(r) && r.clearing_price !== null);
    return { item, roundId: latest?.id ?? null, paid: latest?.clearing_price ?? null, qty: latest?.total_qty ?? null, qtySource: latest ? "round" : null };
  });
}

/** One owner's most recent settled participation per item; falls back to the standing order quantity, labelled as such. */
export function ownerSnapshots(
  items: readonly Item[],
  participations: readonly Participation[],
  demand: Readonly<Record<string, number>> | null,
): ItemSnapshot[] {
  return items.map((item) => {
    const latest = participations.find((p) => p.round.item === item.id && isSettled(p.round) && p.round.clearing_price !== null);
    const standing = demand?.[item.id] ?? 0;
    if (!latest) return { item, roundId: null, paid: null, qty: standing > 0 ? standing : null, qtySource: standing > 0 ? "standing" : null };
    return { item, roundId: latest.round.id, paid: latest.round.clearing_price, qty: latest.qty, qtySource: "round" };
  });
}

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

/** Saving versus PIHPS on the owner's own settled rounds opened in the last seven days. */
export function weeklySaving(participations: readonly Participation[], nowMs: number): { saving: bigint; rounds: number } {
  let saving = 0n;
  let rounds = 0;
  for (const p of participations) {
    const r = p.round;
    if (!isSettled(r) || r.clearing_price === null) continue;
    if (nowMs - Number(BigInt(r.opened_at) / 1_000_000n) > WEEK_MS) continue;
    saving += (BigInt(r.ref_price) - BigInt(r.clearing_price)) * BigInt(p.qty);
    rounds += 1;
  }
  return { saving, rounds };
}

/** Percentage the paid price sits below the reference price (0-100); null when not computable. */
export function percentBelow(refPrice: bigint | string, paid: bigint | string | null): number | null {
  if (paid === null) return null;
  const ref = Number(refPrice);
  return ref === 0 ? null : ((ref - Number(paid)) / ref) * 100;
}
