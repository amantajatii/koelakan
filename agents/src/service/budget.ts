/** NEAR burn estimator and the low-balance guard. Numbers are Tgas actually burnt (not prepaid). */
import type { DaemonConfig } from "./env.js";

/** Testnet minimum gas price: 1e8 yocto per gas, so 1 Tgas costs 0.0001 NEAR. */
const NEAR_PER_TGAS = 0.0001;
export const MIN_ACCOUNT_NEAR = 20n * 10n ** 21n; // 0.02 NEAR: below this we stop signing for the account
export const MIN_WARUNG_NEAR = 10n * 10n ** 21n; // seeded warungs only pay for joins, confirms and top-ups
const ROUNDS_PER_DAY_MIN = 1_440;
const SAFETY_MARGIN = 1.15;

/**
 * Calibrated on testnet (see README "NEAR budget math"): a live run of 142 transactions across all 26
 * accounts burnt 0.049 NEAR, i.e. about 3.5 Tgas per transaction on average. Per-method values are
 * rounded estimates around that measurement. `topup` is the faucet + deposit pair.
 */
export const BURN_TGAS = {
  open: 3, join: 4, commit: 8, reveal: 3, confirm: 3, settle: 8, finalize: 8, withdraw: 5, topup: 6,
} as const;

export interface BurnEstimate {
  readonly rounds_per_day: number;
  readonly near_per_round: number;
  readonly near_per_day: number;
}

export function estimateBurn(cfg: Pick<DaemonConfig, "cadence" | "seededJoinMin" | "seededJoinMax" | "grosirBidders" | "forgetProb">): BurnEstimate {
  const joins = (cfg.seededJoinMin + cfg.seededJoinMax) / 2;
  const bidders = cfg.grosirBidders;
  const reveals = bidders - cfg.forgetProb;
  const tgas =
    BURN_TGAS.open + joins * BURN_TGAS.join + bidders * BURN_TGAS.commit + reveals * BURN_TGAS.reveal +
    Math.max(0, joins - 1) * BURN_TGAS.confirm + BURN_TGAS.settle + BURN_TGAS.finalize + bidders * BURN_TGAS.withdraw +
    (joins / 4) * BURN_TGAS.topup;
  const perRound = tgas * NEAR_PER_TGAS * SAFETY_MARGIN;
  const roundsPerDay = ROUNDS_PER_DAY_MIN / cfg.cadence.round_every_min;
  return { rounds_per_day: roundsPerDay, near_per_round: perRound, near_per_day: perRound * roundsPerDay };
}

/** Tracks last-known NEAR balances and which accounts are paused (too low or no key). */
export class Health {
  private balances: ReadonlyMap<string, bigint> = new Map();
  private thresholds: ReadonlyMap<string, bigint> = new Map();
  private missing: ReadonlySet<string> = new Set();

  setBalance(account: string, yocto: bigint, threshold: bigint = MIN_ACCOUNT_NEAR): void {
    this.balances = new Map(this.balances).set(account, yocto);
    this.thresholds = new Map(this.thresholds).set(account, threshold);
  }

  setMissing(accounts: Iterable<string>): void {
    this.missing = new Set(accounts);
  }

  near(account: string): bigint | null {
    return this.balances.get(account) ?? null;
  }

  isLow(account: string): boolean {
    const b = this.balances.get(account);
    return b !== undefined && b < (this.thresholds.get(account) ?? MIN_ACCOUNT_NEAR);
  }

  /** Paused = low NEAR or no key. Unknown balance (not fetched yet) is not paused. */
  isPaused(account: string): boolean {
    return this.isLow(account) || this.missing.has(account);
  }

  lowAccounts(): string[] {
    return [...this.balances.keys()].filter((a) => this.isLow(a));
  }

  missingKeys(): string[] {
    return [...this.missing];
  }
}
