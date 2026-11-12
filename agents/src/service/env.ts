/** Environment parsing for the daemon and the external grosir. Fails fast with a clear message. */
import { homedir } from "node:os";
import { join, resolve } from "node:path";
import { KEYS_DIR as DEFAULT_FCK_DIR, MAX_PHASE_SECS, MIN_PHASE_SECS, NETWORK, deployment, type Deployment } from "../config.js";

export type Env = Readonly<Record<string, string | undefined>>;

export interface Cadence {
  readonly round_every_min: number;
  readonly join_secs: number;
  readonly commit_secs: number;
  readonly reveal_secs: number;
  readonly delivery_secs: number;
}

export interface DaemonConfig {
  readonly dep: Deployment;
  readonly port: number;
  readonly tickSecs: number;
  readonly cadence: Cadence;
  readonly minTotalQty: number;
  readonly seededJoinMin: number;
  readonly seededJoinMax: number;
  readonly forgetProb: number;
  readonly grosirBidders: number;
  readonly dataDir: string;
  readonly credentialsDir: string;
  readonly fckDir: string;
  readonly serviceKey: string | null;
  readonly serviceFcAllowanceNear: string;
  readonly allowedOrigins: readonly string[];
  readonly trustProxy: boolean;
  readonly withdrawThreshold: bigint;
  readonly housekeepSecs: number;
}

/** 60 min keeps the burn at about 0.3 NEAR/day across all accounts (see budget.ts). */
export const DEFAULT_ROUND_EVERY_MIN = 60;
export const LOCALHOST_ORIGIN = "http://localhost:3000";

export function intEnv(env: Env, name: string, fallback: number, min: number, max: number): number {
  const raw = env[name]?.trim();
  if (raw === undefined || raw === "") return fallback;
  const n = Number(raw);
  if (!Number.isInteger(n) || n < min || n > max) throw new Error(`${name} must be an integer in ${min}..${max} (got '${raw}')`);
  return n;
}

export function floatEnv(env: Env, name: string, fallback: number, min: number, max: number): number {
  const raw = env[name]?.trim();
  if (raw === undefined || raw === "") return fallback;
  const n = Number(raw);
  if (!Number.isFinite(n) || n < min || n > max) throw new Error(`${name} must be a number in ${min}..${max} (got '${raw}')`);
  return n;
}

const boolEnv = (env: Env, name: string, fallback: boolean): boolean => {
  const raw = env[name]?.trim().toLowerCase();
  return raw === undefined || raw === "" ? fallback : ["1", "true", "yes"].includes(raw);
};

const expandHome = (p: string): string => (p.startsWith("~/") ? join(homedir(), p.slice(2)) : p);

export function parseCadence(env: Env): Cadence {
  const phase = (name: string, d: number): number => intEnv(env, name, d, MIN_PHASE_SECS, MAX_PHASE_SECS);
  return {
    round_every_min: intEnv(env, "ROUND_EVERY_MIN", DEFAULT_ROUND_EVERY_MIN, 1, 7 * 24 * 60),
    join_secs: phase("JOIN_SECS", 300), commit_secs: phase("COMMIT_SECS", 90),
    reveal_secs: phase("REVEAL_SECS", 90), delivery_secs: phase("DELIVERY_SECS", 600),
  };
}

export function loadConfig(env: Env = process.env): DaemonConfig {
  const min = intEnv(env, "SEEDED_JOIN_MIN", 6, 0, 20);
  const max = intEnv(env, "SEEDED_JOIN_MAX", 9, 0, 20);
  if (max < min) throw new Error("SEEDED_JOIN_MAX must be >= SEEDED_JOIN_MIN");
  return {
    dep: deployment(env.KOELAKAN_ROOT?.trim() || undefined),
    port: intEnv(env, "PORT", 8787, 1, 65535),
    tickSecs: intEnv(env, "TICK_SECS", 10, 1, 600),
    cadence: parseCadence(env),
    minTotalQty: intEnv(env, "MIN_TOTAL_QTY", 50, 1, 1_000_000),
    seededJoinMin: min, seededJoinMax: max,
    forgetProb: floatEnv(env, "FORGET_PROB", 0.15, 0, 1),
    grosirBidders: intEnv(env, "GROSIR_BIDDERS", 3, 1, 5),
    dataDir: resolve(expandHome(env.DATA_DIR?.trim() || "./.data")),
    credentialsDir: resolve(expandHome(env.KEYS_DIR?.trim() || join(homedir(), ".near-credentials", NETWORK))),
    fckDir: resolve(expandHome(env.FCK_DIR?.trim() || DEFAULT_FCK_DIR)),
    serviceKey: env.SERVICE_KEY?.trim() || null,
    serviceFcAllowanceNear: env.SERVICE_FC_ALLOWANCE_NEAR?.trim() || "0.25",
    allowedOrigins: [...new Set([LOCALHOST_ORIGIN, ...(env.ALLOWED_ORIGINS ?? "").split(",").map((s) => s.trim()).filter(Boolean)])],
    trustProxy: boolEnv(env, "TRUST_PROXY", false),
    withdrawThreshold: BigInt(intEnv(env, "WITHDRAW_THRESHOLD", 200_000, 1, 2 ** 52)),
    housekeepSecs: intEnv(env, "HOUSEKEEP_SECS", 120, 10, 86_400),
  };
}
