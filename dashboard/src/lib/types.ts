/** Shapes returned by the market and tidr view methods (see contracts/market/src/lib.rs). */

export type U128 = string;

export interface Item {
  id: string;
  name: string;
  unit: string;
  ref_price: U128;
  het: U128 | null;
  source: string;
  as_of: string;
}

export interface Policy {
  max_price: Record<string, U128>;
  weekly_budget: U128;
  auto_join: boolean;
}

export type RoundState = "Active" | "Failed" | "Settled" | "Closed";

export type Phase =
  | "Join"
  | "Commit"
  | "Reveal"
  | "ReadyToSettle"
  | "Delivery"
  | "AwaitingFinalize"
  | "Failed"
  | "Closed";

export type Delivery =
  | "Pending"
  | "Confirmed"
  | "Disputed"
  | "Accepted"
  | "DefaultRefunded"
  | { Resolved: { refunded: boolean } };

export interface Participant {
  account_id: string;
  qty: number;
  week: number;
  held: U128;
  delivery: Delivery;
}

export interface Bid {
  seller_id: string;
  hash: string;
  bond: U128;
  bond_held: U128;
  revealed_price: U128 | null;
  valid: boolean;
}

/** Timestamps are nanoseconds. They exceed 2^53, so the RPC layer keeps them as decimal strings. */
export interface RoundView {
  id: number;
  item: string;
  ref_price: U128;
  ceiling_price: U128;
  min_total_qty: number;
  total_qty: number;
  opener: string;
  opened_at: string;
  join_deadline: string;
  commit_deadline: string;
  reveal_deadline: string;
  delivery_deadline: string;
  arbiter_deadline: string;
  state: RoundState;
  participants: Participant[];
  bids: Bid[];
  winner: number | null;
  clearing_price: U128 | null;
  phase: Phase;
  saving: U128 | null;
}

export interface Balance {
  available: U128;
  held: U128;
}

export interface MarketConfig {
  admin: string;
  arbiter: string;
  token: string;
  rounds: number;
  token_held: U128;
}
