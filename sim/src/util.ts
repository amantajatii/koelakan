import { createHash } from "node:crypto";
import type { Phase, Round } from "./types.js";

export const NS = 1_000_000_000n;
export const WEEK_NS = 7n * 24n * 3_600n * NS;
export const MAX_PARTICIPANTS = 50;
export const MAX_BIDS = 10;
export const MIN_PHASE_SECS = 30n;
export const MAX_PHASE_SECS = 30n * 24n * 3_600n;
export const BOND_BPS = 500n; // 5%
export const BPS_DENOM = 10_000n;

/** A contract panic. The message text mirrors the Rust contract. */
export class ContractPanic extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ContractPanic";
  }
}

export function require(cond: boolean, message: string): asserts cond {
  if (!cond) throw new ContractPanic(message);
}

export function assertOneYocto(yocto: bigint | undefined): void {
  require(yocto === 1n, "Requires attached deposit of exactly 1 yoctoNEAR");
}

/** sha256("{round_id}:{seller}:{unit_price}:{salt}") as lowercase hex. */
export function bidHash(roundId: number, seller: string, unitPrice: bigint, salt: string): string {
  return createHash("sha256").update(`${roundId}:${seller}:${unitPrice}:${salt}`).digest("hex");
}

/** ceil(5% x ceiling x total_qty). */
export function requiredBond(ceiling: bigint, totalQty: bigint): bigint {
  const base = ceiling * totalQty * BOND_BPS;
  return (base + BPS_DENOM - 1n) / BPS_DENOM;
}

export function weekOf(now: bigint): bigint {
  return now / WEEK_NS;
}

export function phaseOf(r: Round, now: bigint): Phase {
  switch (r.state) {
    case "Failed":
      return "Failed";
    case "Closed":
      return "Closed";
    case "Settled":
      return now < r.deliveryDeadline ? "Delivery" : "AwaitingFinalize";
    case "Active":
      if (now < r.joinDeadline) return "Join";
      if (r.totalQty < r.minTotalQty || now >= r.revealDeadline) return "ReadyToSettle";
      return now < r.commitDeadline ? "Commit" : "Reveal";
  }
}

/** Floor split pro rata to qty; the remainder goes to the largest qty (earliest on tie). */
export function proRataShares(total: bigint, qtys: readonly bigint[]): bigint[] {
  const tq = qtys.reduce((a, b) => a + b, 0n);
  const shares = qtys.map((q) => (total * q) / tq);
  const rest = total - shares.reduce((a, b) => a + b, 0n);
  if (rest === 0n) return shares;
  const best = qtys.reduce((bi, q, i) => (q > (qtys[bi] ?? 0n) ? i : bi), 0);
  return shares.map((s, i) => (i === best ? s + rest : s));
}
