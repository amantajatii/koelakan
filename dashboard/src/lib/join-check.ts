import { derivePhase } from "./phase";
import { rupiah } from "./format";
import type { Balance, Item, Policy, RoundView } from "./types";

export interface JoinInput {
  round: RoundView | null;
  item: Item | undefined;
  qty: number;
  policy: Policy | null;
  balance: Balance | null;
  /** tIDR already counted against this week's budget. */
  spent: bigint | null;
  nowMs: number;
  account: string;
}

export interface JoinProblem {
  code:
    | "no_round"
    | "not_open"
    | "bad_qty"
    | "already_joined"
    | "full"
    | "no_policy"
    | "item_not_in_policy"
    | "ceiling_above_max"
    | "budget"
    | "balance"
    | "needs_owner";
  message: string;
}

export const MAX_PARTICIPANTS = 50;

/** Mirror of the checks in `join_round` (RULES §3, §5.2), returning every reason a join would fail. */
export function checkJoin(input: JoinInput): JoinProblem[] {
  const { round, policy, balance, qty, nowMs, account } = input;
  if (round === null) return [{ code: "no_round", message: "Pick a round that is still open." }];
  const problems: JoinProblem[] = [];
  const add = (code: JoinProblem["code"], message: string): void => {
    problems.push({ code, message });
  };

  if (derivePhase(round, nowMs) !== "Join") add("not_open", "This round is no longer accepting joins.");
  if (!Number.isInteger(qty) || qty < 1) add("bad_qty", "Quantity must be at least 1.");
  if (round.participants.some((p) => p.account_id === account)) add("already_joined", "This account has already joined this round.");
  if (round.participants.length >= MAX_PARTICIPANTS) add("full", "Round is full (max 50 warungs).");

  if (policy === null) {
    add("no_policy", 'No policy yet. Set one first in "Set your policy".');
    return problems;
  }
  const max = policy.max_price[round.item];
  if (max === undefined) {
    add("item_not_in_policy", "This item is not in your policy.");
  } else if (BigInt(round.ceiling_price) > BigInt(max)) {
    add("ceiling_above_max", `The round max price ${rupiah(round.ceiling_price)} is above your limit ${rupiah(max)}.`);
  }
  if (!policy.auto_join) add("needs_owner", "auto_join is off: only the full-access key can join; the restricted key is rejected.");

  if (Number.isInteger(qty) && qty >= 1) {
    const cost = BigInt(round.ceiling_price) * BigInt(qty);
    if (input.spent !== null && input.spent + cost > BigInt(policy.weekly_budget)) {
      add("budget", `Weekly budget exceeded: spent ${rupiah(input.spent)} + ${rupiah(cost)} > ${rupiah(policy.weekly_budget)}.`);
    }
    if (balance !== null && BigInt(balance.available) < cost) {
      add("balance", `Available balance ${rupiah(balance.available)} is less than the ${rupiah(cost)} that must be locked.`);
    }
  }
  return problems;
}
