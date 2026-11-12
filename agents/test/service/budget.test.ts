import { describe, expect, it } from "vitest";
import { BURN_TGAS, Health, MIN_ACCOUNT_NEAR, estimateBurn } from "../../src/service/budget.js";
import { parseCadence, loadConfig } from "../../src/service/env.js";

const base = {
  cadence: { round_every_min: 30, join_secs: 300, commit_secs: 90, reveal_secs: 90, delivery_secs: 600 },
  seededJoinMin: 6, seededJoinMax: 9, grosirBidders: 3, forgetProb: 0.15,
};

describe("estimateBurn", () => {
  it("scales inversely with the cadence", () => {
    const a = estimateBurn(base);
    const b = estimateBurn({ ...base, cadence: { ...base.cadence, round_every_min: 60 } });
    expect(a.rounds_per_day).toBe(48);
    expect(b.near_per_day).toBeCloseTo(a.near_per_day / 2, 10);
  });

  it("grows with joins and bidders and matches a hand calculation", () => {
    const tiny = estimateBurn({ ...base, seededJoinMin: 0, seededJoinMax: 0, grosirBidders: 1, forgetProb: 0 });
    const hand = (BURN_TGAS.open + BURN_TGAS.commit + BURN_TGAS.reveal + BURN_TGAS.settle + BURN_TGAS.finalize + BURN_TGAS.withdraw) * 0.0001 * 1.15;
    expect(tiny.near_per_round).toBeCloseTo(hand, 10);
    expect(estimateBurn(base).near_per_round).toBeGreaterThan(tiny.near_per_round);
  });
});

describe("default budget", () => {
  it("stays under 0.4 NEAR/day at the default cadence and shape", () => {
    expect(estimateBurn(loadConfig({})).near_per_day).toBeLessThan(0.4);
  });
});

describe("Health guard", () => {
  it("pauses an account below the NEAR floor and reports it", () => {
    const h = new Health();
    expect(h.isPaused("a")).toBe(false); // unknown balance is not paused
    h.setBalance("a", MIN_ACCOUNT_NEAR - 1n);
    h.setBalance("b", MIN_ACCOUNT_NEAR);
    expect(h.isPaused("a")).toBe(true);
    expect(h.isPaused("b")).toBe(false);
    expect(h.lowAccounts()).toEqual(["a"]);
  });

  it("treats accounts without keys as paused", () => {
    const h = new Health();
    h.setMissing(["k"]);
    expect(h.isPaused("k")).toBe(true);
    expect(h.missingKeys()).toEqual(["k"]);
  });
});

describe("env parsing", () => {
  it("applies the documented defaults", () => {
    const c = loadConfig({});
    expect(c.tickSecs).toBe(10);
    expect(c.cadence).toEqual({ round_every_min: 60, join_secs: 300, commit_secs: 90, reveal_secs: 90, delivery_secs: 600 });
    expect(c.forgetProb).toBe(0.15);
    expect(c.allowedOrigins).toContain("http://localhost:3000");
  });

  it("validates phase durations (30 s .. 30 d) with a clear message", () => {
    expect(() => parseCadence({ JOIN_SECS: "10" })).toThrow(/JOIN_SECS/);
    expect(() => parseCadence({ REVEAL_SECS: String(31 * 86400) })).toThrow(/REVEAL_SECS/);
    expect(parseCadence({ COMMIT_SECS: "45" }).commit_secs).toBe(45);
  });

  it("parses ALLOWED_ORIGINS", () => {
    expect(loadConfig({ ALLOWED_ORIGINS: "https://a.app, https://b.app" }).allowedOrigins).toEqual([
      "http://localhost:3000", "https://a.app", "https://b.app",
    ]);
  });
});
