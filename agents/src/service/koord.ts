/** Koordinator role: open rounds on cadence, settle/finalize anything that is due (crash recovery too). */
import { finalizeRound, openRound, settleRound, type KoordCtx } from "../agents/koordinator.js";
import type { ActionRecord } from "../chain/recorder.js";
import type { RoundView } from "../chain/views.js";
import { claim } from "./guard.js";
import { adminAction, lastOpenMs, nextOpenAtMs, planOpen } from "./scheduler.js";
import type { Runtime } from "./runtime.js";
import type { ItemView } from "../chain/views.js";

const OPEN_RETRY_GAP_MS = 30_000;
const ADMIN_GAP_MS = 20_000;
const MAX_ADMIN_ATTEMPTS = 6;

function koordCtx(rt: Runtime): KoordCtx {
  if (rt.koord === null) throw new Error(`no key for ${rt.koordId}`);
  return { dep: rt.cfg.dep, koordinator: rt.koord };
}

const koordReady = (rt: Runtime): boolean => rt.koord !== null && !rt.health.isPaused(rt.koordId);

export async function settleOrFinalize(rt: Runtime, r: RoundView): Promise<void> {
  const action = adminAction(r);
  if (action === null || !koordReady(rt)) return;
  if (!claim(rt, `${action}:${r.id}:${rt.koordId}`, MAX_ADMIN_ATTEMPTS, ADMIN_GAP_MS)) return;
  const w = koordCtx(rt);
  await (action === "settle" ? settleRound(w, r.id) : finalizeRound(w, r.id));
}

export async function maybeOpen(rt: Runtime, rounds: readonly RoundView[], items: readonly ItemView[], nowMs: number): Promise<void> {
  const sched = rt.state.scheduler();
  const last = lastOpenMs(sched, rounds);
  rt.cache.nextOpenAtMs = nextOpenAtMs(last, rt.cfg.cadence.round_every_min, nowMs);
  if (last !== null && last !== sched.last_open_at_ms) rt.state.patchScheduler({ last_open_at_ms: last });
  if (!koordReady(rt) || nowMs - rt.cache.lastOpenTryMs < OPEN_RETRY_GAP_MS) return;
  const plan = planOpen({ nowMs, everyMin: rt.cfg.cadence.round_every_min, rounds, items, sched: rt.state.scheduler() });
  if (plan === null) return;
  rt.cache.lastOpenTryMs = nowMs;
  const c = rt.cfg.cadence;
  const rec: ActionRecord = await openRound(koordCtx(rt), {
    item: plan.item.id, ceilingPrice: BigInt(plan.item.ref_price), minTotalQty: rt.cfg.minTotalQty,
    joinSecs: c.join_secs, commitSecs: c.commit_secs, revealSecs: c.reveal_secs, deliverySecs: c.delivery_secs,
  });
  if (rec.status === "ok") {
    rt.state.patchScheduler({ last_open_at_ms: nowMs, rotation: plan.nextRotation });
    rt.cache.nextOpenAtMs = nowMs + c.round_every_min * 60_000;
  }
}
