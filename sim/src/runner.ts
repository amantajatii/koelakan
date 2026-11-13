/** Runs the seeded simulation against the engine and returns a plain report. */
import {
  ADMIN, ARBITER, CATALOGUE, COMMIT_SECS, DELIVERY_SECS, DISPUTE_ROUND, DISPUTING_WARUNG,
  FORGETFUL_GROSIR, GROSIR_WALLET, JOIN_SECS, KOORDINATOR, MIN_TOTAL_QTY, REVEAL_SECS, ROUND_SPACING_NS,
  SEED, T0_NS, TOKEN, WARUNG_DEPOSIT, WARUNG_MAX_PRICE_SLACK_BPS, WARUNG_WEEKLY_BUDGET,
  buildPopulation, quote,
  type GrosirProfile, type WarungProfile,
} from "./config.js";
import {
  ContractPanic, bidHash, checkInvariant, commitBid, confirmDelivery, deposit, dispute, finalize,
  joinRound, newMarket, openRound, requiredBond, resolveDispute, revealBid,
  setItem, setPolicy, settle, withdraw, NS,
  type Item, type MarketState, type Round,
} from "./engine.js";
import { buildRoundReport, type RoundReport, type RunReport } from "./report.js";

const SEC = NS;
const SALT_BYTES = 16;

interface Sim {
  state: MarketState;
  tokenIn: bigint;
  wallets: Record<string, bigint>;
}

const ctx = (caller: string, now: bigint, yocto?: bigint) => ({ caller, now, ...(yocto === undefined ? {} : { yocto }) });

function saltFor(round: number, grosir: string): string {
  // Deterministic stand-in for 16 random bytes; a live agent must use crypto randomness.
  return `${grosir}-r${round}`.padEnd(SALT_BYTES * 2, "0");
}

function setup(warungs: readonly WarungProfile[], grosirs: readonly GrosirProfile[]): Sim {
  let s = newMarket(ADMIN, ARBITER, TOKEN);
  for (const item of CATALOGUE) s = setItem(s, ctx(ADMIN, T0_NS, 1n), item);
  let tokenIn = 0n;
  for (const w of warungs) {
    s = deposit(s, T0_NS, w.id, WARUNG_DEPOSIT);
    tokenIn += WARUNG_DEPOSIT;
    const maxPrice = Object.fromEntries(
      CATALOGUE.map((i) => [i.id, (i.refPrice * WARUNG_MAX_PRICE_SLACK_BPS) / 10_000n]),
    );
    s = setPolicy(s, ctx(w.id, T0_NS, 1n), { maxPrice, weeklyBudget: WARUNG_WEEKLY_BUDGET, autoJoin: true });
  }
  const wallets = Object.fromEntries(grosirs.map((g) => [g.id, GROSIR_WALLET]));
  return { state: s, tokenIn, wallets };
}

function joinAll(sim: Sim, roundId: number, warungs: readonly WarungProfile[], item: Item, t: bigint) {
  const rejected: { account: string; reason: string }[] = [];
  for (const w of warungs) {
    try {
      sim.state = joinRound(sim.state, ctx(w.id, t), roundId, w.qty[item.id] ?? 0n);
    } catch (e) {
      if (!(e instanceof ContractPanic)) throw e;
      rejected.push({ account: w.id, reason: e.message });
    }
  }
  return rejected;
}

function commitAll(sim: Sim, roundId: number, grosirs: readonly GrosirProfile[], item: Item, ceiling: bigint, t: bigint) {
  const round = sim.state.rounds[roundId] as Round;
  const bond = requiredBond(round.ceilingPrice, round.totalQty);
  const prices = new Map<string, bigint>();
  for (const g of grosirs) {
    const price = quote(g, item.id);
    const forced = g.id === FORGETFUL_GROSIR; // always commits, to exercise the forfeit path
    if (!forced && price > ceiling) continue;
    if ((sim.wallets[g.id] ?? 0n) < bond) continue;
    const hash = bidHash(roundId, g.id, price, saltFor(roundId, g.id));
    sim.state = commitBid(sim.state, t, g.id, bond, roundId, hash);
    sim.wallets[g.id] = (sim.wallets[g.id] ?? 0n) - bond;
    sim.tokenIn += bond;
    prices.set(g.id, price);
  }
  return prices;
}

function revealAll(sim: Sim, roundId: number, prices: Map<string, bigint>, t: bigint) {
  for (const [id, price] of prices) {
    if (id === FORGETFUL_GROSIR) continue;
    sim.state = revealBid(sim.state, ctx(id, t), roundId, price, saltFor(roundId, id));
  }
}

function deliver(sim: Sim, roundId: number, t: bigint): { account: string; refunded: boolean }[] {
  const round = sim.state.rounds[roundId] as Round;
  const disputes: { account: string; refunded: boolean }[] = [];
  if (round.state !== "Settled") return disputes;
  for (const p of round.participants) {
    const disputing = roundId === DISPUTE_ROUND && p.accountId === DISPUTING_WARUNG;
    if (disputing) {
      sim.state = dispute(sim.state, ctx(p.accountId, t, 1n), roundId);
      sim.state = resolveDispute(sim.state, ctx(ARBITER, t + 10n * SEC), roundId, p.accountId, true);
      disputes.push({ account: p.accountId, refunded: true });
    } else {
      sim.state = confirmDelivery(sim.state, ctx(p.accountId, t, 1n), roundId);
    }
  }
  return disputes;
}

function runRound(sim: Sim, k: number, item: Item, pop: ReturnType<typeof buildPopulation>): RoundReport {
  const base = T0_NS + BigInt(k) * ROUND_SPACING_NS;
  const at = (secs: bigint) => base + secs * SEC;
  sim.state = openRound(sim.state, ctx(KOORDINATOR, base), {
    item: item.id, ceilingPrice: item.refPrice, minTotalQty: MIN_TOTAL_QTY,
    joinSecs: JOIN_SECS, commitSecs: COMMIT_SECS, revealSecs: REVEAL_SECS, deliverySecs: DELIVERY_SECS,
  });
  const roundId = sim.state.rounds.length - 1;
  const rejected = joinAll(sim, roundId, pop.warungs, item, at(10n));
  const joined = sim.state.rounds[roundId] as Round;
  const prices = commitAll(sim, roundId, pop.grosirs, item, item.refPrice, at(JOIN_SECS + 10n));
  revealAll(sim, roundId, prices, at(JOIN_SECS + COMMIT_SECS + 10n));
  const settleAt = at(JOIN_SECS + COMMIT_SECS + REVEAL_SECS + 10n);
  sim.state = settle(sim.state, ctx(KOORDINATOR, settleAt), roundId).state;
  const disputes = deliver(sim, roundId, settleAt + 10n * SEC);
  const finalAt = at(JOIN_SECS + COMMIT_SECS + REVEAL_SECS + DELIVERY_SECS + 10n);
  if ((sim.state.rounds[roundId] as Round).state === "Settled") {
    sim.state = finalize(sim.state, ctx(KOORDINATOR, finalAt), roundId).state;
  }
  checkInvariant(sim.state);
  return buildRoundReport(roundId, joined, sim.state.rounds[roundId] as Round, rejected, disputes);
}

function withdrawAll(sim: Sim, now: bigint): bigint {
  let out = 0n;
  for (const [acc, bal] of Object.entries(sim.state.balances)) {
    if (bal === 0n) continue;
    sim.state = withdraw(sim.state, ctx(acc, now, 1n), bal);
    out += bal;
  }
  return out;
}

export function runSimulation(seed: number = SEED): RunReport {
  const pop = buildPopulation(seed);
  const sim = setup(pop.warungs, pop.grosirs);
  const rounds = CATALOGUE.map((item, k) => runRound(sim, k, item, pop));
  const end = T0_NS + BigInt(CATALOGUE.length + 1) * ROUND_SPACING_NS;
  const totalOut = withdrawAll(sim, end);
  checkInvariant(sim.state);
  return { seed, rounds, totalIn: sim.tokenIn, totalOut, conserved: sim.tokenIn === totalOut && sim.state.tokenHeld === 0n };
}
