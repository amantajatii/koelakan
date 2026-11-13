import { describe, expect, it } from "vitest";
import { bucketRounds, savingsSeries } from "@/lib/home-series";
import { closedRound, makeRound, msAt } from "./fixtures";

describe("savingsSeries", () => {
  it("keeps only settled rounds, oldest first, trimmed to the limit", () => {
    const rounds = [closedRound(), makeRound({ id: 2 }), { ...closedRound(), id: 3 }, { ...closedRound(), id: 4 }];
    const series = savingsSeries(rounds, 2);
    expect(series.map((p) => p.roundId)).toEqual([3, 4]);
  });

  it("computes the percentage below PIHPS from the clearing price", () => {
    const [point] = savingsSeries([closedRound()]);
    expect(point?.percent).toBeCloseTo(((16650 - 12000) / 16650) * 100, 5);
  });

  it("returns an empty list when nothing settled", () => {
    expect(savingsSeries([makeRound()])).toEqual([]);
  });
});

describe("bucketRounds", () => {
  it("groups rounds by phase and reports the newest of each", () => {
    const rounds = [{ ...closedRound(), id: 1 }, { ...closedRound(), id: 5 }, makeRound({ id: 6 })];
    const buckets = bucketRounds(rounds, msAt(10));
    const get = (k: string) => buckets.find((b) => b.bucket === k);
    expect(get("closed")?.count).toBe(2);
    expect(get("closed")?.latest?.id).toBe(5);
    expect(get("live")?.count).toBe(1);
    expect(get("failed")?.latest).toBeNull();
  });
});
