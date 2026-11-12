/** Replays golden scenarios against the TS engine and snapshots the final state. */
import {
  bidHash, commitBid, confirmDelivery, deposit, dispute, finalize, joinRound, newMarket, openRound,
  requiredBond, resolveDispute, revealBid, saving, setItem, setPolicy, settle, spentOf, withdraw,
  type MarketState,
} from "../src/engine.js";

export type Args = Record<string, string | number | boolean | null | Record<string, string>>;

export interface Action {
  now: string; // ns, as a decimal string
  caller: string;
  method: string;
  args: Args;
}

export interface ItemJson {
  id: string; name: string; unit: string; ref_price: string; het: string | null; source: string; as_of: string;
}

export interface Scenario {
  name: string;
  description: string;
  admin: string;
  arbiter: string;
  token: string;
  start: string;
  items: ItemJson[];
  actions: Action[];
  expected?: Expected;
}

export interface Expected {
  token_held: string;
  balances: Record<string, { available: string; held: string; spent_week0: string }>;
  rounds: unknown[];
}

export interface ScenarioFile {
  note: string;
  scenarios: Scenario[];
}

const big = (v: unknown): bigint => BigInt(v as string);

function applyAction(s: MarketState, a: Action): MarketState {
  const now = BigInt(a.now);
  const c = { caller: a.caller, now };
  const owner = { caller: a.caller, now, yocto: 1n };
  const x = a.args;
  const id = x["round_id"] as number;
  switch (a.method) {
    case "set_policy":
      return setPolicy(s, owner, {
        maxPrice: Object.fromEntries(Object.entries(x["max_price"] as Record<string, string>).map(([k, v]) => [k, BigInt(v)])),
        weeklyBudget: big(x["weekly_budget"]),
        autoJoin: x["auto_join"] as boolean,
      });
    case "deposit":
      return deposit(s, now, a.caller, big(x["amount"]));
    case "open_round":
      return openRound(s, c, {
        item: x["item"] as string, ceilingPrice: big(x["ceiling_price"]), minTotalQty: big(x["min_total_qty"]),
        joinSecs: big(x["join_secs"]), commitSecs: big(x["commit_secs"]), revealSecs: big(x["reveal_secs"]),
        deliverySecs: big(x["delivery_secs"]),
      });
    case "join_round":
      return joinRound(s, c, id, big(x["qty"]));
    case "commit": {
      const hash = bidHash(id, a.caller, big(x["price"]), x["salt"] as string);
      const bond = requiredBond(s.rounds[id]!.ceilingPrice, s.rounds[id]!.totalQty);
      return commitBid(s, now, a.caller, bond, id, hash);
    }
    case "reveal_bid":
      return revealBid(s, c, id, big(x["unit_price"]), x["salt"] as string);
    case "settle":
      return settle(s, c, id).state;
    case "confirm_delivery":
      return confirmDelivery(s, owner, id);
    case "dispute":
      return dispute(s, owner, id);
    case "resolve_dispute":
      return resolveDispute(s, c, id, x["buyer"] as string, x["refund_buyer"] as boolean);
    case "finalize":
      return finalize(s, c, id).state;
    case "withdraw":
      return withdraw(s, owner, big(x["amount"]));
    default:
      throw new Error(`unknown golden method: ${a.method}`);
  }
}

export function replay(sc: Scenario): MarketState {
  let s = newMarket(sc.admin, sc.arbiter, sc.token);
  for (const it of sc.items) {
    s = setItem(s, { caller: sc.admin, now: BigInt(sc.start), yocto: 1n }, {
      id: it.id, name: it.name, unit: it.unit, refPrice: BigInt(it.ref_price),
      het: it.het === null ? null : BigInt(it.het), source: it.source, asOf: it.as_of,
    });
  }
  return sc.actions.reduce(applyAction, s);
}

/** Accounts worth snapshotting: every caller and every named buyer, minus admin/arbiter/token. */
export function accountsOf(sc: Scenario): string[] {
  const skip = new Set([sc.admin, sc.arbiter, sc.token]);
  const set = new Set<string>();
  for (const a of sc.actions) {
    set.add(a.caller);
    if (typeof a.args["buyer"] === "string") set.add(a.args["buyer"]);
  }
  return [...set].filter((x) => !skip.has(x)).sort();
}

export function snapshot(sc: Scenario, s: MarketState): Expected {
  const balances: Expected["balances"] = {};
  for (const acc of accountsOf(sc)) {
    balances[acc] = {
      available: (s.balances[acc] ?? 0n).toString(),
      held: (s.held[acc] ?? 0n).toString(),
      spent_week0: spentOf(s, acc, 0n).toString(),
    };
  }
  const rounds = s.rounds.map((r) => ({
    id: r.id,
    state: r.state,
    total_qty: r.totalQty.toString(),
    winner: r.winner === null ? null : (r.bids[r.winner]?.sellerId ?? null),
    clearing_price: r.clearingPrice === null ? null : r.clearingPrice.toString(),
    saving: saving(r) === null ? null : String(saving(r)),
    participants: r.participants.map((p) => ({
      account_id: p.accountId, qty: p.qty.toString(), held: p.held.toString(), delivery: p.delivery,
    })),
    bids: r.bids.map((b) => ({
      seller_id: b.sellerId, bond: b.bond.toString(), bond_held: b.bondHeld.toString(),
      revealed_price: b.revealedPrice === null ? null : b.revealedPrice.toString(), valid: b.valid,
    })),
  }));
  return { token_held: s.tokenHeld.toString(), balances, rounds };
}
