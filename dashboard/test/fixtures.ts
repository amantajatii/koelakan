import type { Item, RoundView } from "@/lib/types";

const NS = 1_000_000n;
export const T0_MS = 1_794_471_466_197;
/** Nanosecond string for T0 plus `sec` seconds. */
export const ns = (sec: number): string => (BigInt(T0_MS) * NS + BigInt(sec) * 1_000_000_000n).toString();
export const msAt = (sec: number): number => T0_MS + sec * 1000;

export const BERAS: Item = {
  id: "beras-medium", name: "Beras medium (tipe II)", unit: "kg", ref_price: "16650", het: "13500", source: "PIHPS Nasional", as_of: "2026-11-11",
};

export function makeRound(over: Partial<RoundView> = {}): RoundView {
  return {
    id: 1, item: "beras-medium", ref_price: "16650", ceiling_price: "16650", min_total_qty: 100, total_qty: 40,
    opener: "koordinator.koelakan.testnet",
    opened_at: ns(0), join_deadline: ns(120), commit_deadline: ns(180), reveal_deadline: ns(240),
    delivery_deadline: ns(360), arbiter_deadline: ns(480),
    state: "Active",
    participants: [
      { account_id: "warung-01.koelakan.testnet", qty: 10, week: 1, held: "166500", delivery: "Pending" },
      { account_id: "warung-02.koelakan.testnet", qty: 30, week: 1, held: "499500", delivery: "Pending" },
    ],
    bids: [], winner: null, clearing_price: null, phase: "Join", saving: null,
    ...over,
  };
}

/** A closed round with one winner, one losing valid bid and one seller that never revealed. */
export function closedRound(): RoundView {
  return makeRound({
    state: "Closed", phase: "Closed", total_qty: 40, clearing_price: "12000", saving: "186000",
    winner: 0,
    bids: [
      { seller_id: "grosir-1.koelakan.testnet", hash: "aa", bond: "1000", bond_held: "0", revealed_price: "12000", valid: true },
      { seller_id: "grosir-2.koelakan.testnet", hash: "bb", bond: "1000", bond_held: "0", revealed_price: "13000", valid: true },
      { seller_id: "grosir-5.koelakan.testnet", hash: "cc", bond: "1000", bond_held: "0", revealed_price: null, valid: false },
    ],
    participants: [
      { account_id: "warung-01.koelakan.testnet", qty: 10, week: 1, held: "0", delivery: "Confirmed" },
      { account_id: "warung-02.koelakan.testnet", qty: 30, week: 1, held: "0", delivery: "Accepted" },
    ],
  });
}
