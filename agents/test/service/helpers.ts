import type { RoundView } from "../../src/chain/views.js";

export function round(over: Partial<RoundView> = {}): RoundView {
  return {
    id: 1, item: "beras-medium", ref_price: "16650", ceiling_price: "16650", min_total_qty: 50, total_qty: 0,
    opener: "koordinator.x", opened_at: 0, join_deadline: 0, commit_deadline: 0, reveal_deadline: 0, delivery_deadline: 0,
    arbiter_deadline: 0, state: "Active", participants: [], bids: [], winner: null, clearing_price: null, phase: "Join", saving: null,
    ...over,
  };
}

export const item = (id: string, ref = "10000") => ({ id, name: id, unit: "kg", ref_price: ref, het: null, source: "t", as_of: "t" });
