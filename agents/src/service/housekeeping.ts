/** Periodic NEAR-balance refresh and grosir upkeep. Cadence is wall-clock, independent of rounds. */
import { TX_CONCURRENCY } from "../config.js";
import { mapLimit } from "../util.js";
import { MIN_ACCOUNT_NEAR, MIN_WARUNG_NEAR } from "./budget.js";
import { grosirHousekeepSafely } from "./grosir-agent.js";
import { safely } from "./guard.js";
import { ensureSolvent } from "./seeded.js";
import type { Runtime } from "./runtime.js";

const WARUNG_HOUSEKEEP_MS = 10 * 60 * 1000;

async function refreshNear(rt: Runtime, account: string, threshold: bigint): Promise<void> {
  await safely(rt, "balance refresh", async () => {
    const wasLow = rt.health.isLow(account);
    rt.health.setBalance(account, await rt.views.nearBalance(account), threshold);
    if (rt.health.isLow(account) && !wasLow) {
      rt.events.emit({ kind: "account_paused", account, message: `${account} is low on NEAR: signing paused until it is topped up` });
    }
  }, account);
}

/** Cheap enough to call every tick: it only does work when an interval has elapsed. */
export async function housekeeping(rt: Runtime, nowMs: number, includeGrosirs: boolean, includeKoord: boolean): Promise<void> {
  const { cache, cfg } = rt;
  if (nowMs - cache.housekeptAt >= cfg.housekeepSecs * 1000) {
    cache.housekeptAt = nowMs;
    if (includeKoord) await refreshNear(rt, rt.koordId, MIN_ACCOUNT_NEAR);
    if (includeGrosirs) await mapLimit(rt.grosirs, TX_CONCURRENCY, (g) => grosirHousekeepSafely(rt, g));
  }
  if (nowMs - cache.warungHousekeptAt >= WARUNG_HOUSEKEEP_MS) {
    cache.warungHousekeptAt = nowMs;
    await mapLimit(rt.seeded, TX_CONCURRENCY, async (s) => {
      await refreshNear(rt, s.id, MIN_WARUNG_NEAR);
      await safely(rt, "solvency", () => ensureSolvent(rt, s), s.id);
    });
    await mapLimit(rt.state.allWarungs(), TX_CONCURRENCY, (w) => refreshNear(rt, w.account_id, MIN_WARUNG_NEAR));
  }
}
