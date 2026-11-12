import { describe, expect, it } from "vitest";
import {
  ContractPanic, MAX_BIDS, MAX_PARTICIPANTS, bidHash, checkInvariant, commitBid, confirmDelivery, deposit,
  dispute, finalize, ftOnTransfer, getBalance, joinRound, newMarket, openRound, phaseOf, proRataShares,
  requiredBond, resolveDispute, revealBid, saving, setArbiter, setItem, setPolicy, settle, spentOf, weekOf,
  withdraw, withdrawRefunded, WEEK_NS,
} from "../src/engine.js";
import { ITEM, REF, SALT, at, c, commit, joined, market, open, reveal, warung } from "./helpers.js";

const panics = (fn: () => unknown, msg: string) => {
  expect(fn).toThrow(ContractPanic);
  expect(fn).toThrow(msg);
};

describe("hash and bond", () => {
  it("matches the known sha256 format", () => {
    // independently computed: printf '0:grosir-1.near:19500:salt' | shasum -a 256
    expect(bidHash(0, "grosir-1.near", 19500n, "salt")).toBe(
      "9a20289c456256c6d56ed089bd48e89dc10f04df1074989c63329456bcdb70bc",
    );
    expect(bidHash(0, "a", 1n, "s")).toMatch(/^[0-9a-f]{64}$/);
    expect(bidHash(0, "a", 1n, "s")).not.toBe(bidHash(0, "b", 1n, "s"));
  });

  it("rounds the 5% bond up", () => {
    expect(requiredBond(20_800n, 55n)).toBe(57_200n);
    expect(requiredBond(1_001n, 7n)).toBe(351n); // 350.35 -> 351
    expect(requiredBond(1n, 1n)).toBe(1n); // 0.05 -> 1
    expect(requiredBond(20n, 1n)).toBe(1n); // exact
  });

  it("splits pro rata with the dust on the largest qty (earliest on tie)", () => {
    expect(proRataShares(351n, [3n, 3n, 1n])).toEqual([151n, 150n, 50n]);
    expect(proRataShares(100n, [1n, 1n, 1n])).toEqual([34n, 33n, 33n]);
    expect(proRataShares(90n, [1n, 2n])).toEqual([30n, 60n]);
  });
});

describe("admin and owner calls", () => {
  it("needs exactly 1 yocto for owner-only calls", () => {
    panics(() => setPolicy(market(), c("w1", 0), { maxPrice: {}, weeklyBudget: 1n, autoJoin: true }), "exactly 1 yoctoNEAR");
    panics(() => withdraw(market(), c("w1", 0, 2n), 1n), "exactly 1 yoctoNEAR");
  });

  it("only admin sets items and the arbiter", () => {
    const item = { id: "x", name: "x", unit: "kg", refPrice: 5n, het: null, source: "s", asOf: "d" };
    panics(() => setItem(market(), c("evil", 0, 1n), item), "admin only");
    panics(() => setItem(market(), c("admin", 0, 1n), { ...item, refPrice: 0n }), "ref_price must be >= 1");
    panics(() => setItem(market(), c("admin", 0, 1n), { ...item, id: "" }), "bad item id");
    panics(() => setArbiter(market(), c("evil", 0, 1n), "x"), "admin only");
    expect(setArbiter(market(), c("admin", 0, 1n), "new").arbiter).toBe("new");
  });

  it("withdraw debits first and a failed transfer is credited back", () => {
    let s = warung(market(), "w1", { funds: 1000n });
    panics(() => withdraw(s, c("w1", 0, 1n), 0n), "amount must be > 0");
    panics(() => withdraw(s, c("w1", 0, 1n), 1001n), "insufficient available balance");
    s = withdraw(s, c("w1", 0, 1n), 400n);
    expect(getBalance(s, "w1").available).toBe(600n);
    expect(s.tokenHeld).toBe(600n);
    s = withdrawRefunded(s, "w1", 400n);
    expect(getBalance(s, "w1").available).toBe(1000n);
    checkInvariant(s);
  });

  it("is immutable: operations never touch the input state", () => {
    const s = warung(market(), "w1");
    const frozen = JSON.stringify(s, (_k, v) => (typeof v === "bigint" ? v.toString() : v));
    open(s);
    withdraw(s, c("w1", 0, 1n), 5n);
    expect(JSON.stringify(s, (_k, v) => (typeof v === "bigint" ? v.toString() : v))).toBe(frozen);
  });
});

describe("token gate", () => {
  it("returns the full amount for another token or an unknown msg", () => {
    const s = market();
    expect(ftOnTransfer(s, { caller: "other", now: at(0) }, "w1", 50n, "deposit")).toEqual({ state: s, refund: 50n });
    expect(ftOnTransfer(s, { caller: "tidr", now: at(0) }, "w1", 50n, "???").refund).toBe(50n);
    expect(ftOnTransfer(s, { caller: "tidr", now: at(0) }, "w1", 50n, "{bad json").refund).toBe(50n);
    expect(ftOnTransfer(s, { caller: "tidr", now: at(0) }, "w1", 50n, '{"commit":{"round_id":0,"hash":"zz"}}').refund).toBe(50n);
  });

  it("credits deposits and tracks tokenHeld", () => {
    const s = deposit(market(), at(0), "w1", 70n);
    expect(getBalance(s, "w1").available).toBe(70n);
    expect(s.tokenHeld).toBe(70n);
  });
});

describe("open_round validation", () => {
  it("rejects bad input", () => {
    const s = market();
    const base = { item: ITEM, ceilingPrice: REF, minTotalQty: 1n, joinSecs: 30n, commitSecs: 30n, revealSecs: 30n, deliverySecs: 30n };
    panics(() => openRound(s, c("k", 0), { ...base, item: "nope" }), "unknown item");
    panics(() => openRound(s, c("k", 0), { ...base, ceilingPrice: 0n }), "ceiling must be >= 1");
    panics(() => openRound(s, c("k", 0), { ...base, ceilingPrice: REF + 1n }), "ceiling above reference price");
    panics(() => openRound(s, c("k", 0), { ...base, minTotalQty: 0n }), "min_total_qty must be >= 1");
    panics(() => openRound(s, c("k", 0), { ...base, joinSecs: 29n }), "30 s .. 30 days");
    panics(() => openRound(s, c("k", 0), { ...base, deliverySecs: 31n * 86_400n }), "30 s .. 30 days");
  });

  it("derives all deadlines from the block time", () => {
    const r = open(market()).rounds[0]!;
    expect(r.joinDeadline).toBe(at(120));
    expect(r.commitDeadline).toBe(at(180));
    expect(r.revealDeadline).toBe(at(240));
    expect(r.deliveryDeadline).toBe(at(540));
    expect(r.arbiterDeadline).toBe(at(840));
  });
});

describe("join_round and owner policy", () => {
  it("rejects a ceiling above the owner's max price", () => {
    const s = open(warung(market(), "w1", { max: 20_000n }));
    panics(() => joinRound(s, c("w1", 10), 0, 1n), "ceiling above owner max_price");
  });

  it("rejects an item missing from the policy and an account without policy", () => {
    let s = deposit(market(), at(0), "w1", 1_000_000n);
    s = open(setPolicy(s, c("w1", 0, 1n), { maxPrice: {}, weeklyBudget: 1_000_000n, autoJoin: true }));
    panics(() => joinRound(s, c("w1", 10), 0, 1n), "item not in owner policy");
    panics(() => joinRound(s, c("nobody", 10), 0, 1n), "no policy");
  });

  it("enforces the weekly budget on the ceiling, per week", () => {
    const s = open(warung(market(), "w1", { budget: 400_000n }));
    panics(() => joinRound(s, c("w1", 10), 0, 20n), "weekly budget exceeded"); // 416,000 > 400,000
    const ok = joinRound(s, c("w1", 10), 0, 19n);
    expect(spentOf(ok, "w1", 0n)).toBe(19n * REF);
    expect(weekOf(at(0) + WEEK_NS)).toBe(1n);
  });

  it("needs balance, qty >= 1, one join per round and the Join phase", () => {
    const s = open(warung(market(), "w1", { funds: 20_800n }));
    panics(() => joinRound(s, c("w1", 10), 0, 2n), "insufficient available balance");
    panics(() => joinRound(s, c("w1", 10), 0, 0n), "qty must be >= 1");
    panics(() => joinRound(s, c("w1", 120), 0, 1n), "not accepting joins");
    panics(() => joinRound(s, c("w1", 10), 7, 1n), "no such round");
    panics(() => joinRound(joinRound(s, c("w1", 10), 0, 1n), c("w1", 11), 0, 1n), "already joined");
  });

  it("with auto_join off only the owner (1 yocto) may join", () => {
    const s = open(warung(market(), "w1", { auto: false }));
    panics(() => joinRound(s, c("w1", 10), 0, 1n), "auto_join is off");
    expect(joinRound(s, c("w1", 10, 1n), 0, 1n).rounds[0]!.totalQty).toBe(1n);
  });

  it("caps participants at 50", () => {
    let s = market();
    for (let i = 0; i <= MAX_PARTICIPANTS; i++) s = warung(s, `w${i}`);
    s = open(s);
    for (let i = 0; i < MAX_PARTICIPANTS; i++) s = joinRound(s, c(`w${i}`, 10), 0, 1n);
    panics(() => joinRound(s, c(`w${MAX_PARTICIPANTS}`, 10), 0, 1n), "round is full");
  });
});

describe("commit and reveal gating", () => {
  it("returns a wrong bond, a commit outside the phase and a second commit", () => {
    const s = joined();
    const h = bidHash(0, "g1", 19_500n, SALT);
    panics(() => commitBid(s, at(130), "g1", 1n, 0, h), "bond must be exactly 57200");
    panics(() => commitBid(s, at(10), "g1", 57_200n, 0, h), "not in commit phase");
    panics(() => commitBid(s, at(130), "g1", 57_200n, 9, h), "no such round");
    const once = commit(s, "g1", 19_500n);
    panics(() => commitBid(once, at(131), "g1", 57_200n, 0, h), "already committed");
    expect(once.tokenHeld).toBe(s.tokenHeld + 57_200n);
    checkInvariant(once);
  });

  it("does not accept commits when demand is below the minimum", () => {
    let s = open(warung(market(), "w1"), REF, 100n);
    s = joinRound(s, c("w1", 10), 0, 10n);
    expect(phaseOf(s.rounds[0]!, at(125))).toBe("ReadyToSettle");
    panics(() => commitBid(s, at(125), "g1", 10_400n, 0, bidHash(0, "g1", 1n, SALT)), "not in commit phase");
  });

  it("caps bids at 10", () => {
    let s = joined();
    for (let i = 0; i < MAX_BIDS; i++) s = commit(s, `g${i}`, 19_000n);
    panics(() => commit(s, "g-extra", 19_000n), "bid limit reached");
  });

  it("checks phase, commit, salt and price on reveal", () => {
    const s = commit(joined(), "g1", 19_500n);
    panics(() => revealBid(s, c("g1", 130), 0, 19_500n, SALT), "not in reveal phase");
    panics(() => revealBid(s, c("g2", 190), 0, 19_500n, SALT), "no commit from this seller");
    panics(() => revealBid(s, c("g1", 190), 0, 19_500n, "wrong"), "hash mismatch");
    panics(() => revealBid(s, c("g1", 190), 0, 19_400n, SALT), "hash mismatch");
    const r = reveal(s, "g1", 19_500n);
    panics(() => reveal(r, "g1", 19_500n), "already revealed");
  });

  it("copying another seller's hash does not help", () => {
    let s = commit(joined(), "g1", 19_500n);
    s = commitBid(s, at(131), "g2", 57_200n, 0, s.rounds[0]!.bids[0]!.hash);
    panics(() => reveal(s, "g2", 19_500n), "hash mismatch");
  });

  it("derives phases from timestamps", () => {
    const r = joined().rounds[0]!;
    const phases = [10, 119, 120, 179, 180, 239, 240].map((t) => phaseOf(r, at(t)));
    expect(phases).toEqual(["Join", "Join", "Commit", "Commit", "Reveal", "Reveal", "ReadyToSettle"]);
  });
});

describe("settle", () => {
  it("cannot settle during reveal or twice", () => {
    const s = joined();
    panics(() => settle(s, c("k", 200), 0), "not ready to settle");
    const done = settle(s, c("k", 250), 0).state;
    panics(() => settle(done, c("k", 251), 0), "not ready to settle");
  });

  it("an invalid (above ceiling) reveal fails the round but returns the bond", () => {
    let s = commit(joined(), "g1", 21_000n);
    s = reveal(s, "g1", 21_000n);
    expect(s.rounds[0]!.bids[0]!.valid).toBe(false);
    const { state, result } = settle(s, c("k", 250), 0);
    expect(result).toBe("Failed");
    expect(getBalance(state, "g1").available).toBe(57_200n);
    expect(getBalance(state, "w2").available).toBe(2_000_000n);
    expect(spentOf(state, "w2", 0n)).toBe(0n);
    checkInvariant(state);
  });

  it("forfeits unrevealed bonds to buyers when the round fails", () => {
    const s = commit(joined(), "g1", 19_500n);
    const { state, result } = settle(s, c("k", 250), 0);
    expect(result).toBe("Failed");
    const gained = ["w1", "w2", "w3"].map((w) => getBalance(state, w).available - 2_000_000n);
    expect(gained.reduce((a, b) => a + b, 0n)).toBe(57_200n);
    expect(getBalance(state, "g1").available).toBe(0n);
    checkInvariant(state);
  });

  it("picks the lowest price, the earlier commit on ties, and refunds the difference", () => {
    let s = joined();
    s = commit(commit(commit(s, "g2", 19_500n), "g1", 19_500n), "g3", 20_000n);
    s = ["g1", "g2", "g3"].reduce((acc, g) => reveal(acc, g, g === "g3" ? 20_000n : 19_500n), s);
    const { state } = settle(s, c("k", 250), 0);
    const r = state.rounds[0]!;
    expect(r.bids[r.winner!]!.sellerId).toBe("g2");
    expect(r.clearingPrice).toBe(19_500n);
    expect(saving(r)).toBe((REF - 19_500n) * 55n);
    expect(getBalance(state, "w2").available).toBe(2_000_000n - 40n * REF + 40n * 1_300n);
    expect(getBalance(state, "g1").available).toBe(57_200n);
    expect(getBalance(state, "g2").held).toBe(57_200n);
    checkInvariant(state);
  });

  it("fails early when demand is too low", () => {
    let s = open(warung(market(), "w1"), REF, 100n);
    s = joinRound(s, c("w1", 10), 0, 10n);
    const { state, result } = settle(s, c("k", 121), 0);
    expect(result).toBe("Failed");
    expect(getBalance(state, "w1").available).toBe(2_000_000n);
    expect(saving(state.rounds[0]!)).toBeNull();
  });
});

function settled(): ReturnType<typeof joined> {
  let s = commit(joined(), "g1", 19_500n);
  s = reveal(s, "g1", 19_500n);
  return settle(s, c("k", 250), 0).state;
}

describe("delivery, dispute and finalize", () => {
  it("confirm pays the winner right away; confirm needs 1 yocto and the window", () => {
    const s = settled();
    panics(() => confirmDelivery(s, c("w1", 300), 0), "exactly 1 yoctoNEAR");
    panics(() => confirmDelivery(s, c("w1", 600, 1n), 0), "not in delivery window");
    panics(() => confirmDelivery(s, c("stranger", 300, 1n), 0), "not a participant");
    const paid = confirmDelivery(s, c("w1", 300, 1n), 0);
    expect(getBalance(paid, "g1").available).toBe(10n * 19_500n);
    panics(() => confirmDelivery(paid, c("w1", 301, 1n), 0), "delivery already decided");
    panics(() => dispute(paid, c("w1", 301, 1n), 0), "delivery already decided");
  });

  it("an owner dispute is ruled by the arbiter: refund plus bond share, or seller paid", () => {
    let s = dispute(dispute(settled(), c("w2", 300, 1n), 0), c("w3", 300, 1n), 0);
    panics(() => resolveDispute(s, c("evil", 301), 0, "w2", true), "arbiter only");
    panics(() => resolveDispute(s, c("arbiter", 301), 0, "w1", true), "no open dispute");
    panics(() => resolveDispute(s, c("arbiter", 900), 0, "w2", true), "arbiter deadline passed");
    s = resolveDispute(s, c("arbiter", 301), 0, "w2", true);
    s = resolveDispute(s, c("arbiter", 301), 0, "w3", false);
    expect(s.rounds[0]!.bids[0]!.bondHeld).toBe(57_200n - (57_200n * 40n) / 55n);
    expect(getBalance(s, "g1").available).toBe(5n * 19_500n);
    const fin = finalize(s, c("k", 560), 0);
    expect(fin.result).toBe("Closed");
    checkInvariant(fin.state);
  });

  it("finalize waits for the arbiter, then refunds the payment without a bond share", () => {
    const s = dispute(settled(), c("w2", 300, 1n), 0);
    panics(() => finalize(s, c("k", 300), 0), "not awaiting finalize");
    const partial = finalize(s, c("k", 560), 0);
    expect(partial.result).toBe("Settled");
    const closed = finalize(partial.state, c("k", 900), 0);
    expect(closed.result).toBe("Closed");
    expect(closed.state.rounds[0]!.participants[1]!.delivery).toBe("DefaultRefunded");
    expect(getBalance(closed.state, "g1").available).toBe(10n * 19_500n + 5n * 19_500n + 57_200n);
    expect(spentOf(closed.state, "w2", 0n)).toBe(0n);
    checkInvariant(closed.state);
    panics(() => finalize(closed.state, c("k", 901), 0), "not awaiting finalize");
  });

  it("silence counts as acceptance and returns the winner's bond", () => {
    const { state, result } = finalize(settled(), c("k", 560), 0);
    expect(result).toBe("Closed");
    expect(state.rounds[0]!.participants.every((p) => p.delivery === "Accepted")).toBe(true);
    expect(getBalance(state, "g1").available).toBe(55n * 19_500n + 57_200n);
    expect(state.held["g1"]).toBe(0n);
    checkInvariant(state);
  });
});
