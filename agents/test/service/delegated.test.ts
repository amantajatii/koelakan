import { describe, expect, it } from "vitest";
import { decideDelegatedJoin, type DelegatedInput } from "../../src/service/delegated.js";

const base: DelegatedInput = {
  phase: "Join", item: "beras-medium", ceiling: 16_650n, account: "pak.testnet", participants: [], demand: 10,
  policy: { max_price: { "beras-medium": "16650" }, weekly_budget: "2000000", auto_join: true },
  available: 500_000n, spent: 0n, delegated: true,
};
const reason = (o: Partial<DelegatedInput>): string => {
  const d = decideDelegatedJoin({ ...base, ...o });
  return d.action === "skip" ? d.reason : "JOIN";
};

describe("decideDelegatedJoin", () => {
  it("joins with exactly the registered demand when every check passes", () => {
    expect(decideDelegatedJoin(base)).toEqual({ action: "join", qty: 10n });
  });

  it("skips with a recorded reason for each failed precheck", () => {
    expect(reason({ phase: "Commit" })).toMatch(/phase Commit/);
    expect(reason({ demand: 0 })).toMatch(/no demand/);
    expect(reason({ participants: ["pak.testnet"] })).toMatch(/already joined/);
    expect(reason({ participants: Array.from({ length: 50 }, (_, i) => `a${i}`) })).toMatch(/full/);
    expect(reason({ delegated: false })).toMatch(/service key/);
    expect(reason({ policy: null })).toMatch(/no owner policy/);
    expect(reason({ policy: { ...base.policy!, auto_join: false } })).toMatch(/auto_join is off/);
    expect(reason({ policy: { ...base.policy!, max_price: {} } })).toMatch(/not in the owner policy/);
    expect(reason({ policy: { ...base.policy!, max_price: { "beras-medium": "16000" } } })).toMatch(/above owner max_price/);
    expect(reason({ spent: 1_900_000n })).toMatch(/weekly budget/);
    expect(reason({ available: 100_000n })).toMatch(/balance/);
  });

  it("does not partially fill a demand it cannot fully afford", () => {
    expect(decideDelegatedJoin({ ...base, available: 16_650n * 9n }).action).toBe("skip");
    expect(decideDelegatedJoin({ ...base, available: 16_650n * 10n }).action).toBe("join");
  });
});
