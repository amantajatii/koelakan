/** Pure protocol helpers: commit hash, ft msgs, salts and call-argument builders. */
import { createHash, randomBytes } from "node:crypto";

export const SALT_BYTES = 16;
export const BOND_BPS = 500n;
const BPS_DENOM = 10_000n;
const SALT_RE = /^[0-9a-f]{32,}$/;

/** sha256("{round_id}:{seller}:{unit_price}:{salt}") as lowercase hex (matches contract `bid_hash`). */
export function bidHash(roundId: number, seller: string, unitPrice: bigint, salt: string): string {
  return createHash("sha256").update(`${roundId}:${seller}:${unitPrice}:${salt}`).digest("hex");
}

/** 16 cryptographically random bytes as 32 lowercase hex chars. */
export function newSalt(bytes: (n: number) => Buffer = randomBytes): string {
  return bytes(SALT_BYTES).toString("hex");
}

export function isValidSalt(salt: string): boolean {
  return SALT_RE.test(salt);
}

/** ceil(5% x ceiling x total_qty), same as the contract's `required_bond`. */
export function requiredBond(ceiling: bigint, totalQty: bigint): bigint {
  return (ceiling * totalQty * BOND_BPS + BPS_DENOM - 1n) / BPS_DENOM;
}

export const DEPOSIT_MSG = "deposit";

export function commitMsg(roundId: number, hash: string): string {
  return JSON.stringify({ commit: { round_id: roundId, hash } });
}

export interface FtTransferCallArgs {
  readonly receiver_id: string;
  readonly amount: string;
  readonly msg: string;
}

export function ftTransferCallArgs(receiver: string, amount: bigint, msg: string): FtTransferCallArgs {
  return { receiver_id: receiver, amount: amount.toString(), msg };
}

export interface OpenRoundParams {
  readonly item: string;
  readonly ceilingPrice: bigint;
  readonly minTotalQty: number;
  readonly joinSecs: number;
  readonly commitSecs: number;
  readonly revealSecs: number;
  readonly deliverySecs: number;
}

export interface OpenRoundArgsJson {
  readonly item: string;
  readonly ceiling_price: string;
  readonly min_total_qty: number;
  readonly join_secs: number;
  readonly commit_secs: number;
  readonly reveal_secs: number;
  readonly delivery_secs: number;
}

export function openRoundArgs(p: OpenRoundParams): OpenRoundArgsJson {
  return {
    item: p.item,
    ceiling_price: p.ceilingPrice.toString(),
    min_total_qty: p.minTotalQty,
    join_secs: p.joinSecs,
    commit_secs: p.commitSecs,
    reveal_secs: p.revealSecs,
    delivery_secs: p.deliverySecs,
  };
}

export const joinRoundArgs = (roundId: number, qty: bigint): { round_id: number; qty: number } => ({ round_id: roundId, qty: Number(qty) });
export const revealArgs = (roundId: number, unitPrice: bigint, salt: string): { round_id: number; unit_price: string; salt: string } => ({
  round_id: roundId,
  unit_price: unitPrice.toString(),
  salt,
});
export const roundIdArgs = (roundId: number): { round_id: number } => ({ round_id: roundId });

export interface PolicyJson {
  readonly max_price: Record<string, string>;
  readonly weekly_budget: string;
  readonly auto_join: boolean;
}

/** Owner policy per RULES §3: max price per item = reference price. */
export function policyArgs(refPrices: Readonly<Record<string, bigint>>, weeklyBudget: bigint): { policy: PolicyJson } {
  const max_price = Object.fromEntries(Object.entries(refPrices).map(([k, v]) => [k, v.toString()]));
  return { policy: { max_price, weekly_budget: weeklyBudget.toString(), auto_join: true } };
}

export function policyMatches(actual: PolicyJson | null, wanted: PolicyJson): boolean {
  if (actual === null) return false;
  if (actual.weekly_budget !== wanted.weekly_budget || actual.auto_join !== wanted.auto_join) return false;
  const keys = Object.keys(wanted.max_price);
  return keys.length === Object.keys(actual.max_price).length && keys.every((k) => actual.max_price[k] === wanted.max_price[k]);
}
