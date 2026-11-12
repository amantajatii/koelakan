/** Typed read-only access to the market and token contracts. */
import type { Provider } from "near-api-js";
import { VIEW_RETRY, withRetry } from "./provider.js";
import type { PolicyJson } from "../protocol.js";

export type PhaseName =
  | "Join" | "Commit" | "Reveal" | "ReadyToSettle" | "Delivery" | "AwaitingFinalize" | "Failed" | "Closed";

export interface ParticipantView {
  account_id: string;
  qty: number;
  week: number;
  held: string;
  delivery: string | Record<string, unknown>;
}

export interface BidView {
  seller_id: string;
  hash: string;
  bond: string;
  bond_held: string;
  revealed_price: string | null;
  valid: boolean;
}

export interface RoundView {
  id: number;
  item: string;
  ref_price: string;
  ceiling_price: string;
  min_total_qty: number;
  total_qty: number;
  opener: string;
  opened_at: number;
  join_deadline: number;
  commit_deadline: number;
  reveal_deadline: number;
  delivery_deadline: number;
  arbiter_deadline: number;
  state: string;
  participants: ParticipantView[];
  bids: BidView[];
  winner: number | null;
  clearing_price: string | null;
  phase: PhaseName;
  saving: string | null;
}

export interface ItemView {
  id: string;
  name: string;
  unit: string;
  ref_price: string;
  het: string | null;
  source: string;
  as_of: string;
}

export interface BalanceView {
  available: string;
  held: string;
}

export class Views {
  constructor(
    private readonly provider: Provider,
    readonly market: string,
    readonly tidr: string,
  ) {}

  private view<T>(contractId: string, method: string, args: Record<string, unknown> = {}): Promise<T> {
    return withRetry(async () => {
      const r = await this.provider.callFunction({ contractId, method, args, blockQuery: { finality: "optimistic" } });
      return r as T;
    }, VIEW_RETRY);
  }

  round(id: number): Promise<RoundView | null> {
    return this.view<RoundView | null>(this.market, "get_round", { round_id: id });
  }

  items(): Promise<ItemView[]> {
    return this.view<ItemView[]>(this.market, "get_items");
  }

  balance(account: string): Promise<BalanceView> {
    return this.view<BalanceView>(this.market, "get_balance", { account_id: account });
  }

  policy(account: string): Promise<PolicyJson | null> {
    return this.view<PolicyJson | null>(this.market, "get_policy", { account_id: account });
  }

  async spent(account: string): Promise<bigint> {
    return BigInt(await this.view<string>(this.market, "get_spent", { account_id: account }));
  }

  async requiredBond(roundId: number): Promise<bigint> {
    return BigInt(await this.view<string>(this.market, "get_required_bond", { round_id: roundId }));
  }

  async roundCount(): Promise<number> {
    const c = await this.view<{ rounds: number }>(this.market, "get_config");
    return c.rounds;
  }

  async tokenBalance(account: string): Promise<bigint> {
    return BigInt(await this.view<string>(this.tidr, "ft_balance_of", { account_id: account }));
  }
}
