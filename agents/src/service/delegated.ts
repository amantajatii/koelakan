/** Delegated real warungs: the service key joins on their behalf, only when every precheck passes. */
import { Actor } from "../chain/actor.js";
import type { RoundView } from "../chain/views.js";
import { GAS } from "../config.js";
import { MAX_PARTICIPANTS } from "../agents/warung.js";
import { joinRoundArgs, type PolicyJson } from "../protocol.js";
import { claim, joinStillOpen, safely } from "./guard.js";
import type { Runtime } from "./runtime.js";
import { serviceDelegation } from "./delegation.js";

const MAX_JOIN_ATTEMPTS = 2; // one try plus at most one retry

export interface DelegatedInput {
  readonly phase: string;
  readonly item: string;
  readonly ceiling: bigint;
  readonly account: string;
  readonly participants: readonly string[];
  readonly demand: number;
  readonly policy: PolicyJson | null;
  readonly available: bigint;
  readonly spent: bigint;
  readonly delegated: boolean;
}

export type DelegatedDecision =
  | { readonly action: "join"; readonly qty: bigint }
  | { readonly action: "skip"; readonly reason: string };

const skip = (reason: string): DelegatedDecision => ({ action: "skip", reason });

/** Mirrors the contract's join_round checks and refuses partial fills: the owner asked for `demand` units. */
export function decideDelegatedJoin(i: DelegatedInput): DelegatedDecision {
  if (i.phase !== "Join") return skip(`round is in phase ${i.phase}`);
  if (i.demand < 1) return skip("no demand registered for this item");
  if (i.participants.includes(i.account)) return skip("already joined");
  if (i.participants.length >= MAX_PARTICIPANTS) return skip("round is full");
  if (!i.delegated) return skip("service key is not an access key of this account (join_round only)");
  if (i.policy === null) return skip("no owner policy set: owner must call set_policy");
  if (!i.policy.auto_join) return skip("auto_join is off: only the owner may join");
  const max = i.policy.max_price[i.item];
  if (max === undefined) return skip(`item ${i.item} is not in the owner policy`);
  if (i.ceiling > BigInt(max)) return skip(`ceiling ${i.ceiling} is above owner max_price ${max}`);
  const cost = i.ceiling * BigInt(i.demand);
  const budgetLeft = BigInt(i.policy.weekly_budget) - i.spent;
  if (cost > budgetLeft) return skip(`weekly budget left ${budgetLeft} is below the cost ${cost}`);
  if (cost > i.available) return skip(`market balance ${i.available} is below the cost ${cost}`);
  return { action: "join", qty: BigInt(i.demand) };
}

function actorFor(rt: Runtime, account: string): Actor {
  const cached = rt.cache.delegatedActors.get(account);
  if (cached !== undefined) return cached;
  if (rt.serviceSecret === null) throw new Error("SERVICE_KEY is not configured");
  const a = new Actor(account, rt.provider, rt.recorder, { functionCall: rt.serviceSecret });
  rt.cache.delegatedActors.set(account, a);
  return a;
}

async function joinOne(rt: Runtime, round: RoundView, account: string, demand: number): Promise<void> {
  const [policy, bal, spent, del] = await Promise.all([
    rt.views.policy(account), rt.views.balance(account), rt.views.spent(account), serviceDelegation(rt, account),
  ]);
  const d = decideDelegatedJoin({
    phase: round.phase, item: round.item, ceiling: BigInt(round.ceiling_price), account,
    participants: round.participants.map((p) => p.account_id), demand, policy, available: BigInt(bal.available),
    spent, delegated: del.delegated,
  });
  const at = new Date().toISOString();
  if (d.action === "skip") {
    rt.state.recordAction(account, { at, round_id: round.id, action: "skipped", qty: null, reason: d.reason, tx: null });
    rt.events.emit({ kind: "delegated_skip", account, round_id: round.id, message: `${account} not joined: ${d.reason}` });
    return;
  }
  const rec = await actorFor(rt, account).call({
    contract: rt.cfg.dep.market, method: "join_round", args: joinRoundArgs(round.id, d.qty), gas: GAS.join,
    key: "function-call", role: "delegated-agent", note: `joined with ${d.qty} units (service key)`,
  });
  if (rec.status === "ok") {
    rt.state.recordAction(account, { at, round_id: round.id, action: "joined", qty: Number(d.qty), reason: null, tx: rec.tx_hash });
  } else if (rt.state.attempts(`djoin:${round.id}:${account}`) >= MAX_JOIN_ATTEMPTS) {
    rt.state.recordAction(account, { at, round_id: round.id, action: "skipped", qty: null, reason: `join failed: ${rec.error ?? "unknown"}`, tx: rec.tx_hash });
  }
}

/** For one OPEN round: join for every registered warung with demand for its item. */
export async function delegatedJoins(rt: Runtime, round: RoundView): Promise<void> {
  if (round.phase !== "Join" || !joinStillOpen(round.join_deadline)) return;
  for (const w of rt.state.allWarungs()) {
    const demand = w.demand[round.item] ?? 0;
    if (demand < 1 || round.participants.some((p) => p.account_id === w.account_id)) continue;
    if (w.last_actions.some((a) => a.round_id === round.id)) continue; // decided already (joined or skipped)
    if (!claim(rt, `djoin:${round.id}:${w.account_id}`, MAX_JOIN_ATTEMPTS)) continue;
    await safely(rt, "delegated join", () => joinOne(rt, round, w.account_id, demand), w.account_id, round.id);
  }
}
