import { describe, expect, it } from "vitest";
import { quote } from "../src/sim-bridge.js";
import {
  decideBid, decideJoin, grosirQuote, neverReveals, pickSilent, population, warungQty, type JoinInput,
} from "../src/strategy.js";

const base: JoinInput = {
  account: "warung-01.x.testnet", phase: "Join", item: "beras-medium", ceiling: 16650n, participants: [],
  maxParticipants: 50, wantedQty: 12n, available: 900_000n, spent: 0n,
  policy: { max_price: { "beras-medium": "16650" }, weekly_budget: "2000000", auto_join: true },
};

describe("decideJoin", () => {
  it("joins with the wanted qty when everything fits", () => {
    expect(decideJoin(base)).toEqual({ action: "join", qty: 12n });
  });

  it("clamps qty to the balance", () => {
    expect(decideJoin({ ...base, available: 50_000n })).toEqual({ action: "join", qty: 3n });
  });

  it("clamps qty to the weekly budget left", () => {
    expect(decideJoin({ ...base, spent: 1_900_000n })).toEqual({ action: "join", qty: 6n });
  });

  it.each([
    ["not in join phase", { phase: "Commit" }],
    ["no need", { wantedQty: 0n }],
    ["no policy", { policy: null }],
    ["auto_join off", { policy: { max_price: { "beras-medium": "16650" }, weekly_budget: "2000000", auto_join: false } }],
    ["already joined", { participants: ["warung-01.x.testnet"] }],
    ["round full", { participants: Array.from({ length: 50 }, (_, i) => `w${i}`) }],
    ["item missing from policy", { policy: { max_price: {}, weekly_budget: "2000000", auto_join: true } }],
    ["ceiling above max_price", { policy: { max_price: { "beras-medium": "16000" }, weekly_budget: "2000000", auto_join: true } }],
    ["cannot afford one unit", { available: 100n }],
    ["budget exhausted", { spent: 2_000_000n }],
  ] as const)("skips: %s", (_name, patch) => {
    expect(decideJoin({ ...base, ...patch }).action).toBe("skip");
  });
});

describe("decideBid", () => {
  const bid = { short: "grosir-1", price: 15000n, ceiling: 16650n, bond: 100_000n, wallet: 1_000_000n };

  it("commits when under the ceiling with enough wallet", () => {
    expect(decideBid(bid)).toEqual({ action: "commit", price: 15000n });
  });

  it("skips above the ceiling or without bond money", () => {
    expect(decideBid({ ...bid, price: 17000n }).action).toBe("skip");
    expect(decideBid({ ...bid, wallet: 99_999n }).action).toBe("skip");
    expect(decideBid({ ...bid, price: 0n }).action).toBe("skip");
  });

  it("the forgetful grosir always commits (to exercise the forfeit path)", () => {
    expect(decideBid({ ...bid, short: "grosir-5", price: 17000n }).action).toBe("commit");
    expect(neverReveals("grosir-5")).toBe(true);
    expect(neverReveals("grosir-1")).toBe(false);
  });
});

describe("shared sim strategy", () => {
  const pop = population();

  it("uses the seeded warung demand and grosir quotes from sim", () => {
    expect(warungQty(pop, "warung-01", "beras-medium")).toBeGreaterThanOrEqual(5n);
    const g = pop.grosirs[0];
    expect(g).toBeDefined();
    expect(grosirQuote(pop, "grosir-1", "beras-medium")).toBe(quote(g!, "beras-medium"));
  });

  it("is deterministic", () => {
    expect(warungQty(population(), "warung-09", "gula-pasir")).toBe(warungQty(pop, "warung-09", "gula-pasir"));
  });

  it("total seeded demand for rice clears the 100 kg minimum lot", () => {
    const total = pop.warungs.reduce((a, w) => a + (w.qty["beras-medium"] ?? 0n), 0n);
    expect(total).toBeGreaterThanOrEqual(100n);
  });
});

describe("pickSilent", () => {
  it("is the last participant, or null when empty", () => {
    expect(pickSilent(["a", "b", "c"])).toBe("c");
    expect(pickSilent([])).toBeNull();
  });
});
