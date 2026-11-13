/** Builds the GET /status body (exact contract shared with the dashboard). */
import { NETWORK } from "../config.js";
import { formatNearShort } from "../util.js";
import { estimateBurn } from "./budget.js";
import type { Cadence } from "./env.js";
import type { AgentEvent } from "./events.js";
import type { Runtime } from "./runtime.js";

export interface StatusBody {
  readonly ok: true;
  readonly network: string;
  readonly market: string;
  readonly service_public_key: string;
  readonly service_fc_allowance_near: string;
  readonly tick_secs: number;
  readonly last_tick_at: string | null;
  readonly cadence: Cadence;
  readonly next_open_at: string | null;
  readonly active_rounds: readonly { id: number; item: string; phase: string }[];
  readonly agents: {
    readonly grosir: readonly { account_id: string; near: string; tidr_wallet: string; market_available: string; paused: boolean }[];
    readonly seeded_warungs: number;
    readonly delegated_warungs: number;
  };
  readonly budget: { readonly est_near_per_day: string; readonly low_accounts: readonly string[] };
  readonly recent_events: readonly AgentEvent[];
  /** Additive: key files the process could not load (it keeps running without those accounts). */
  readonly missing_keys: readonly string[];
}

export function buildStatus(rt: Runtime, includeKoord: boolean = true): StatusBody {
  const grosir = rt.grosirs.map((g) => {
    const s = rt.cache.grosirStats.get(g.id);
    return {
      account_id: g.id, near: formatNearShort(s?.near ?? rt.health.near(g.id) ?? 0n),
      tidr_wallet: (s?.tidrWallet ?? 0n).toString(), market_available: (s?.marketAvailable ?? 0n).toString(),
      paused: rt.health.isPaused(g.id),
    };
  });
  const next = rt.cache.nextOpenAtMs;
  return {
    ok: true, network: NETWORK, market: rt.cfg.dep.market, service_public_key: rt.servicePublicKey ?? "",
    service_fc_allowance_near: rt.cfg.serviceFcAllowanceNear, tick_secs: rt.cfg.tickSecs, last_tick_at: rt.cache.lastTickAt,
    cadence: rt.cfg.cadence, next_open_at: includeKoord && next !== null ? new Date(next).toISOString() : null,
    active_rounds: rt.cache.activeRounds,
    agents: {
      grosir, seeded_warungs: rt.seeded.filter((s) => s.actor !== null).length,
      delegated_warungs: rt.state.allWarungs().length,
    },
    budget: { est_near_per_day: estimateBurn(rt.cfg).near_per_day.toFixed(3), low_accounts: rt.health.lowAccounts() },
    recent_events: rt.events.recent(), missing_keys: rt.health.missingKeys(),
  };
}
