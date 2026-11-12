import { describe, expect, it } from "vitest";
import { confirmDeliveryCall, disputeCall, myParticipations, pendingActions, withdrawCall } from "@/lib/owner-actions";
import { closedRound, makeRound, msAt, ns } from "./fixtures";

const ME = "warung-01.koelakan.testnet";
const settled = (delivery: "Pending" | "Confirmed" = "Pending") =>
  makeRound({
    state: "Settled", phase: "Delivery", clearing_price: "12000", winner: 0, total_qty: 40,
    bids: [{ seller_id: "grosir-1.koelakan.testnet", hash: "aa", bond: "1000", bond_held: "1000", revealed_price: "12000", valid: true }],
    participants: [
      { account_id: ME, qty: 10, week: 1, held: "120000", delivery },
      { account_id: "warung-02.koelakan.testnet", qty: 30, week: 1, held: "360000", delivery: "Pending" },
    ],
  });

describe("pendingActions", () => {
  it("lists settled rounds in the delivery window with Pending delivery", () => {
    const list = pendingActions([settled()], ME, msAt(300));
    expect(list).toHaveLength(1);
    expect(list[0]).toMatchObject({ amount: 120000n, deadlineMs: msAt(360) });
  });
  it("ignores confirmed deliveries, other accounts and non-participants", () => {
    expect(pendingActions([settled("Confirmed")], ME, msAt(300))).toEqual([]);
    expect(pendingActions([settled()], "nobody.testnet", msAt(300))).toEqual([]);
  });
  it("ignores rounds past the delivery deadline, closed, failed and active ones", () => {
    expect(pendingActions([settled()], ME, msAt(361))).toEqual([]);
    expect(pendingActions([closedRound(), makeRound({ state: "Failed" }), makeRound()], ME, msAt(300))).toEqual([]);
  });
  it("sorts by the nearest deadline", () => {
    const a = { ...settled(), id: 1, delivery_deadline: ns(900) };
    const b = { ...settled(), id: 2, delivery_deadline: ns(500) };
    expect(pendingActions([a, b], ME, msAt(300)).map((x) => x.round.id)).toEqual([2, 1]);
  });
});

describe("owner call specs", () => {
  it("attach exactly 1 yocto", () => {
    for (const c of [confirmDeliveryCall(3), disputeCall(3), withdrawCall(500n)]) expect(c.deposit).toBe("1");
    expect(confirmDeliveryCall(3)).toMatchObject({ methodName: "confirm_delivery", args: { round_id: 3 } });
    expect(disputeCall(3).methodName).toBe("dispute");
    expect(withdrawCall(500n).args).toEqual({ amount: "500" });
  });
});

describe("myParticipations", () => {
  it("computes paid and refund for a confirmed settled round, including bond share", () => {
    const [p] = myParticipations([closedRound()], ME, msAt(1000));
    // paid 10 x 12000; gap 10 x 4650; forfeited bond 1000 split 10:30 -> 250
    expect(p).toMatchObject({ paid: 120000n, refund: 46500n + 250n, outcome: "Received and confirmed" });
  });
  it("refunds everything on a failed round", () => {
    const [p] = myParticipations([makeRound({ state: "Failed" })], ME, msAt(0));
    expect(p).toMatchObject({ paid: 0n, refund: 166500n, tone: "bad" });
  });
  it("marks a pending delivery as awaiting confirmation, and counts it received after the window", () => {
    expect(myParticipations([settled()], ME, msAt(300))[0]?.outcome).toBe("Awaiting your confirmation");
    expect(myParticipations([settled()], ME, msAt(400))[0]?.outcome).toBe("Counts as received");
  });
  it("returns payment to the owner when a dispute resolves in their favour", () => {
    const r = settled();
    r.participants[0] = { account_id: ME, qty: 10, week: 1, held: "0", delivery: { Resolved: { refunded: true } } };
    expect(myParticipations([r], ME, msAt(300))[0]).toMatchObject({ paid: 0n });
  });
  it("skips rounds the account did not join and sorts newest first", () => {
    const rs = [{ ...settled(), id: 1 }, { ...settled(), id: 5 }];
    expect(myParticipations(rs, ME, msAt(300)).map((x) => x.round.id)).toEqual([5, 1]);
    expect(myParticipations(rs, "nobody.testnet", msAt(300))).toEqual([]);
  });
});
