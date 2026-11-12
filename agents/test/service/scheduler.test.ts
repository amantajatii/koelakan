import { describe, expect, it } from "vitest";
import { EMPTY_SCHEDULER } from "../../src/service/state.js";
import { activeRounds, adminAction, advanceScan, nextOpenAtMs, pickSubset, planOpen, rollForget } from "../../src/service/scheduler.js";
import { item, round } from "./helpers.js";

const NOW = 10_000_000_000_000; // ms
const EVERY = 30;
const items = [item("beras-medium"), item("gula-pasir"), item("minyak-curah")];
const ns = (ms: number) => ms * 1_000_000;

describe("planOpen", () => {
  it("opens immediately on a fresh chain and rotates by item id", () => {
    const plan = planOpen({ nowMs: NOW, everyMin: EVERY, rounds: [], items, sched: EMPTY_SCHEDULER });
    expect(plan?.item.id).toBe("beras-medium");
    expect(plan?.nextRotation).toBe(1);
  });

  it("waits until the cadence slot has elapsed", () => {
    const rounds = [round({ id: 0, phase: "Closed", opened_at: ns(NOW - 10 * 60_000) })];
    expect(planOpen({ nowMs: NOW, everyMin: EVERY, rounds, items, sched: EMPTY_SCHEDULER })).toBeNull();
    const later = planOpen({ nowMs: NOW + 21 * 60_000, everyMin: EVERY, rounds, items, sched: EMPTY_SCHEDULER });
    expect(later).not.toBeNull();
  });

  it("uses the persisted last-open time when the window is empty", () => {
    const sched = { ...EMPTY_SCHEDULER, last_open_at_ms: NOW - 60_000 };
    expect(planOpen({ nowMs: NOW, everyMin: EVERY, rounds: [], items, sched })).toBeNull();
  });

  it("skips an item that already has an active round (at most one per item)", () => {
    const rounds = [round({ id: 0, item: "beras-medium", phase: "Commit", opened_at: ns(NOW - 99 * 60_000) })];
    const plan = planOpen({ nowMs: NOW, everyMin: EVERY, rounds, items, sched: EMPTY_SCHEDULER });
    expect(plan?.item.id).toBe("gula-pasir");
    expect(plan?.nextRotation).toBe(2);
  });

  it("opens nothing when every item is busy", () => {
    const rounds = items.map((it, i) => round({ id: i, item: it.id, phase: "Join", opened_at: ns(NOW - 99 * 60_000) }));
    expect(planOpen({ nowMs: NOW, everyMin: EVERY, rounds, items, sched: EMPTY_SCHEDULER })).toBeNull();
  });

  it("a round opened by someone else (dashboard) resets the cadence", () => {
    const rounds = [round({ id: 5, item: "gula-pasir", phase: "Closed", opened_at: ns(NOW - 60_000) })];
    expect(planOpen({ nowMs: NOW, everyMin: EVERY, rounds, items, sched: EMPTY_SCHEDULER })).toBeNull();
    expect(nextOpenAtMs(NOW - 60_000, EVERY, NOW)).toBe(NOW - 60_000 + EVERY * 60_000);
  });

  it("wraps the rotation index", () => {
    const sched = { ...EMPTY_SCHEDULER, rotation: 5 };
    expect(planOpen({ nowMs: NOW, everyMin: EVERY, rounds: [], items, sched })?.item.id).toBe("minyak-curah");
  });
});

describe("settle / finalize / scan", () => {
  it("maps phases to permissionless admin actions, including the early-fail case", () => {
    expect(adminAction(round({ phase: "ReadyToSettle", total_qty: 3 }))).toBe("settle");
    expect(adminAction(round({ phase: "AwaitingFinalize", state: "Settled" }))).toBe("finalize");
    for (const p of ["Join", "Commit", "Reveal", "Delivery", "Closed", "Failed"] as const) expect(adminAction(round({ phase: p }))).toBeNull();
  });

  it("advances the scan window over the contiguous terminal prefix only", () => {
    const rs = [round({ id: 0, phase: "Closed" }), round({ id: 1, phase: "Failed" }), round({ id: 2, phase: "Delivery" }), round({ id: 3, phase: "Closed" })];
    expect(advanceScan(rs, 0)).toBe(2);
    expect(activeRounds(rs).map((r) => r.id)).toEqual([2]);
  });
});

describe("seeded randomness", () => {
  const ids = Array.from({ length: 20 }, (_, i) => `w${i}`);

  it("is deterministic per round and stays within min..max", () => {
    for (let r = 0; r < 30; r += 1) {
      const a = pickSubset(7, r, "join", ids, 6, 9);
      expect(a).toEqual(pickSubset(7, r, "join", ids, 6, 9));
      expect(a.length).toBeGreaterThanOrEqual(6);
      expect(a.length).toBeLessThanOrEqual(9);
      expect(new Set(a).size).toBe(a.length);
    }
    expect(pickSubset(7, 1, "join", ids, 6, 9)).not.toEqual(pickSubset(7, 2, "join", ids, 6, 9));
  });

  it("never picks more than the candidates", () => {
    expect(pickSubset(1, 1, "x", ["a", "b"], 6, 9)).toHaveLength(2);
  });

  it("forget roll honours 0 and 1 and is roughly calibrated", () => {
    expect(rollForget(1, 1, "g5", 0)).toBe(false);
    expect(rollForget(1, 1, "g5", 1)).toBe(true);
    const hits = Array.from({ length: 2000 }, (_, i) => rollForget(1, i, "g5", 0.15)).filter(Boolean).length;
    expect(hits / 2000).toBeGreaterThan(0.1);
    expect(hits / 2000).toBeLessThan(0.2);
  });
});
