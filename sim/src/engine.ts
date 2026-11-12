/**
 * Koelakan market engine: a pure, immutable state machine that mirrors
 * contracts/market/src/lib.rs (RULES.md v0.3). Every operation takes the
 * current state plus a call context and returns a NEW state.
 */
import {
  addHeld,
  addSpent,
  balanceOf,
  credit,
  getRound,
  heldOf,
  putRound,
  setBalance,
  spentOf,
  subHeld,
} from "./ledger.js";
import type { AccountId, Ctx, Item, MarketState, Policy, Round } from "./types.js";
import {
  ContractPanic,
  MAX_BIDS,
  MAX_PARTICIPANTS,
  MAX_PHASE_SECS,
  MIN_PHASE_SECS,
  NS,
  assertOneYocto,
  bidHash,
  phaseOf,
  require,
  requiredBond,
  weekOf,
} from "./util.js";

export * from "./ledger.js";
export * from "./settle.js";
export * from "./types.js";
export * from "./util.js";

const HEX64 = /^[0-9a-f]{64}$/;

export function newMarket(admin: AccountId, arbiter: AccountId, token: AccountId): MarketState {
  return {
    admin,
    arbiter,
    token,
    items: {},
    policies: {},
    balances: {},
    held: {},
    spent: {},
    rounds: [],
    tokenHeld: 0n,
  };
}

// ------------------------------------------------------------ admin / owner

export function setItem(s: MarketState, ctx: Ctx, item: Item): MarketState {
  assertOneYocto(ctx.yocto);
  require(ctx.caller === s.admin, "admin only");
  require(item.refPrice >= 1n, "ref_price must be >= 1");
  require(item.id.length > 0 && item.id.length <= 32, "bad item id");
  return { ...s, items: { ...s.items, [item.id]: item } };
}

export function setArbiter(s: MarketState, ctx: Ctx, arbiter: AccountId): MarketState {
  assertOneYocto(ctx.yocto);
  require(ctx.caller === s.admin, "admin only");
  return { ...s, arbiter };
}

export function setPolicy(s: MarketState, ctx: Ctx, policy: Policy): MarketState {
  assertOneYocto(ctx.yocto);
  return { ...s, policies: { ...s.policies, [ctx.caller]: policy } };
}

/** Debit first; the ft_transfer itself is out of scope here (see withdrawRefunded). */
export function withdraw(s: MarketState, ctx: Ctx, amount: bigint): MarketState {
  assertOneYocto(ctx.yocto);
  require(amount > 0n, "amount must be > 0");
  const bal = balanceOf(s, ctx.caller);
  require(bal >= amount, "insufficient available balance");
  return { ...setBalance(s, ctx.caller, bal - amount), tokenHeld: s.tokenHeld - amount };
}

/** Callback when the ft_transfer of a withdraw failed: credit the amount back. */
export function withdrawRefunded(s: MarketState, account: AccountId, amount: bigint): MarketState {
  return { ...credit(s, account, amount), tokenHeld: s.tokenHeld + amount };
}

// ------------------------------------------------------------ ft receiver

export interface FtResult {
  readonly state: MarketState;
  /** Amount returned to the sender (0 = fully accepted). */
  readonly refund: bigint;
}

/** Models `ft_on_transfer`. Called by the token contract (ctx.caller = token). */
export function ftOnTransfer(
  s: MarketState,
  ctx: Ctx,
  sender: AccountId,
  amount: bigint,
  msg: string,
): FtResult {
  if (ctx.caller !== s.token) return { state: s, refund: amount };
  if (msg === "deposit") {
    const next = { ...credit(s, sender, amount), tokenHeld: s.tokenHeld + amount };
    return { state: next, refund: 0n };
  }
  try {
    return { state: tryCommit(s, ctx.now, sender, amount, msg), refund: 0n };
  } catch (e) {
    if (e instanceof ContractPanic) return { state: s, refund: amount };
    throw e;
  }
}

/** ft_transfer_call(msg = "deposit"). Throws if the market rejects it. */
export function deposit(s: MarketState, now: bigint, sender: AccountId, amount: bigint): MarketState {
  const r = ftOnTransfer(s, { caller: s.token, now }, sender, amount, "deposit");
  require(r.refund === 0n, "deposit rejected");
  return r.state;
}

/** ft_transfer_call(msg = {"commit": ...}) with `amount` as bond. Throws if rejected. */
export function commitBid(
  s: MarketState,
  now: bigint,
  seller: AccountId,
  amount: bigint,
  roundId: number,
  hash: string,
): MarketState {
  const msg = JSON.stringify({ commit: { round_id: roundId, hash } });
  const r = ftOnTransfer(s, { caller: s.token, now }, seller, amount, msg);
  return r.refund === 0n ? r.state : tryCommit(s, now, seller, amount, msg);
}

function parseCommit(msg: string): { roundId: number; hash: string } {
  let v: unknown;
  try {
    v = JSON.parse(msg);
  } catch {
    throw new ContractPanic("unknown msg");
  }
  const c = (v as { commit?: { round_id?: unknown; hash?: unknown } } | null)?.commit;
  require(c !== undefined && c !== null, "unknown msg");
  require(Number.isInteger(c.round_id) && (c.round_id as number) >= 0, "missing round_id");
  require(typeof c.hash === "string", "missing hash");
  require(HEX64.test(c.hash), "hash must be 64 lowercase hex chars");
  return { roundId: c.round_id as number, hash: c.hash };
}

/** Mirrors `try_commit`: throws ContractPanic with the rejection reason. */
function tryCommit(s: MarketState, now: bigint, seller: AccountId, amount: bigint, msg: string): MarketState {
  const { roundId, hash } = parseCommit(msg);
  const r = s.rounds[roundId];
  require(r !== undefined, "no such round");
  require(phaseOf(r, now) === "Commit", "round is not in commit phase");
  require(r.totalQty >= r.minTotalQty, "not enough demand");
  require(r.bids.length < MAX_BIDS, "bid limit reached");
  require(!r.bids.some((b) => b.sellerId === seller), "seller already committed");
  const bond = requiredBond(r.ceilingPrice, r.totalQty);
  require(amount === bond, `bond must be exactly ${bond}`);
  const bid = { sellerId: seller, hash, bond, bondHeld: bond, revealedPrice: null, valid: false };
  const next = putRound(s, { ...r, bids: [...r.bids, bid] });
  return { ...addHeld(next, seller, bond), tokenHeld: next.tokenHeld + amount };
}

// ------------------------------------------------------------ rounds

export interface OpenRoundArgs {
  readonly item: string;
  readonly ceilingPrice: bigint;
  readonly minTotalQty: bigint;
  readonly joinSecs: bigint;
  readonly commitSecs: bigint;
  readonly revealSecs: bigint;
  readonly deliverySecs: bigint;
}

/** Returns the new state; the new round is `state.rounds[state.rounds.length - 1]`. */
export function openRound(s: MarketState, ctx: Ctx, a: OpenRoundArgs): MarketState {
  const it = s.items[a.item];
  require(it !== undefined, "unknown item");
  require(a.ceilingPrice >= 1n, "ceiling must be >= 1");
  require(a.ceilingPrice <= it.refPrice, "ceiling above reference price");
  require(a.minTotalQty >= 1n, "min_total_qty must be >= 1");
  for (const d of [a.joinSecs, a.commitSecs, a.revealSecs, a.deliverySecs]) {
    require(d >= MIN_PHASE_SECS && d <= MAX_PHASE_SECS, "each duration must be 30 s .. 30 days");
  }
  const joinDeadline = ctx.now + a.joinSecs * NS;
  const commitDeadline = joinDeadline + a.commitSecs * NS;
  const revealDeadline = commitDeadline + a.revealSecs * NS;
  const deliveryDeadline = revealDeadline + a.deliverySecs * NS;
  const round: Round = {
    id: s.rounds.length,
    item: a.item,
    refPrice: it.refPrice,
    ceilingPrice: a.ceilingPrice,
    minTotalQty: a.minTotalQty,
    totalQty: 0n,
    opener: ctx.caller,
    openedAt: ctx.now,
    joinDeadline,
    commitDeadline,
    revealDeadline,
    deliveryDeadline,
    arbiterDeadline: deliveryDeadline + a.deliverySecs * NS,
    state: "Active",
    participants: [],
    bids: [],
    winner: null,
    clearingPrice: null,
  };
  return { ...s, rounds: [...s.rounds, round] };
}

/** Owner or agent. With auto_join off, 1 yocto must be attached. */
export function joinRound(s: MarketState, ctx: Ctx, roundId: number, qty: bigint): MarketState {
  const account = ctx.caller;
  const policy = s.policies[account];
  require(policy !== undefined, "no policy: owner must call set_policy first");
  if (!policy.autoJoin) {
    require(ctx.yocto === 1n, "auto_join is off: owner must join (attach 1 yocto)");
  }
  const r = getRound(s, roundId);
  require(phaseOf(r, ctx.now) === "Join", "round is not accepting joins");
  require(qty >= 1n, "qty must be >= 1");
  require(r.participants.length < MAX_PARTICIPANTS, "round is full");
  require(!r.participants.some((p) => p.accountId === account), "already joined this round");
  const max = policy.maxPrice[r.item];
  require(max !== undefined, "item not in owner policy");
  require(r.ceilingPrice <= max, "ceiling above owner max_price");
  const cost = r.ceilingPrice * qty;
  const week = weekOf(ctx.now);
  require(spentOf(s, account, week) + cost <= policy.weeklyBudget, "weekly budget exceeded");
  const bal = balanceOf(s, account);
  require(bal >= cost, "insufficient available balance");

  const participant = { accountId: account, qty, week, held: cost, delivery: "Pending" as const };
  const next = addSpent(addHeld(setBalance(s, account, bal - cost), account, cost), account, week, cost);
  return putRound(next, {
    ...r,
    totalQty: r.totalQty + qty,
    participants: [...r.participants, participant],
  });
}

export function revealBid(
  s: MarketState,
  ctx: Ctx,
  roundId: number,
  unitPrice: bigint,
  salt: string,
): MarketState {
  const r = getRound(s, roundId);
  require(phaseOf(r, ctx.now) === "Reveal", "round is not in reveal phase");
  const idx = r.bids.findIndex((b) => b.sellerId === ctx.caller);
  const bid = r.bids[idx];
  require(bid !== undefined, "no commit from this seller");
  require(bid.revealedPrice === null, "already revealed");
  require(bidHash(roundId, ctx.caller, unitPrice, salt) === bid.hash, "hash mismatch");
  const valid = unitPrice >= 1n && unitPrice <= r.ceilingPrice;
  const bids = r.bids.map((b, i) => (i === idx ? { ...b, revealedPrice: unitPrice, valid } : b));
  return putRound(s, { ...r, bids });
}

// ------------------------------------------------------------ views

export function getBalance(s: MarketState, a: AccountId): { available: bigint; held: bigint } {
  return { available: balanceOf(s, a), held: heldOf(s, a) };
}

export function saving(r: Round): bigint | null {
  return r.clearingPrice === null ? null : (r.refPrice - r.clearingPrice) * r.totalQty;
}

/** Conservation invariant: tokenHeld == sum(available) + sum(held in rounds). */
export function checkInvariant(s: MarketState): void {
  const avail = Object.values(s.balances).reduce((a, b) => a + b, 0n);
  let inRounds = 0n;
  for (const r of s.rounds) {
    inRounds += r.participants.reduce((a, p) => a + p.held, 0n);
    inRounds += r.bids.reduce((a, b) => a + b.bondHeld, 0n);
  }
  const heldMap = Object.values(s.held).reduce((a, b) => a + b, 0n);
  if (heldMap !== inRounds) throw new Error("held map out of sync");
  if (s.tokenHeld !== avail + inRounds) throw new Error("conservation invariant broken");
}
