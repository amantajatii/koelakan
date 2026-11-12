import { describe, expect, it } from "vitest";
import { aboveHetPercent, aggregate, forfeitedBond, proRataShares, savingOf, savingPercent, winnerBid } from "@/lib/stats";
import { BERAS, closedRound, makeRound } from "./fixtures";

describe("saving math", () => {
  it("uses the on-chain saving when present", () => expect(savingOf(closedRound())).toBe(186000n));
  it("recomputes (ref - clearing) x qty when the view omits it", () => {
    expect(savingOf({ ...closedRound(), saving: null })).toBe((16650n - 12000n) * 40n);
  });
  it("is zero when nothing cleared", () => expect(savingOf(makeRound())).toBe(0n));
  it("reports percent below reference", () => expect(savingPercent(closedRound())).toBeCloseTo(27.93, 1));
  it("finds the winning bid", () => expect(winnerBid(closedRound())?.seller_id).toBe("grosir-1.koelakan.testnet"));
});

describe("aggregate", () => {
  const failed = makeRound({ id: 0, state: "Failed", total_qty: 200 });
  const live = makeRound({ id: 2 });
  it("counts only settled rounds towards totals", () => {
    const a = aggregate([failed, closedRound(), live]);
    expect(a.rounds).toBe(3);
    expect(a.settledRounds).toBe(1);
    expect(a.failedRounds).toBe(1);
    expect(a.liveRounds).toBe(1);
    expect(a.totalQty).toBe(40);
    expect(a.totalSaving).toBe(186000n);
    expect(a.participations).toBe(6);
  });
  it("weights the average discount by lot value", () => {
    const a = aggregate([closedRound()]);
    expect(a.avgPercentBelow).toBeCloseTo(27.93, 1);
    expect(aggregate([]).avgPercentBelow).toBe(0);
  });
  it("sums forfeited bonds of unrevealed bids", () => {
    expect(forfeitedBond(closedRound())).toBe(1000n);
    expect(aggregate([closedRound()]).forfeited).toBe(1000n);
  });
});

describe("proRataShares", () => {
  it("splits by quantity and gives dust to the largest buyer", () => {
    const shares = proRataShares(1000n, [10n, 30n]);
    expect(shares).toEqual([250n, 750n]);
    const odd = proRataShares(100n, [1n, 1n, 1n]);
    expect(odd.reduce((a, b) => a + b, 0n)).toBe(100n);
    expect(odd).toEqual([34n, 33n, 33n]);
  });
  it("never creates or loses money", () => {
    const qtys = [16n, 6n, 19n, 19n, 9n, 14n, 13n, 21n, 24n];
    expect(proRataShares(250583n, qtys).reduce((a, b) => a + b, 0n)).toBe(250583n);
  });
  it("handles zero total quantity", () => expect(proRataShares(10n, [])).toEqual([]));
});

describe("aboveHetPercent", () => {
  it("shows the market above HET for rice", () => expect(aboveHetPercent(BERAS)).toBeCloseTo(23.33, 1));
  it("returns null without a HET", () => expect(aboveHetPercent({ ...BERAS, het: null })).toBeNull());
});
