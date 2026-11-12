import { describe, expect, it } from "vitest";
import { describeBudgetAmount, describeDuration, planBudget } from "@/lib/budget";
import { rupiah } from "@/lib/format";

const items = [
  { id: "beras-medium", ref_price: "16650" },
  { id: "gula-pasir", ref_price: "19950" },
];
const base = { items, spent: 0n, roundEveryMin: 10 as number | null };

describe("planBudget", () => {
  it("sums kg times the ceiling for one round", () => {
    const p = planBudget({ ...base, demand: { "beras-medium": 12, "gula-pasir": 10 }, weeklyBudget: 2_000_000n });
    expect(p.lockPerRound).toBe(12n * 16650n + 10n * 19950n);
  });
  it("counts rounds per week from the cadence and rounds the budget covers", () => {
    const p = planBudget({ ...base, demand: { "beras-medium": 10 }, weeklyBudget: 1_665_000n });
    expect(p.roundsPerWeek).toBe(1008);
    expect(p.roundsCovered).toBe(10);
    expect(p.hoursToExhaust).toBeCloseTo(100 / 60);
    expect(p.warnings).toEqual(["exhausts_fast"]);
  });
  it("warns that the agent would be refused when the budget is below one round", () => {
    const p = planBudget({ ...base, demand: { "beras-medium": 100 }, weeklyBudget: 500_000n });
    expect(p.roundsCovered).toBe(0);
    expect(p.warnings).toEqual(["refused"]);
  });
  it("is quiet when the budget lasts more than a day", () => {
    const p = planBudget({ ...base, demand: { "beras-medium": 1 }, weeklyBudget: 16650n * 200n });
    expect(p.hoursToExhaust).toBeCloseTo(200 * 10 / 60);
    expect(p.warnings).toEqual([]);
  });
  it("treats huge budgets as unlimited and never warns about exhaustion", () => {
    const p = planBudget({ ...base, demand: { "beras-medium": 20 }, weeklyBudget: 10n ** 15n });
    expect(p.unlimited).toBe(true);
    expect(p.hoursToExhaust).toBeNull();
    expect(p.warnings).toEqual([]);
  });
  it("handles an empty order, offline cadence and a missing budget", () => {
    const empty = planBudget({ ...base, demand: {}, weeklyBudget: 2_000_000n });
    expect(empty.lockPerRound).toBe(0n);
    expect(empty.roundsCovered).toBeNull();
    expect(empty.warnings).toEqual([]);
    const offline = planBudget({ ...base, roundEveryMin: null, demand: { "beras-medium": 10 }, weeklyBudget: 2_000_000n });
    expect(offline.roundsPerWeek).toBeNull();
    expect(offline.hoursToExhaust).toBeNull();
    expect(planBudget({ ...base, demand: { "beras-medium": 10 }, weeklyBudget: null }).roundsCovered).toBeNull();
  });
  it("reports usage as a capped percentage", () => {
    expect(planBudget({ ...base, demand: {}, weeklyBudget: 1_000_000n, spent: 250_000n }).usedPercent).toBe(25);
    expect(planBudget({ ...base, demand: {}, weeklyBudget: 1_000n, spent: 5_000n }).usedPercent).toBe(100);
  });
  it("ignores items missing from the order and uses per-item ceilings when given", () => {
    const p = planBudget({ ...base, demand: { "beras-medium": 2, unknown: 5 }, weeklyBudget: 1_000_000n, ceilings: { "beras-medium": 10_000n } });
    expect(p.lockPerRound).toBe(20_000n);
  });
});

describe("describe helpers", () => {
  it("formats absurd budgets sanely", () => {
    expect(describeBudgetAmount(10n ** 12n, rupiah)).toBe("No practical limit");
    expect(describeBudgetAmount(10n ** 15n, rupiah)).toBe("No practical limit");
    expect(describeBudgetAmount(2_000_000n, rupiah)).toBe("Rp2,000,000");
  });
  it("describes durations", () => {
    expect(describeDuration(0.4)).toBe("under an hour");
    expect(describeDuration(1)).toBe("about 1 hour");
    expect(describeDuration(5.4)).toBe("about 5 hours");
    expect(describeDuration(72)).toBe("about 3 days");
  });
});
