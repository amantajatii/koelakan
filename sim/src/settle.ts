/** Settle, delivery, dispute and finalize (RULES.md §5.5 and §6). */
import { credit, getRound, putRound, subHeld, unspend } from "./ledger.js";
import type { AccountId, Bid, Ctx, MarketState, Participant, Round, RoundState } from "./types.js";
import { assertOneYocto, phaseOf, proRataShares, require } from "./util.js";

function winnerIndex(bids: readonly Bid[]): number | null {
  let best: number | null = null;
  bids.forEach((b, i) => {
    if (!b.valid || b.revealedPrice === null) return;
    const cur = best === null ? null : bids[best]?.revealedPrice;
    if (cur === null || cur === undefined || b.revealedPrice < cur) best = i;
  });
  return best; // strict `<` keeps the earlier commit on ties
}

/** Forfeits the bonds of unrevealed bids. Returns the new state, bids and the total. */
function forfeitUnrevealed(s: MarketState, bids: readonly Bid[]) {
  let state = s;
  let total = 0n;
  const out = bids.map((b) => {
    if (b.revealedPrice !== null) return b;
    total += b.bondHeld;
    state = subHeld(state, b.sellerId, b.bondHeld);
    return { ...b, bondHeld: 0n };
  });
  return { state, bids: out, total };
}

function returnRevealedBonds(s: MarketState, bids: readonly Bid[], keep: number | null) {
  let state = s;
  const out = bids.map((b, i) => {
    if (b.revealedPrice === null || i === keep || b.bondHeld === 0n) return b;
    state = credit(subHeld(state, b.sellerId, b.bondHeld), b.sellerId, b.bondHeld);
    return { ...b, bondHeld: 0n };
  });
  return { state, bids: out };
}

function refundAll(s: MarketState, ps: readonly Participant[]) {
  let state = s;
  const out = ps.map((p) => {
    state = unspend(credit(subHeld(state, p.accountId, p.held), p.accountId, p.held), p.accountId, p.week, p.held);
    return { ...p, held: 0n };
  });
  return { state, participants: out };
}

function refundDifference(s: MarketState, ps: readonly Participant[], diff: bigint) {
  let state = s;
  const out = ps.map((p) => {
    const refund = diff * p.qty;
    state = unspend(credit(subHeld(state, p.accountId, refund), p.accountId, refund), p.accountId, p.week, refund);
    return { ...p, held: p.held - refund };
  });
  return { state, participants: out };
}

function distributeForfeit(s: MarketState, r: Round, total: bigint): MarketState {
  require(r.participants.length > 0 && r.totalQty > 0n, "internal: nothing to distribute to");
  const shares = proRataShares(total, r.participants.map((p) => p.qty));
  return r.participants.reduce((st, p, i) => credit(st, p.accountId, shares[i] ?? 0n), s);
}

/** Anyone, once, after the reveal deadline (or early if demand is too low). */
export function settle(s: MarketState, ctx: Ctx, roundId: number): { state: MarketState; result: RoundState } {
  const r = getRound(s, roundId);
  require(phaseOf(r, ctx.now) === "ReadyToSettle", "round is not ready to settle");

  const f = forfeitUnrevealed(s, r.bids);
  const winner = winnerIndex(f.bids);
  const failed = r.totalQty < r.minTotalQty || winner === null;
  const bonds = returnRevealedBonds(f.state, f.bids, failed ? null : winner);

  let settled: Round;
  let state: MarketState;
  if (failed || winner === null) {
    const refunds = refundAll(bonds.state, r.participants);
    state = refunds.state;
    settled = { ...r, bids: bonds.bids, participants: refunds.participants, state: "Failed" };
  } else {
    const clearing = bonds.bids[winner]?.revealedPrice ?? 0n;
    const refunds = refundDifference(bonds.state, r.participants, r.ceilingPrice - clearing);
    state = refunds.state;
    settled = {
      ...r,
      bids: bonds.bids,
      participants: refunds.participants,
      winner,
      clearingPrice: clearing,
      state: "Settled",
    };
  }
  if (f.total > 0n) state = distributeForfeit(state, settled, f.total);
  return { state: putRound(state, settled), result: settled.state };
}

function updateParticipant(r: Round, who: AccountId, fn: (p: Participant) => Participant): Round {
  const idx = r.participants.findIndex((p) => p.accountId === who);
  require(idx >= 0, "not a participant");
  return { ...r, participants: r.participants.map((p, i) => (i === idx ? fn(p) : p)) };
}

function findParticipant(r: Round, who: AccountId): Participant {
  const p = r.participants.find((x) => x.accountId === who);
  require(p !== undefined, "not a participant");
  return p;
}

function winnerBid(r: Round): Bid {
  const b = r.winner === null ? undefined : r.bids[r.winner];
  require(b !== undefined, "round has no winner");
  return b;
}

/** Owner only: the buyer's escrowed payment goes to the winner right away. */
export function confirmDelivery(s: MarketState, ctx: Ctx, roundId: number): MarketState {
  assertOneYocto(ctx.yocto);
  const r = getRound(s, roundId);
  require(phaseOf(r, ctx.now) === "Delivery", "not in delivery window");
  const seller = winnerBid(r).sellerId;
  const p = findParticipant(r, ctx.caller);
  require(p.delivery === "Pending", "delivery already decided");
  const paid = credit(subHeld(s, ctx.caller, p.held), seller, p.held);
  const next = updateParticipant(r, ctx.caller, (x) => ({ ...x, held: 0n, delivery: "Confirmed" }));
  return putRound(paid, next);
}

/** Owner only: freezes the buyer's payment until the arbiter rules. */
export function dispute(s: MarketState, ctx: Ctx, roundId: number): MarketState {
  assertOneYocto(ctx.yocto);
  const r = getRound(s, roundId);
  require(phaseOf(r, ctx.now) === "Delivery", "not in delivery window");
  const p = findParticipant(r, ctx.caller);
  require(p.delivery === "Pending", "delivery already decided");
  return putRound(s, updateParticipant(r, ctx.caller, (x) => ({ ...x, delivery: "Disputed" })));
}

/** Arbiter only, before `arbiter_deadline`. */
export function resolveDispute(
  s: MarketState,
  ctx: Ctx,
  roundId: number,
  buyer: AccountId,
  refundBuyer: boolean,
): MarketState {
  require(ctx.caller === s.arbiter, "arbiter only");
  const r = getRound(s, roundId);
  require(r.state === "Settled", "round is not settled");
  require(ctx.now < r.arbiterDeadline, "arbiter deadline passed");
  const wi = r.winner ?? 0;
  const win = winnerBid(r);
  const p = findParticipant(r, buyer);
  require(p.delivery === "Disputed", "buyer has no open dispute");

  const debited = subHeld(s, buyer, p.held);
  let state: MarketState;
  let bids = r.bids;
  if (refundBuyer) {
    const share = (win.bond * p.qty) / r.totalQty;
    state = unspend(credit(debited, buyer, p.held + share), buyer, p.week, p.held);
    state = subHeld(state, win.sellerId, share);
    bids = r.bids.map((b, i) => (i === wi ? { ...b, bondHeld: b.bondHeld - share } : b));
  } else {
    state = credit(debited, win.sellerId, p.held);
  }
  const delivery = refundBuyer ? "ResolvedRefunded" : "ResolvedPaid";
  const next = updateParticipant({ ...r, bids }, buyer, (x) => ({ ...x, held: 0n, delivery }));
  return putRound(state, next);
}

interface FinalizeAcc {
  state: MarketState;
  participants: Participant[];
  paidToSeller: bigint;
  openDisputes: number;
  refunds: { p: Participant; amt: bigint }[];
}

/** Anyone, after `delivery_deadline`; may be called again until CLOSED. */
export function finalize(s: MarketState, ctx: Ctx, roundId: number): { state: MarketState; result: RoundState } {
  const r = getRound(s, roundId);
  require(phaseOf(r, ctx.now) === "AwaitingFinalize", "round is not awaiting finalize");
  const win = winnerBid(r);
  const arbiterExpired = ctx.now >= r.arbiterDeadline;

  const acc: FinalizeAcc = { state: s, participants: [], paidToSeller: 0n, openDisputes: 0, refunds: [] };
  for (const p of r.participants) {
    if (p.delivery === "Pending") {
      acc.paidToSeller += p.held;
      acc.state = subHeld(acc.state, p.accountId, p.held);
      acc.participants.push({ ...p, held: 0n, delivery: "Accepted" });
    } else if (p.delivery === "Disputed" && arbiterExpired) {
      acc.refunds.push({ p, amt: p.held });
      acc.state = subHeld(acc.state, p.accountId, p.held);
      acc.participants.push({ ...p, held: 0n, delivery: "DefaultRefunded" });
    } else {
      if (p.delivery === "Disputed") acc.openDisputes += 1;
      acc.participants.push(p);
    }
  }
  let state = acc.paidToSeller > 0n ? credit(acc.state, win.sellerId, acc.paidToSeller) : acc.state;
  for (const { p, amt } of acc.refunds) state = unspend(credit(state, p.accountId, amt), p.accountId, p.week, amt);

  const closed = acc.openDisputes === 0;
  let bids = r.bids;
  if (closed) {
    const rest = win.bondHeld;
    state = credit(subHeld(state, win.sellerId, rest), win.sellerId, rest);
    bids = r.bids.map((b, i) => (i === r.winner ? { ...b, bondHeld: 0n } : b));
  }
  const next: Round = { ...r, participants: acc.participants, bids, state: closed ? "Closed" : r.state };
  return { state: putRound(state, next), result: next.state };
}
