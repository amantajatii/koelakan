/** One daemon tick: derive every action from chain state + persisted local state. */
import type { ItemView, RoundView } from "../chain/views.js";
import { delegatedJoins } from "./delegated.js";
import { grosirStep, seededGrosirPolicy, type GrosirPolicy } from "./grosir-agent.js";
import { safely } from "./guard.js";
import { housekeeping } from "./housekeeping.js";
import { maybeOpen, settleOrFinalize } from "./koord.js";
import { activeRounds, advanceScan } from "./scheduler.js";
import { ensurePolicies, seededConfirms, seededJoins } from "./seeded.js";
import type { GrosirAgent, Runtime } from "./runtime.js";

const ITEMS_TTL_MS = 5 * 60 * 1000;
const PAGE = 50;
/** Time-critical phases first, so a slow join batch never delays a reveal. */
const PRIORITY: Readonly<Record<string, number>> = { Reveal: 0, Commit: 0, ReadyToSettle: 1, AwaitingFinalize: 1, Delivery: 2, Join: 3 };

export async function fetchWindow(rt: Runtime, from: number): Promise<RoundView[]> {
  const all: RoundView[] = [];
  for (let start = from; ; start += PAGE) {
    const page = await rt.views.listRounds(start, PAGE);
    all.push(...page);
    if (page.length < PAGE) return all;
  }
}

async function items(rt: Runtime, nowMs: number): Promise<readonly ItemView[]> {
  const c = rt.cache.items;
  if (c !== null && nowMs - c.at < ITEMS_TTL_MS) return c.list;
  const list = await rt.views.items();
  rt.cache.items = { at: nowMs, list };
  return list;
}

export interface TickRoles {
  readonly koordinator: boolean;
  readonly grosirs: boolean;
  readonly seeded: boolean;
  readonly delegated: boolean;
  /** Bid policy per grosir; defaults to the daemon's seeded strategy. */
  readonly grosirPolicy?: (rt: Runtime, g: GrosirAgent) => GrosirPolicy;
}

async function processRound(rt: Runtime, r: RoundView, roles: TickRoles): Promise<void> {
  await safely(rt, "round step", async () => {
    if (roles.koordinator) await settleOrFinalize(rt, r);
    if (roles.grosirs) {
      for (const g of rt.grosirs) await safely(rt, "grosir step", () => grosirStep(rt, g, r, (roles.grosirPolicy ?? seededGrosirPolicy)(rt, g)), g.id, r.id);
    }
    if (roles.seeded) {
      await seededConfirms(rt, r);
      await seededJoins(rt, r);
    }
    if (roles.delegated && rt.servicePublicKey !== null) await delegatedJoins(rt, r);
  }, undefined, r.id);
}

async function syncPolicies(rt: Runtime, list: readonly ItemView[]): Promise<void> {
  const signature = list.map((i) => `${i.id}:${i.ref_price}`).sort().join(",");
  if (signature === rt.cache.policySignature) return;
  await ensurePolicies(rt, Object.fromEntries(list.map((i) => [i.id, BigInt(i.ref_price)])));
  rt.cache.policySignature = signature;
}

/** Housekeeping runs in its own lane so it can never delay a commit/reveal; at most one run at a time. */
function startBackground(rt: Runtime, work: () => Promise<void>): void {
  if (rt.cache.background !== null) return;
  const run = work().finally(() => {
    rt.cache.background = null;
  });
  rt.cache.background = run;
}

export async function tick(rt: Runtime, roles: TickRoles, nowMs: number = Date.now(), shouldStop: () => boolean = () => false): Promise<void> {
  const list = await items(rt, nowMs);
  const sched = rt.state.scheduler();
  const rounds = await fetchWindow(rt, sched.scan_from);
  const scanFrom = advanceScan(rounds, sched.scan_from);
  if (scanFrom !== sched.scan_from) {
    rt.state.patchScheduler({ scan_from: scanFrom });
    rt.state.pruneAttempts(scanFrom);
  }
  const active = activeRounds(rounds);
  rt.cache.activeRounds = active.map((r) => ({ id: r.id, item: r.item, phase: r.phase }));
  if (roles.koordinator) await safely(rt, "open", () => maybeOpen(rt, rounds, list, nowMs));
  const ordered = [...active].sort((a, b) => (PRIORITY[a.phase] ?? 9) - (PRIORITY[b.phase] ?? 9) || a.id - b.id);
  for (const r of ordered) {
    if (shouldStop()) return;
    await processRound(rt, r, roles);
  }
  startBackground(rt, async () => {
    if (roles.seeded) await safely(rt, "policies", () => syncPolicies(rt, list));
    await safely(rt, "housekeeping", () => housekeeping(rt, nowMs, roles.grosirs, roles.koordinator));
  });
  rt.cache.lastTickAt = new Date().toISOString();
}
