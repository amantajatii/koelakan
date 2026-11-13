/**
 * Simulation configuration: 20 warungs, 5 grosir, the 4-item catalogue.
 *
 * ASSUMPTIONS:
 *   - REAL DATA: reference prices (`refPrice`) and HET come from PIHPS Nasional,
 *     11 Nov 2026 (see data/prices.json). They are the only real numbers here.
 *   - INVENTED: every grosir cost factor, margin, warung quantity, deposit and
 *     budget below is an assumption made for the simulation. No grosir has
 *     published cost data. Costs are drawn as 0.85-0.97 x HET.
 *   - ASSUMPTION: minyak-curah has no HET, so its cost base is 0.80 x ref_price.
 *   - All randomness comes from a seeded PRNG, so runs are deterministic.
 */
import { randInt, mulberry32, type Rng } from "./rng.js";
import type { Item } from "./types.js";

export const SEED = 20261111;
export const T0_NS = 1_000_000_000_000n; // 1000 s after epoch, inside week 0
export const ROUND_SPACING_NS = 2_000n * 1_000_000_000n;

const NUM_WARUNGS = 20;
const NUM_GROSIR = 5;
/** This grosir commits but never reveals (forfeit path). */
export const FORGETFUL_GROSIR = "grosir-5";

const COST_FACTOR_MIN_BPS = 8_500n; // 0.85 x HET
const COST_FACTOR_MAX_BPS = 9_700n; // 0.97 x HET
const NO_HET_BASE_BPS = 8_000n; // ASSUMPTION: 0.80 x ref_price when het is null
const MARGIN_MIN_BPS = 200n; // ASSUMPTION: 2%
const MARGIN_MAX_BPS = 800n; // ASSUMPTION: 8%

export const WARUNG_DEPOSIT = 3_000_000n;
export const WARUNG_MAX_PRICE_SLACK_BPS = 10_500n; // owner accepts up to 1.05 x ref_price
export const WARUNG_WEEKLY_BUDGET = 2_000_000n;
const WARUNG_QTY_MIN = 5;
const WARUNG_QTY_MAX = 25;
export const MIN_TOTAL_QTY = 100n;
export const GROSIR_WALLET = 1_000_000_000n;

export const JOIN_SECS = 120n;
export const COMMIT_SECS = 60n;
export const REVEAL_SECS = 60n;
export const DELIVERY_SECS = 300n;

/** One warung is scripted to dispute in this round index, and the arbiter refunds it. */
export const DISPUTE_ROUND = 1;
export const DISPUTING_WARUNG = "warung-07";

export const ADMIN = "admin";
export const ARBITER = "arbiter";
export const TOKEN = "tidr";
export const KOORDINATOR = "koordinator";

const pad = (n: number) => String(n).padStart(2, "0");
export const warungIds = (): string[] => Array.from({ length: NUM_WARUNGS }, (_, i) => `warung-${pad(i + 1)}`);
export const grosirIds = (): string[] => Array.from({ length: NUM_GROSIR }, (_, i) => `grosir-${i + 1}`);

/** Real prices: PIHPS Nasional, 11 Nov 2026 (mirrors data/prices.json). */
export const CATALOGUE: readonly Item[] = [
  { id: "beras-medium", name: "Beras medium (tipe II)", unit: "kg", refPrice: 16650n, het: 13500n, source: "PIHPS Nasional", asOf: "2026-11-11" },
  { id: "gula-pasir", name: "Gula pasir lokal", unit: "kg", refPrice: 19950n, het: 17500n, source: "PIHPS Nasional", asOf: "2026-11-11" },
  { id: "telur-ayam", name: "Telur ayam ras", unit: "kg", refPrice: 28350n, het: 30000n, source: "PIHPS Nasional", asOf: "2026-11-11" },
  { id: "minyak-curah", name: "Minyak goreng curah", unit: "kg", refPrice: 20800n, het: null, source: "PIHPS Nasional", asOf: "2026-11-11" },
];

export interface GrosirProfile {
  readonly id: string;
  /** Cost per item id, in tIDR per unit. ASSUMPTION (invented). */
  readonly cost: Readonly<Record<string, bigint>>;
  /** Margin in basis points. ASSUMPTION (invented). */
  readonly marginBps: bigint;
}

function costBase(item: Item): bigint {
  return item.het !== null ? item.het : (item.refPrice * NO_HET_BASE_BPS) / 10_000n;
}

function makeGrosir(rng: Rng, id: string): GrosirProfile {
  const cost: Record<string, bigint> = {};
  for (const item of CATALOGUE) {
    const factor = randInt(rng, COST_FACTOR_MIN_BPS, COST_FACTOR_MAX_BPS);
    cost[item.id] = (costBase(item) * factor) / 10_000n;
  }
  return { id, cost, marginBps: randInt(rng, MARGIN_MIN_BPS, MARGIN_MAX_BPS) };
}

/** unit_price = cost x (1 + margin), integer floor. */
export function quote(g: GrosirProfile, itemId: string): bigint {
  return ((g.cost[itemId] ?? 0n) * (10_000n + g.marginBps)) / 10_000n;
}

export interface WarungProfile {
  readonly id: string;
  /** Qty per catalogue item (kg). ASSUMPTION (invented). */
  readonly qty: Readonly<Record<string, bigint>>;
}

export function makeWarung(rng: Rng, id: string): WarungProfile {
  const qty: Record<string, bigint> = {};
  for (const item of CATALOGUE) qty[item.id] = randInt(rng, BigInt(WARUNG_QTY_MIN), BigInt(WARUNG_QTY_MAX));
  return { id, qty };
}

export interface Population {
  readonly warungs: WarungProfile[];
  readonly grosirs: GrosirProfile[];
}

export function buildPopulation(seed: number = SEED): Population {
  const rng = mulberry32(seed);
  const warungs = warungIds().map((id) => makeWarung(rng, id));
  const grosirs = grosirIds().map((id) => makeGrosir(rng, id));
  return { warungs, grosirs };
}
