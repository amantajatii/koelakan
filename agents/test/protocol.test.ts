import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { bidHash as simBidHash, requiredBond as simBond } from "../../sim/src/engine.js";
import {
  bidHash, commitMsg, ftTransferCallArgs, isValidSalt, joinRoundArgs, newSalt, openRoundArgs, policyArgs,
  policyMatches, requiredBond, revealArgs,
} from "../src/protocol.js";

describe("bidHash", () => {
  it("is sha256 of '{round}:{seller}:{price}:{salt}' as lowercase hex", () => {
    const salt = "00112233445566778899aabbccddeeff";
    const expected = createHash("sha256").update(`3:grosir-2.koelakan.testnet:15900:${salt}`).digest("hex");
    expect(bidHash(3, "grosir-2.koelakan.testnet", 15900n, salt)).toBe(expected);
    expect(expected).toMatch(/^[0-9a-f]{64}$/);
  });

  it("matches the sim engine implementation (which mirrors the contract)", () => {
    expect(bidHash(7, "grosir-1.x.testnet", 1234n, "ab".repeat(16))).toBe(simBidHash(7, "grosir-1.x.testnet", 1234n, "ab".repeat(16)));
  });

  it("binds the seller account, so one seller cannot copy another's commitment", () => {
    expect(bidHash(1, "a.testnet", 100n, "ab".repeat(16))).not.toBe(bidHash(1, "b.testnet", 100n, "ab".repeat(16)));
  });
});

describe("salt", () => {
  it("is 16 random bytes as 32 hex chars and differs between calls", () => {
    const a = newSalt();
    expect(a).toMatch(/^[0-9a-f]{32}$/);
    expect(isValidSalt(a)).toBe(true);
    expect(newSalt()).not.toBe(a);
  });

  it("uses the injected byte source", () => {
    expect(newSalt(() => Buffer.alloc(16, 1))).toBe("01".repeat(16));
  });

  it("rejects short or non-hex salts", () => {
    expect(isValidSalt("abc")).toBe(false);
    expect(isValidSalt("zz".repeat(16))).toBe(false);
  });
});

describe("requiredBond", () => {
  it("is ceil(5% x ceiling x qty) and equals the sim", () => {
    expect(requiredBond(16650n, 201n)).toBe(simBond(16650n, 201n));
    expect(requiredBond(1n, 1n)).toBe(1n); // ceil(0.05) = 1
    expect(requiredBond(20000n, 100n)).toBe(100_000n);
  });
});

describe("messages and args", () => {
  it("encodes the commit msg exactly as the contract parses it", () => {
    const hash = "a".repeat(64);
    expect(JSON.parse(commitMsg(4, hash))).toEqual({ commit: { round_id: 4, hash } });
  });

  it("builds ft_transfer_call args with string amounts", () => {
    expect(ftTransferCallArgs("market.x", 900000n, "deposit")).toEqual({
      receiver_id: "market.x", amount: "900000", msg: "deposit",
    });
  });

  it("builds open_round, join_round and reveal_bid args", () => {
    expect(openRoundArgs({ item: "beras-medium", ceilingPrice: 16650n, minTotalQty: 100, joinSecs: 90, commitSecs: 60, revealSecs: 60, deliverySecs: 60 })).toEqual({
      item: "beras-medium", ceiling_price: "16650", min_total_qty: 100, join_secs: 90, commit_secs: 60, reveal_secs: 60, delivery_secs: 60,
    });
    expect(joinRoundArgs(3, 12n)).toEqual({ round_id: 3, qty: 12 });
    expect(revealArgs(3, 15900n, "ff")).toEqual({ round_id: 3, unit_price: "15900", salt: "ff" });
  });
});

describe("policy", () => {
  const refs = { "beras-medium": 16650n, "gula-pasir": 19950n };

  it("caps max_price at the reference price and enables auto_join", () => {
    expect(policyArgs(refs, 2_000_000n).policy).toEqual({
      max_price: { "beras-medium": "16650", "gula-pasir": "19950" }, weekly_budget: "2000000", auto_join: true,
    });
  });

  it("policyMatches detects drift", () => {
    const want = policyArgs(refs, 2_000_000n).policy;
    expect(policyMatches(want, want)).toBe(true);
    expect(policyMatches(null, want)).toBe(false);
    expect(policyMatches({ ...want, weekly_budget: "1" }, want)).toBe(false);
    expect(policyMatches({ ...want, max_price: { "beras-medium": "16650" } }, want)).toBe(false);
  });
});
