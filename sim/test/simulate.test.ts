import { describe, expect, it } from "vitest";
import { runSimulation } from "../src/runner.js";
import { FORGETFUL_GROSIR } from "../src/config.js";

const dump = (v: unknown) => JSON.stringify(v, (_k, x) => (typeof x === "bigint" ? x.toString() : x));

describe("simulation", () => {
  it("is deterministic for a given seed", () => {
    expect(dump(runSimulation(1))).toBe(dump(runSimulation(1)));
  });

  it("runs 4 rounds, forfeits the forgetful grosir's bond and conserves tIDR", () => {
    const run = runSimulation();
    expect(run.rounds).toHaveLength(4);
    expect(run.conserved).toBe(true);
    for (const r of run.rounds) {
      expect(r.state).toBe("Closed");
      expect(r.participants).toBe(20);
      expect(r.bids.find((b) => b.seller === FORGETFUL_GROSIR)?.revealedPrice).toBeNull();
      expect(r.forfeited).toBeGreaterThan(0n);
      expect(r.forfeitShares.reduce((a, s) => a + s.amount, 0n)).toBe(r.forfeited);
      expect(r.clearingPrice).not.toBeNull();
      expect(r.clearingPrice!).toBeLessThanOrEqual(r.ceilingPrice);
    }
    expect(run.rounds.some((r) => r.disputes.length > 0)).toBe(true);
  });
});
