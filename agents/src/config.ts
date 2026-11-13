/** Constants and deployment layout. Amounts are bigint tIDR or yoctoNEAR. */
import { homedir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { grosirIds, warungIds } from "./sim-bridge.js";

export const NETWORK = "testnet";
export const DEFAULT_ROOT = "koelakan.testnet";
export const EXPLORER_TX_URL = "https://testnet.nearblocks.io/txns/";
export const DEFAULT_RPC_URLS: readonly string[] = [
  "https://rpc.testnet.fastnear.com",
  "https://rpc.testnet.near.org",
];

export const AGENTS_DIR = fileURLToPath(new URL("..", import.meta.url));
export const KEYS_DIR = join(AGENTS_DIR, ".keys");
const STATE_DIR = join(AGENTS_DIR, ".state");
export const OUT_DIR = join(AGENTS_DIR, "out");
export const SALTS_FILE = join(STATE_DIR, "salts.json");
export const CREDENTIALS_DIR = join(homedir(), ".near-credentials", NETWORK);

export const ONE_YOCTO = 1n;
const TGAS = 10n ** 12n;

/**
 * Gas budgets per method (prepaid; unused gas is refunded). The runtime checks the signer can afford
 * roughly 10x prepaid gas at the current price (pessimistic inflation), so budgets are kept modest:
 * a fresh 0.09 NEAR account cannot sign a 100 Tgas call, and a 0.05 NEAR function-call key
 * allowance cannot sign more than ~40 Tgas.
 */
export const GAS = {
  open: 30n * TGAS,
  join: 30n * TGAS,
  reveal: 30n * TGAS,
  confirm: 30n * TGAS,
  setPolicy: 30n * TGAS,
  faucet: 30n * TGAS,
  ftTransferCall: 60n * TGAS,
  settle: 150n * TGAS,
  finalize: 150n * TGAS,
} as const;

// Setup economics
export const ACCOUNT_FUNDING = 90n * 10n ** 21n; // 0.09 NEAR
export const ROOT_MIN_BALANCE = 5n * 10n ** 23n; // never drop root below 0.5 NEAR
export const FC_KEY_ALLOWANCE = 5n * 10n ** 22n; // 0.05 NEAR of gas
export const WARUNG_DEPOSIT = 900_000n;
export const WARUNG_WEEKLY_BUDGET = 2_000_000n;
export const GROSIR_MIN_WALLET = 500_000n; // faucet again below this

// Round defaults (seconds); the contract allows 30 s .. 30 days
export const DEFAULT_PHASES = { join: 90, commit: 60, reveal: 60, delivery: 60 } as const;
export const MIN_PHASE_SECS = 30;
export const MAX_PHASE_SECS = 30 * 24 * 3600;
export const POLL_INTERVAL_MS = 2_000;
export const MAX_WAIT_MS = 15 * 60 * 1000;
export const TX_CONCURRENCY = 3;

export interface Deployment {
  readonly root: string;
  readonly market: string;
  readonly tidr: string;
  readonly koordinator: string;
  readonly arbiter: string;
}

export function deployment(root: string = DEFAULT_ROOT): Deployment {
  return {
    root,
    market: `market.${root}`,
    tidr: `tidr.${root}`,
    koordinator: `koordinator.${root}`,
    arbiter: `arbiter.${root}`,
  };
}

/** Same population as the sim (shared via sim-bridge), so live rounds can be cross-checked against it. */
export const warungShortIds = warungIds;
export const grosirShortIds = grosirIds;
export const fullId = (short: string, root: string): string => `${short}.${root}`;
export const shortId = (account: string): string => account.split(".")[0] ?? account;
