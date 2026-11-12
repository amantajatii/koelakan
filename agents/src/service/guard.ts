/** Idempotency helpers: attempt claims persisted before sending, and an error fence per unit of work. */
import { skipRecord, type ActionRecord } from "../chain/recorder.js";
import type { Runtime } from "./runtime.js";

/**
 * Returns true (and persists the attempt) if `key` has fewer than `max` attempts and the last try
 * was at least `gapMs` ago. The attempt is counted BEFORE the tx is sent.
 */
export function claim(rt: Runtime, key: string, max: number, gapMs = 0): boolean {
  const now = Date.now();
  if (rt.state.attempts(key) >= max) return false;
  const last = rt.cache.lastTry.get(key);
  if (last !== undefined && now - last < gapMs) return false;
  rt.cache.lastTry.set(key, now);
  rt.state.bumpAttempt(key);
  return true;
}

/** One failing account or round must never crash the loop. */
export async function safely(rt: Runtime, label: string, fn: () => Promise<void>, account?: string, roundId?: number): Promise<void> {
  try {
    await fn();
  } catch (e) {
    rt.events.emit({
      kind: "error", account: account ?? null, round_id: roundId ?? null,
      message: `${label}: ${e instanceof Error ? e.message : String(e)}`,
    });
  }
}

/** Logs a decision that produced no transaction (skip with reason). */
export function noteSkip(rt: Runtime, actor: string, role: string, method: string, reason: string): ActionRecord {
  const rec = skipRecord(actor, role, method, reason);
  rt.events.emit({ kind: "skipped", account: actor, message: `${actor.split(".")[0]} ${method} skipped: ${reason}` });
  return rec;
}

export const JOIN_DEADLINE_MARGIN_MS = 2_000;

/** True while a join sent now can still land (deadline is block time in ns; keep a small safety margin). */
export const joinStillOpen = (joinDeadlineNs: number, nowMs: number = Date.now()): boolean =>
  nowMs < joinDeadlineNs / 1_000_000 - JOIN_DEADLINE_MARGIN_MS;
