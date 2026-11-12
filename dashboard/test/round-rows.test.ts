import { describe, expect, it } from "vitest";
import type { WarungAction } from "@/lib/agent-types";
import { myParticipations } from "@/lib/owner-actions";
import { buildOwnerRoundRows } from "@/lib/round-rows";
import { closedRound, makeRound, msAt } from "./fixtures";

const me = "warung-01.koelakan.testnet";
const action = (over: Partial<WarungAction>): WarungAction => ({ at: "2026-11-12T01:00:00Z", round_id: 9, action: "skipped", qty: null, reason: "Price above your limit", tx: null, ...over });

describe("buildOwnerRoundRows", () => {
  const parts = myParticipations([closedRound()], me, msAt(1000));

  it("lists joined rounds with what was paid and refunded", () => {
    const rows = buildOwnerRoundRows(parts, null, []);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ roundId: 1, qty: 10, reason: null });
    expect(rows[0]?.paid).toBe(120000n);
  });

  it("adds skipped rounds with their reason, newest first", () => {
    const rows = buildOwnerRoundRows(parts, [action({})], [makeRound({ id: 9, item: "gula-pasir" })]);
    expect(rows.map((r) => r.roundId)).toEqual([9, 1]);
    expect(rows[0]).toMatchObject({ outcome: "Skipped", itemId: "gula-pasir", reason: "Price above your limit", paid: null });
  });

  it("does not repeat a round that was joined or skipped twice", () => {
    const rows = buildOwnerRoundRows(parts, [action({ round_id: 1 }), action({}), action({ at: "2026-11-12T02:00:00Z" }), action({ round_id: 5, action: "joined", qty: 5 })], []);
    expect(rows.map((r) => r.roundId)).toEqual([9, 1]);
  });

  it("falls back to a plain reason when the service gave none", () => {
    expect(buildOwnerRoundRows([], [action({ reason: null })], [])[0]?.reason).toBe("Skipped by your agent");
  });
});
