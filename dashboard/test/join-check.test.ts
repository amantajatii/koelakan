import { describe, expect, it } from "vitest";
import { checkJoin, type JoinInput } from "@/lib/join-check";
import type { Policy } from "@/lib/types";
import { BERAS, makeRound, msAt } from "./fixtures";

const ME = "judge.testnet";
const policy: Policy = { max_price: { "beras-medium": "16650" }, weekly_budget: "2000000", auto_join: true };

const base = (over: Partial<JoinInput> = {}): JoinInput => ({
  round: makeRound(), item: BERAS, qty: 10, policy, balance: { available: "500000", held: "0" },
  spent: 0n, nowMs: msAt(30), account: ME, ...over,
});
const codes = (i: JoinInput): string[] => checkJoin(i).map((p) => p.code);

describe("checkJoin", () => {
  it("passes when every rule is satisfied", () => expect(codes(base())).toEqual([]));
  it("needs a round", () => expect(codes(base({ round: null }))).toEqual(["no_round"]));
  it("rejects joins after the join deadline", () => expect(codes(base({ nowMs: msAt(130) }))).toContain("not_open"));
  it("rejects a bad quantity", () => {
    expect(codes(base({ qty: 0 }))).toContain("bad_qty");
    expect(codes(base({ qty: 1.5 }))).toContain("bad_qty");
  });
  it("requires a policy", () => expect(codes(base({ policy: null }))).toEqual(["no_policy"]));
  it("rejects an item missing from the policy", () => {
    expect(codes(base({ policy: { ...policy, max_price: {} } }))).toContain("item_not_in_policy");
  });
  it("rejects a ceiling above the owner's max price", () => {
    expect(codes(base({ policy: { ...policy, max_price: { "beras-medium": "16000" } } }))).toContain("ceiling_above_max");
  });
  it("rejects when auto_join is off", () => expect(codes(base({ policy: { ...policy, auto_join: false } }))).toContain("needs_owner"));
  it("enforces the weekly budget using the ceiling", () => {
    expect(codes(base({ spent: 1_900_000n }))).toContain("budget");
    expect(codes(base({ spent: 1_833_500n }))).toEqual([]); // 1,833,500 + 166,500 = exactly 2,000,000
  });
  it("checks available balance against qty x ceiling", () => {
    expect(codes(base({ balance: { available: "166499", held: "0" } }))).toContain("balance");
    expect(codes(base({ balance: { available: "166500", held: "0" } }))).toEqual([]);
  });
  it("rejects a second join by the same account", () => {
    const round = makeRound();
    round.participants = [{ account_id: ME, qty: 1, week: 1, held: "1", delivery: "Pending" }];
    expect(codes(base({ round }))).toContain("already_joined");
  });
  it("reports several problems at once", () => {
    const found = codes(base({ nowMs: msAt(500), balance: { available: "0", held: "0" } }));
    expect(found).toEqual(expect.arrayContaining(["not_open", "balance"]));
  });
});
