/** `pnpm grosir`: a real wholesaler's own bidding agent (grosir role only). */
import { readFileSync } from "node:fs";
import type { KeyPairString } from "near-api-js";
import type { RoundView } from "../chain/views.js";
import { DEFAULT_ROOT, fullId } from "../config.js";
import { intEnv, loadConfig, type Env } from "./env.js";
import { Events } from "./events.js";
import type { GrosirPolicy } from "./grosir-agent.js";
import { installShutdown, Stopper } from "./loop.js";
import { buildRuntime, type Runtime } from "./runtime.js";
import { tick, type TickRoles } from "./tick.js";

const BPS = 10_000n;
const MAX_MARGIN_BPS = 100_000;

export interface PricingEntry {
  readonly cost: bigint;
  readonly marginBps: bigint;
}

export function parsePricing(raw: unknown): Readonly<Record<string, PricingEntry>> {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) throw new Error("pricing file must be a JSON object keyed by item id");
  const out: Record<string, PricingEntry> = {};
  for (const [item, v] of Object.entries(raw)) {
    const e = v as { cost?: unknown; margin_bps?: unknown };
    if (!Number.isInteger(e.cost) || (e.cost as number) < 1) throw new Error(`pricing['${item}'].cost must be an integer >= 1`);
    if (!Number.isInteger(e.margin_bps) || (e.margin_bps as number) < 0 || (e.margin_bps as number) > MAX_MARGIN_BPS) {
      throw new Error(`pricing['${item}'].margin_bps must be an integer 0..${MAX_MARGIN_BPS}`);
    }
    out[item] = { cost: BigInt(e.cost as number), marginBps: BigInt(e.margin_bps as number) };
  }
  return out;
}

/** unit_price = round(cost x (1 + margin)). 0 when the item is not priced. */
export const priceOf = (p: Readonly<Record<string, PricingEntry>>, item: string): bigint => {
  const e = p[item];
  return e === undefined ? 0n : (e.cost * (BPS + e.marginBps) + BPS / 2n) / BPS;
};

export interface ExternalGrosirConfig {
  readonly accountId: string;
  readonly privateKey: KeyPairString | null;
  readonly pricing: Readonly<Record<string, PricingEntry>>;
  readonly minBid: bigint | undefined;
  readonly maxBond: bigint | undefined;
}

function loadExternalConfig(env: Env): ExternalGrosirConfig {
  const accountId = env.ACCOUNT_ID?.trim();
  if (!accountId) throw new Error("ACCOUNT_ID is required (the grosir's NEAR account)");
  const file = env.PRICING_FILE?.trim();
  if (!file) throw new Error("PRICING_FILE is required (see deploy/grosir.example.json)");
  const key = env.PRIVATE_KEY?.trim();
  if (key !== undefined && key !== "" && !key.startsWith("ed25519:")) throw new Error("PRIVATE_KEY must be an ed25519:... secret key");
  return {
    accountId, privateKey: key ? (key as KeyPairString) : null, pricing: parsePricing(JSON.parse(readFileSync(file, "utf8"))),
    minBid: env.MIN_BID ? BigInt(intEnv(env, "MIN_BID", 1, 1, 2 ** 52)) : undefined,
    maxBond: env.MAX_BOND ? BigInt(intEnv(env, "MAX_BOND", 1, 1, 2 ** 52)) : undefined,
  };
}

function externalPolicy(c: ExternalGrosirConfig): GrosirPolicy {
  return {
    quote: (item) => priceOf(c.pricing, item), bids: (_r: RoundView) => true, forgets: () => false,
    ...(c.minBid !== undefined ? { minBid: c.minBid } : {}), ...(c.maxBond !== undefined ? { maxBond: c.maxBond } : {}),
  };
}

const externalRoles = (c: ExternalGrosirConfig): TickRoles => ({
  koordinator: false, grosirs: true, seeded: false, delegated: false, grosirPolicy: () => externalPolicy(c),
});

export async function runExternalGrosir(env: Env = process.env): Promise<void> {
  const cfg = loadConfig(env);
  const ext = loadExternalConfig(env);
  const events = new Events();
  const id = ext.accountId.includes(".") ? ext.accountId : fullId(ext.accountId, env.KOELAKAN_ROOT ?? DEFAULT_ROOT);
  const rt: Runtime = await buildRuntime(cfg, events, {
    roles: { koordinator: false, seeded: false }, grosirIds: [id],
    ...(ext.privateKey ? { keyOverride: { id, key: ext.privateKey } } : {}),
  });
  const missing = rt.health.missingKeys();
  if (missing.length > 0) throw new Error(`no key for ${missing.join(", ")} in ${cfg.credentialsDir} (or set PRIVATE_KEY)`);
  events.emit({ kind: "startup", account: id, message: `external grosir ${id} on ${cfg.dep.market}, ${Object.keys(ext.pricing).length} priced item(s)` });
  const stop = new Stopper();
  const roles = externalRoles(ext);
  const done = (async () => {
    while (!stop.requested) {
      try {
        await tick(rt, roles, Date.now(), () => stop.requested);
      } catch (e) {
        events.emit({ kind: "error", message: `tick failed: ${e instanceof Error ? e.message : String(e)}` });
      }
      await stop.sleep(cfg.tickSecs * 1000);
    }
    await rt.cache.background;
  })();
  installShutdown(rt, stop, done, async () => undefined);
  await done;
}
