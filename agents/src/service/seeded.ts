/** Seeded warung-01..20: sim-strategy joins (function-call key), solvency top-ups, owner confirms. */
import type { RoundView } from "../chain/views.js";
import { GAS, ONE_YOCTO, TX_CONCURRENCY } from "../config.js";
import { DEPOSIT_MSG, ftTransferCallArgs, joinRoundArgs, policyArgs, roundIdArgs, type PolicyJson } from "../protocol.js";
import { pickSilent, warungQty } from "../strategy.js";
import { mapLimit } from "../util.js";
import { claim, joinStillOpen, noteSkip, safely } from "./guard.js";
import { pickSubset } from "./scheduler.js";
import type { Runtime, SeededAgent } from "./runtime.js";

const SEEDED_WEEKLY_BUDGET = 1_000_000_000_000n; // effectively unlimited: the weekly budget must never block the sim warungs
const TOPUP_BELOW = 400_000n;
const TOPUP_AMOUNT = 1_000_000n;
const FAUCET_COOLDOWN_MS = 61 * 60 * 1000;
const FC_MIN_ALLOWANCE = 5n * 10n ** 21n; // 0.005 NEAR: below this joins fall back to the full key
const MAX_ATTEMPTS = 2;

/** True when a policy already covers every item at its ref price with a big enough budget. */
function policyIsAdequate(p: PolicyJson | null, refs: Readonly<Record<string, bigint>>): boolean {
  if (p === null || !p.auto_join || BigInt(p.weekly_budget) < SEEDED_WEEKLY_BUDGET) return false;
  return Object.entries(refs).every(([item, ref]) => p.max_price[item] !== undefined && BigInt(p.max_price[item] as string) >= ref);
}

const ready = (s: SeededAgent, rt: Runtime): s is SeededAgent & { actor: NonNullable<SeededAgent["actor"]> } =>
  s.actor !== null && !rt.health.isPaused(s.id);

/** Owner actions on startup / when the catalogue changes: make sure every sim warung's policy fits. */
export async function ensurePolicies(rt: Runtime, refs: Readonly<Record<string, bigint>>): Promise<void> {
  await mapLimit(rt.seeded, TX_CONCURRENCY, (s) =>
    safely(rt, "ensure policy", async () => {
      if (!ready(s, rt) || policyIsAdequate(await rt.views.policy(s.id), refs)) return;
      await s.actor.call({
        contract: rt.cfg.dep.market, method: "set_policy", args: policyArgs(refs, SEEDED_WEEKLY_BUDGET), deposit: ONE_YOCTO,
        gas: GAS.setPolicy, key: "full", role: "owner", note: "owner policy refreshed (full key, 1 yocto)",
      });
    }, s.id));
}

/** Keeps a sim warung's market balance above the floor (called from housekeeping, outside round time). */
export async function ensureSolvent(rt: Runtime, s: SeededAgent): Promise<void> {
  if (!ready(s, rt)) return;
  if (BigInt((await rt.views.balance(s.id)).available) < TOPUP_BELOW) await topUp(rt, s);
}

async function topUp(rt: Runtime, s: SeededAgent & { actor: NonNullable<SeededAgent["actor"]> }): Promise<void> {
  const wallet0 = await rt.views.tokenBalance(s.id);
  const last = rt.state.scheduler().faucet_at[s.id] ?? 0;
  if (wallet0 < TOPUP_AMOUNT && Date.now() - last >= FAUCET_COOLDOWN_MS) {
    rt.state.patchScheduler({ faucet_at: { ...rt.state.scheduler().faucet_at, [s.id]: Date.now() } });
    await s.actor.call({ contract: rt.cfg.dep.tidr, method: "faucet", args: {}, gas: GAS.faucet, key: "full", role: "owner", note: "wallet low: faucet" });
  }
  const wallet = await rt.views.tokenBalance(s.id);
  const amount = wallet < TOPUP_AMOUNT ? wallet : TOPUP_AMOUNT;
  if (amount === 0n) return;
  await s.actor.call({
    contract: rt.cfg.dep.tidr, method: "ft_transfer_call", args: ftTransferCallArgs(rt.cfg.dep.market, amount, DEPOSIT_MSG),
    deposit: ONE_YOCTO, gas: GAS.ftTransferCall, key: "full", role: "owner", note: `owner topped up ${amount} tIDR`, expectEvent: "deposit",
  });
}

async function fcAllowanceOk(rt: Runtime, s: SeededAgent): Promise<boolean> {
  if (!s.hasFcKey || s.fcPublicKey === null || rt.cache.fcExhausted.has(s.id)) return false;
  const key = await rt.views.accessKey(s.id, s.fcPublicKey);
  const ok = key !== null && key.kind === "function-call" && (key.allowance === null || key.allowance >= FC_MIN_ALLOWANCE);
  if (!ok) rt.cache.fcExhausted.add(s.id);
  return ok;
}

async function joinOne(rt: Runtime, s: SeededAgent & { actor: NonNullable<SeededAgent["actor"]> }, r: RoundView): Promise<void> {
  const ceiling = BigInt(r.ceiling_price);
  const wanted = warungQty(rt.pop, s.short, r.item);
  let available = BigInt((await rt.views.balance(s.id)).available);
  if (available < wanted * ceiling || available < TOPUP_BELOW) {
    await topUp(rt, s);
    available = BigInt((await rt.views.balance(s.id)).available);
  }
  const qty = [wanted, available / ceiling].reduce((a, b) => (b < a ? b : a));
  if (qty < 1n) {
    noteSkip(rt, s.id, "warung-agent", "join_round", `cannot afford 1 unit (balance ${available})`);
    return;
  }
  const useFc = await fcAllowanceOk(rt, s);
  const rec = await s.actor.call({
    contract: rt.cfg.dep.market, method: "join_round", args: joinRoundArgs(r.id, qty), gas: GAS.join,
    key: useFc ? "function-call" : "full", role: "warung-agent",
    note: `joined with ${qty} units (${useFc ? "function-call key" : "full key: allowance low"})`,
  });
  if (rec.status !== "ok" && /allowance/i.test(rec.error ?? "")) rt.cache.fcExhausted.add(s.id);
}

/** A seeded-random subset of SEEDED_JOIN_MIN..MAX warungs joins each OPEN round. Stable across restarts. */
export async function seededJoins(rt: Runtime, r: RoundView): Promise<void> {
  if (r.phase !== "Join") return;
  // an owner who registered through the API (delegated) takes the account over from the sim
  const eligible = rt.seeded.filter((s) => warungQty(rt.pop, s.short, r.item) > 0n && rt.state.warung(s.id) === null);
  const chosen = pickSubset(rt.seed, r.id, "join", eligible, rt.cfg.seededJoinMin, rt.cfg.seededJoinMax);
  const joined = new Set(r.participants.map((p) => p.account_id));
  const todo = chosen.filter((s) => ready(s, rt) && !joined.has(s.id));
  await mapLimit(todo, TX_CONCURRENCY, (s) =>
    safely(rt, "seeded join", async () => {
      if (!ready(s, rt) || !joinStillOpen(r.join_deadline) || !claim(rt, `join:${r.id}:${s.id}`, MAX_ATTEMPTS)) return;
      await joinOne(rt, s, r);
    }, s.id, r.id));
}

/** After settle most sim owners confirm ("owner confirmed in chat"); the last one stays silent. */
export async function seededConfirms(rt: Runtime, r: RoundView): Promise<void> {
  if (r.phase !== "Delivery") return;
  const ours = new Map(rt.seeded.map((s) => [s.id, s]));
  const mine = r.participants.filter((p) => ours.has(p.account_id));
  const silent = pickSilent(mine.map((p) => p.account_id));
  const todo = mine.filter((p) => p.delivery === "Pending" && p.account_id !== silent);
  await mapLimit(todo, TX_CONCURRENCY, (p) =>
    safely(rt, "seeded confirm", async () => {
      const s = ours.get(p.account_id) as SeededAgent;
      if (!ready(s, rt) || !claim(rt, `confirm:${r.id}:${s.id}`, MAX_ATTEMPTS)) return;
      await s.actor.call({
        contract: rt.cfg.dep.market, method: "confirm_delivery", args: roundIdArgs(r.id), deposit: ONE_YOCTO, gas: GAS.confirm,
        key: "full", role: "owner", note: "owner confirmed in chat (full key, 1 yocto)",
      });
    }, p.account_id, r.id));
}
