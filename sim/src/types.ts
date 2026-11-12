/** Types of the Koelakan market engine. Mirrors contracts/market/src/lib.rs. */

export type AccountId = string;

export interface Item {
  readonly id: string;
  readonly name: string;
  readonly unit: string;
  readonly refPrice: bigint;
  readonly het: bigint | null;
  readonly source: string;
  readonly asOf: string;
}

export interface Policy {
  readonly maxPrice: Readonly<Record<string, bigint>>;
  readonly weeklyBudget: bigint;
  readonly autoJoin: boolean;
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
  | "ResolvedRefunded"
  | "ResolvedPaid"
  | "Accepted"
  | "DefaultRefunded";

export interface Participant {
  readonly accountId: AccountId;
  readonly qty: bigint;
  readonly week: bigint;
  readonly held: bigint;
  readonly delivery: Delivery;
}

export interface Bid {
  readonly sellerId: AccountId;
  readonly hash: string;
  readonly bond: bigint;
  readonly bondHeld: bigint;
  readonly revealedPrice: bigint | null;
  readonly valid: boolean;
}

export interface Round {
  readonly id: number;
  readonly item: string;
  readonly refPrice: bigint;
  readonly ceilingPrice: bigint;
  readonly minTotalQty: bigint;
  readonly totalQty: bigint;
  readonly opener: AccountId;
  readonly openedAt: bigint;
  readonly joinDeadline: bigint;
  readonly commitDeadline: bigint;
  readonly revealDeadline: bigint;
  readonly deliveryDeadline: bigint;
  readonly arbiterDeadline: bigint;
  readonly state: RoundState;
  readonly participants: readonly Participant[];
  readonly bids: readonly Bid[];
  /** Index into `bids`. */
  readonly winner: number | null;
  readonly clearingPrice: bigint | null;
}

export interface MarketState {
  readonly admin: AccountId;
  readonly arbiter: AccountId;
  readonly token: AccountId;
  readonly items: Readonly<Record<string, Item>>;
  readonly policies: Readonly<Record<AccountId, Policy>>;
  readonly balances: Readonly<Record<AccountId, bigint>>;
  readonly held: Readonly<Record<AccountId, bigint>>;
  /** Key: `${account}|${week}`. */
  readonly spent: Readonly<Record<string, bigint>>;
  readonly rounds: readonly Round[];
  /** Total tIDR the market contract should own (conservation invariant). */
  readonly tokenHeld: bigint;
}

/** Call context: who calls, when (ns), and the attached yoctoNEAR. */
export interface Ctx {
  readonly caller: AccountId;
  readonly now: bigint;
  readonly yocto?: bigint;
}
