/** Typed read-only access to the market and token contracts. */
import type { Provider } from "near-api-js";
import { VIEW_RETRY, isNotFoundError, withRetry } from "./provider.js";
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

export type AccessKeyInfo =
  | { readonly kind: "full" }
  | { readonly kind: "function-call"; readonly receiver: string; readonly methods: readonly string[]; readonly allowance: bigint | null };

/** Accepts both the RPC shape `{FunctionCall:{...}}` and the string "FullAccess". */
function describeAccessKey(permission: unknown): AccessKeyInfo {
  if (permission === "FullAccess") return { kind: "full" };
  const fc = (permission as { FunctionCall?: { receiver_id: string; method_names: string[]; allowance: string | bigint | null } } | null)?.FunctionCall;
  if (fc === undefined) return { kind: "full" };
  return {
    kind: "function-call", receiver: fc.receiver_id, methods: fc.method_names,
    allowance: fc.allowance === null || fc.allowance === undefined ? null : BigInt(fc.allowance),
  };
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

  listRounds(from: number, limit = 50): Promise<RoundView[]> {
    return this.view<RoundView[]>(this.market, "list_rounds", { from, limit });
  }

  /** Spendable NEAR (yocto) of an account; 0n when the account does not exist. */
  async nearBalance(account: string): Promise<bigint> {
    try {
      return (await withRetry(() => this.provider.viewAccount({ accountId: account }), VIEW_RETRY)).amount as bigint;
    } catch (e) {
      if (isNotFoundError(e)) return 0n;
      throw e;
    }
  }

  /** The access key if it exists on the account, else null. */
  async accessKey(account: string, publicKey: string): Promise<AccessKeyInfo | null> {
    try {
      const k = (await withRetry(() => this.provider.viewAccessKey({ accountId: account, publicKey }), VIEW_RETRY)) as unknown as {
        permission: unknown;
      };
      return describeAccessKey(k.permission);
    } catch (e) {
      if (isNotFoundError(e)) return null;
      throw e;
    }
  }

  async tokenBalance(account: string): Promise<bigint> {
    return BigInt(await this.view<string>(this.tidr, "ft_balance_of", { account_id: account }));
  }
}
