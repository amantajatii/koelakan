/** Grosir role: bid in any eligible round, reveal from the persisted salt, auto-withdraw, keep wallet funded. */
import { GAS, GROSIR_MIN_WALLET, ONE_YOCTO } from "../config.js";
import type { RoundView } from "../chain/views.js";
import { runCommit, runReveal, type GrosirDeps } from "../agents/grosir.js";
import { newSalt } from "../protocol.js";
import { findSalt, persistSalt } from "../salts.js";
import { grosirQuote } from "../strategy.js";
import { MIN_ACCOUNT_NEAR } from "./budget.js";
import { claim, noteSkip, safely } from "./guard.js";
import { pickSubset, rollForget } from "./scheduler.js";
import type { GrosirAgent, Runtime } from "./runtime.js";

const FAUCET_COOLDOWN_MS = 61 * 60 * 1000;
const MAX_COMMIT_ATTEMPTS = 2;
const MAX_REVEAL_ATTEMPTS = 3;

export interface GrosirPolicy {
  /** Unit price for an item (0 = no quote). */
  quote(item: string): bigint;
  /** Which of our grosirs bid in this round. */
  bids(round: RoundView): boolean;
  forgets(roundId: number): boolean;
  readonly minBid?: bigint;
  readonly maxBond?: bigint;
}

export function grosirDeps(rt: Runtime, g: GrosirAgent, pol: GrosirPolicy): GrosirDeps {
  const actor = g.actor;
  if (actor === null) throw new Error(`no key for ${g.id}`);
  const send = (contract: string, method: string, args: object, gas: bigint, deposit: bigint | undefined, ev: string, note: string) =>
    actor.call({ contract, method, args, gas, ...(deposit ? { deposit } : {}), key: "full", role: "grosir", note, expectEvent: ev });
  return {
    market: rt.cfg.dep.market, tidr: rt.cfg.dep.tidr, account: g.id, short: g.short,
    loadSalt: (id) => findSalt(rt.state.saltsFile, rt.cfg.dep.market, id, g.id),
    saveSalt: (e) => persistSalt(rt.state.saltsFile, e),
    newSalt: () => newSalt(), nowIso: () => new Date().toISOString(),
    walletBalance: () => rt.views.tokenBalance(g.id), requiredBond: (id) => rt.views.requiredBond(id),
    quote: pol.quote, forgets: pol.forgets, ...(pol.minBid !== undefined ? { minBid: pol.minBid } : {}),
    ...(pol.maxBond !== undefined ? { maxBond: pol.maxBond } : {}),
    sendCommit: (args, note) => send(rt.cfg.dep.tidr, "ft_transfer_call", args, GAS.ftTransferCall, ONE_YOCTO, "bid_committed", note),
    sendReveal: (args, note) => send(rt.cfg.dep.market, "reveal_bid", args, GAS.reveal, undefined, "bid_revealed", note),
  };
}

const ownBid = (r: RoundView, id: string) => r.bids.find((b) => b.seller_id === id);

/** Phase-driven step for one grosir and one round (idempotent from chain state + claims). */
export async function grosirStep(rt: Runtime, g: GrosirAgent, r: RoundView, pol: GrosirPolicy): Promise<void> {
  if (g.actor === null || rt.health.isPaused(g.id)) return;
  const bid = ownBid(r, g.id);
  if (r.phase === "Commit" && bid === undefined && pol.bids(r)) {
    if (r.total_qty < r.min_total_qty) return;
    if (!claim(rt, `commit:${r.id}:${g.id}`, MAX_COMMIT_ATTEMPTS, 20_000)) return;
    const rec = await runCommit(grosirDeps(rt, g, pol), { id: r.id, item: r.item, ceiling: BigInt(r.ceiling_price) });
    if (rec.status === "skipped") noteSkip(rt, g.id, "grosir", "commit", rec.note ?? "");
  } else if (r.phase === "Reveal" && bid !== undefined && bid.revealed_price === null) {
    if (!claim(rt, `reveal:${r.id}:${g.id}`, MAX_REVEAL_ATTEMPTS, 10_000)) return;
    const rec = await runReveal(grosirDeps(rt, g, pol), r.id);
    if (rec.status === "skipped") noteSkip(rt, g.id, "grosir", "reveal_bid", rec.note ?? "");
  }
}

/** The daemon's policy for grosir-1..5: seeded quotes, rotating bidder subset, probabilistic forgetting. */
export function seededGrosirPolicy(rt: Runtime, g: GrosirAgent): GrosirPolicy {
  const ids = rt.grosirs.map((x) => x.id);
  const k = Math.min(rt.cfg.grosirBidders, ids.length);
  return {
    quote: (item) => grosirQuote(rt.pop, g.short, item),
    bids: (r) => pickSubset(rt.seed, r.id, "bidders", ids, k, k).includes(g.id),
    forgets: (id) => g.short === "grosir-5" && rollForget(rt.seed, id, g.id, rt.cfg.forgetProb),
  };
}

async function topUpWallet(rt: Runtime, g: GrosirAgent, wallet: bigint): Promise<void> {
  const actor = g.actor;
  if (actor === null || wallet >= GROSIR_MIN_WALLET) return;
  const last = rt.state.scheduler().faucet_at[g.id] ?? 0;
  if (Date.now() - last < FAUCET_COOLDOWN_MS) return;
  rt.state.patchScheduler({ faucet_at: { ...rt.state.scheduler().faucet_at, [g.id]: Date.now() } });
  await actor.call({ contract: rt.cfg.dep.tidr, method: "faucet", args: {}, gas: GAS.faucet, role: "grosir", note: "wallet low: faucet" });
}

/** Refreshes balances for /status, withdraws proceeds above the threshold, tops up the wallet. */
async function grosirHousekeeping(rt: Runtime, g: GrosirAgent): Promise<void> {
  const [near, wallet, bal] = await Promise.all([rt.views.nearBalance(g.id), rt.views.tokenBalance(g.id), rt.views.balance(g.id)]);
  const wasLow = rt.health.isLow(g.id);
  rt.health.setBalance(g.id, near);
  if (rt.health.isLow(g.id) && !wasLow) {
    rt.events.emit({ kind: "account_paused", account: g.id, message: `${g.id} has under ${MIN_ACCOUNT_NEAR / 10n ** 21n}e-3 NEAR: signing paused` });
  }
  const available = BigInt(bal.available);
  rt.cache.grosirStats.set(g.id, { near, tidrWallet: wallet, marketAvailable: available });
  if (g.actor === null || rt.health.isPaused(g.id)) return;
  let walletNow = wallet;
  if (available > rt.cfg.withdrawThreshold) {
    const rec = await g.actor.call({
      contract: rt.cfg.dep.market, method: "withdraw", args: { amount: available.toString() }, deposit: ONE_YOCTO,
      gas: GAS.ftTransferCall, key: "full", role: "grosir", note: `auto-withdraw ${available} tIDR to wallet`,
    });
    if (rec.status === "ok") walletNow += available;
  }
  await topUpWallet(rt, g, walletNow);
}

export const grosirHousekeepSafely = (rt: Runtime, g: GrosirAgent): Promise<void> =>
  safely(rt, "grosir housekeeping", () => grosirHousekeeping(rt, g), g.id);
