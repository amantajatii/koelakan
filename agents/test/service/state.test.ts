import { mkdtempSync, readFileSync, rmSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { Events } from "../../src/service/events.js";
import { NONCE_TTL_MS, StateStore } from "../../src/service/state.js";
import { atomicWriteJson, readJsonFile } from "../../src/service/store.js";
import { parsePricing, priceOf } from "../../src/service/external-grosir.js";

let dir: string;
beforeEach(() => { dir = mkdtempSync(join(tmpdir(), "koelakan-state-")); });
afterEach(() => rmSync(dir, { recursive: true, force: true }));

describe("atomic store", () => {
  it("round-trips and leaves no temp file", () => {
    const p = join(dir, "a.json");
    atomicWriteJson(p, { x: 1 });
    expect(readJsonFile(p, null)).toEqual({ x: 1 });
    expect(existsSync(`${p}.tmp`)).toBe(false);
    expect(readJsonFile(join(dir, "missing.json"), { d: true })).toEqual({ d: true });
  });
});

describe("StateStore", () => {
  it("persists attempts, nonces and scheduler across restarts and prunes old rounds", () => {
    const s = new StateStore(dir);
    expect(s.bumpAttempt("join:1:a")).toBe(1);
    s.bumpAttempt("join:9:a");
    s.addNonce("n1", 1_000);
    s.patchScheduler({ scan_from: 5 });
    const again = new StateStore(dir);
    expect(again.attempts("join:1:a")).toBe(1);
    expect(again.hasNonce("n1")).toBe(true);
    expect(again.scheduler().scan_from).toBe(5);
    again.pruneAttempts(5);
    expect(again.attempts("join:1:a")).toBe(0);
    expect(again.attempts("join:9:a")).toBe(1);
  });

  it("expires nonces after the TTL", () => {
    const s = new StateStore(dir);
    s.addNonce("old", 0);
    s.addNonce("new", NONCE_TTL_MS + 1);
    expect(s.hasNonce("old")).toBe(false);
    expect(s.hasNonce("new")).toBe(true);
  });

  it("keeps registered_at and caps the action history", () => {
    const s = new StateStore(dir);
    s.upsertWarung("a.testnet", { x: 1 }, "t1");
    for (let i = 0; i < 30; i += 1) s.recordAction("a.testnet", { at: "t", round_id: i, action: "skipped", qty: null, reason: "r", tx: null });
    const r = s.upsertWarung("a.testnet", { x: 2 }, "t2");
    expect(r.registered_at).toBe("t1");
    expect(r.updated_at).toBe("t2");
    expect(r.last_actions).toHaveLength(20);
    expect(JSON.parse(readFileSync(join(dir, "registry.json"), "utf8")).warungs["a.testnet"].demand).toEqual({ x: 2 });
  });
});

describe("Events", () => {
  it("writes one JSON line per event and keeps a bounded ring", () => {
    const lines: string[] = [];
    const e = new Events((l) => lines.push(l), () => new Date("2026-01-01T00:00:00Z"));
    for (let i = 0; i < 250; i += 1) e.emit({ kind: "k", message: `m${i}`, round_id: i });
    expect(lines).toHaveLength(250);
    expect(JSON.parse(lines[0] as string)).toMatchObject({ kind: "k", account: null, tx: null, at: "2026-01-01T00:00:00.000Z" });
    expect(e.recent()).toHaveLength(50);
    expect(e.recent(1)[0]?.message).toBe("m249");
  });
});

describe("external grosir pricing", () => {
  it("price = round(cost x (1 + margin))", () => {
    const p = parsePricing({ "beras-medium": { cost: 12000, margin_bps: 500 } });
    expect(priceOf(p, "beras-medium")).toBe(12600n);
    expect(priceOf(p, "unknown")).toBe(0n);
  });

  it("rejects malformed pricing", () => {
    expect(() => parsePricing([])).toThrow();
    expect(() => parsePricing({ a: { cost: 0, margin_bps: 1 } })).toThrow(/cost/);
    expect(() => parsePricing({ a: { cost: 5, margin_bps: -1 } })).toThrow(/margin_bps/);
  });
});
