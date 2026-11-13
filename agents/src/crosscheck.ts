/**
 * Replays a finished live round through the sim's pure TS engine (same qtys, prices, reveals and
 * confirms) and compares the outcome with what the chain reported.
 */
import {
  ContractPanic, NS, bidHash, commitBid, confirmDelivery, deposit, finalize, joinRound, newMarket, openRound,
  revealBid, saving, setItem, setPolicy, settle,
  type MarketState, type Round,
} from "../../sim/src/engine.js";
import type { ActionRecord } from "./chain/recorder.js";
import type { BalanceView, RoundView } from "./chain/views.js";
import type { BalanceSnapshot, RoundRun } from "./round.js";

const ADMIN = "admin";
const ARBITER = "arbiter";
const TOKEN = "tidr";
const OPENER = "koordinator";
const SEC = NS;
const OFFSET_NS = 1n * SEC;

export interface Check {
  readonly name: string;
  readonly chain: string;
  readonly sim: string;
  readonly ok: boolean;
}

export interface CrossCheck {
  readonly status: "MATCH" | "MISMATCH";
  readonly checks: readonly Check[];
  readonly mismatches: readonly Check[];
  readonly error: string | null;
}

const big = (v: string | number | bigint): bigint => BigInt(v);
const check = (name: string, chain: string, sim: string): Check => ({ name, chain, sim, ok: chain === sim });

interface Replay {
  readonly state: MarketState;
  readonly round: Round;
}

const okActions = (actions: readonly ActionRecord[], method: string): ActionRecord[] =>
  actions.filter((a) => a.method === method && a.status === "ok");

function seed(run: RoundRun): MarketState {
  const p = run.roundBefore;
  let s = newMarket(ADMIN, ARBITER, TOKEN);
  const refPrice = big(run.item.ref_price);
  s = setItem(s, { caller: ADMIN, now: 0n, yocto: 1n }, {
    id: run.item.id, name: run.item.name, unit: run.item.unit, refPrice,
    het: run.item.het === null ? null : big(run.item.het), source: run.item.source, asOf: run.item.as_of,
  });
  const maxPrice = { [run.item.id]: refPrice };
  for (const [acc, b] of Object.entries(run.balancesBefore)) {
    if (big(b.available) > 0n) s = deposit(s, 0n, acc, big(b.available));
    if (acc.startsWith("warung-")) {
      s = setPolicy(s, { caller: acc, now: 0n, yocto: 1n }, { maxPrice, weeklyBudget: 10n ** 12n, autoJoin: true });
    }
  }
  return openRound(s, { caller: OPENER, now: big(p.opened_at) }, {
    item: p.item, ceilingPrice: big(p.ceiling_price), minTotalQty: big(p.min_total_qty),
    joinSecs: BigInt(run.params.joinSecs), commitSecs: BigInt(run.params.commitSecs),
    revealSecs: BigInt(run.params.revealSecs), deliverySecs: BigInt(run.params.deliverySecs),
  });
}

function revealedHash(seller: string, reveals: readonly ActionRecord[]): string | null {
  const rv = reveals.find((a) => a.actor === seller);
  if (rv === undefined) return null;
  const args = rv.args as { unit_price: string; salt: string };
  return bidHash(0, seller, big(args.unit_price), args.salt);
}

function replay(run: RoundRun): Replay {
  const after = run.roundAfter;
  let s = seed(run);
  const t0 = big(after.opened_at);
  for (const p of after.participants) {
    s = joinRound(s, { caller: p.account_id, now: t0 + OFFSET_NS }, 0, big(p.qty));
  }
  const reveals = okActions(run.actions, "reveal_bid");
  const bond = (b: RoundView["bids"][number]) => big(b.bond);
  for (const b of after.bids) {
    const hash = revealedHash(b.seller_id, reveals) ?? b.hash;
    s = commitBid(s, big(after.join_deadline) + OFFSET_NS, b.seller_id, bond(b), 0, hash);
  }
  for (const a of reveals) {
    const args = a.args as { unit_price: string; salt: string };
    s = revealBid(s, { caller: a.actor, now: big(after.commit_deadline) + OFFSET_NS }, 0, big(args.unit_price), args.salt);
  }
  s = settle(s, { caller: OPENER, now: big(after.reveal_deadline) + OFFSET_NS }, 0).state;
  for (const a of okActions(run.actions, "confirm_delivery")) {
    s = confirmDelivery(s, { caller: a.actor, now: big(after.reveal_deadline) + 2n * SEC, yocto: 1n }, 0);
  }
  if ((s.rounds[0] as Round).state === "Settled") {
    s = finalize(s, { caller: OPENER, now: big(after.delivery_deadline) + OFFSET_NS }, 0).state;
  }
  return { state: s, round: s.rounds[0] as Round };
}

function balanceChecks(run: RoundRun, sim: MarketState): Check[] {
  return Object.keys(run.balancesAfter).flatMap((acc) => {
    const b4 = run.balancesBefore[acc] as BalanceView;
    const af = run.balancesAfter[acc] as BalanceView;
    const simAvail = sim.balances[acc] ?? 0n;
    const simHeld = sim.held[acc] ?? 0n;
    return [
      check(`delta available ${acc}`, String(big(af.available) - big(b4.available)), String(simAvail - big(b4.available))),
      check(`held after ${acc}`, af.held, String(simHeld)),
    ];
  });
}

function outcomeChecks(after: RoundView, r: Round): Check[] {
  const winnerSim = r.winner === null ? "none" : (r.bids[r.winner]?.sellerId ?? "none");
  const winnerChain = after.winner === null ? "none" : (after.bids[after.winner]?.seller_id ?? "none");
  const forfeitedSim = r.bids.filter((b) => b.revealedPrice === null).reduce((a, b) => a + b.bond, 0n);
  const forfeitedChain = after.bids.filter((b) => b.revealed_price === null).reduce((a, b) => a + big(b.bond), 0n);
  return [
    check("state", after.state, r.state),
    check("winner", winnerChain, winnerSim),
    check("clearing_price", after.clearing_price ?? "none", r.clearingPrice === null ? "none" : String(r.clearingPrice)),
    check("saving_vs_pihps", after.saving ?? "none", saving(r) === null ? "none" : String(saving(r))),
    check("total_qty", String(after.total_qty), String(r.totalQty)),
    check("forfeited_bonds", String(forfeitedChain), String(forfeitedSim)),
  ];
}

export function crossCheck(run: RoundRun): CrossCheck {
  try {
    const { state, round } = replay(run);
    const checks = [...outcomeChecks(run.roundAfter, round), ...balanceChecks(run, state)];
    const mismatches = checks.filter((c) => !c.ok);
    return { status: mismatches.length === 0 ? "MATCH" : "MISMATCH", checks, mismatches, error: null };
  } catch (e) {
    const msg = e instanceof ContractPanic ? `sim engine rejected a live action: ${e.message}` : String(e);
    return { status: "MISMATCH", checks: [], mismatches: [], error: msg };
  }
}

export type { BalanceSnapshot };
