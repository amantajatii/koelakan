import { describe, expect, it } from "vitest";
import { marketSnapshots, ownerSnapshots, percentBelow, weeklySaving } from "@/lib/item-summary";
import { myParticipations } from "@/lib/owner-actions";
import { BERAS, closedRound, makeRound, msAt } from "./fixtures";

const SUGAR = { ...BERAS, id: "gula-pasir", name: "Gula pasir", ref_price: "19950", het: "17500" };

describe("marketSnapshots", () => {
  it("takes the latest settled round per item and leaves untouched items empty", () => {
    const snaps = marketSnapshots([BERAS, SUGAR], [closedRound(), makeRound({ id: 2 })]);
    expect(snaps[0]).toMatchObject({ roundId: 1, paid: "12000", qty: 40 });
    expect(snaps[1]).toMatchObject({ roundId: null, paid: null, qty: null });
  });
});

describe("ownerSnapshots", () => {
  const me = "warung-01.koelakan.testnet";
  const parts = myParticipations([closedRound()], me, msAt(1000));
  it("uses the owner's own quantity from the last settled round", () => {
    expect(ownerSnapshots([BERAS], parts, null)[0]).toMatchObject({ roundId: 1, paid: "12000", qty: 10, qtySource: "round" });
  });
  it("falls back to the standing order quantity before any round", () => {
    expect(ownerSnapshots([SUGAR], parts, { "gula-pasir": 15 })[0]).toMatchObject({ roundId: null, paid: null, qty: 15, qtySource: "standing" });
    expect(ownerSnapshots([SUGAR], parts, { "gula-pasir": 0 })[0]).toMatchObject({ qty: null, qtySource: null });
  });
});

describe("weeklySaving", () => {
  const parts = myParticipations([closedRound()], "warung-01.koelakan.testnet", msAt(1000));
  it("sums (ref - paid) x qty for rounds opened in the last seven days", () => {
    expect(weeklySaving(parts, msAt(1000))).toEqual({ saving: (16650n - 12000n) * 10n, rounds: 1 });
  });
  it("ignores rounds older than a week", () => {
    expect(weeklySaving(parts, msAt(8 * 24 * 3600))).toEqual({ saving: 0n, rounds: 0 });
  });
});

describe("percentBelow", () => {
  it("is the share below the reference price", () => expect(percentBelow("16650", "11924")).toBeCloseTo(28.4, 1));
  it("is null without a paid price", () => expect(percentBelow("16650", null)).toBeNull());
});
