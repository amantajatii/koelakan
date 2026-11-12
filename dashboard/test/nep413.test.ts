import { describe, expect, it } from "vitest";
import { buildDemandMessage, buildSignRequest, buildSubmission, isUnregister, parseDemandInputs, parseSignCallback, randomNonce } from "@/lib/nep413";

const NOW = new Date("2026-11-12T08:00:00.000Z");

describe("buildDemandMessage", () => {
  it("has the exact JSON shape and key order", () => {
    const msg = buildDemandMessage("a.testnet", { "beras-medium": 20, "gula-pasir": 0 }, NOW);
    expect(msg).toBe('{"action":"set_demand","account_id":"a.testnet","demand":{"beras-medium":20,"gula-pasir":0},"issued_at":"2026-11-12T08:00:00.000Z"}');
    expect(JSON.parse(msg).action).toBe("set_demand");
  });
});

describe("buildSignRequest", () => {
  it("uses recipient koelakan-agent and a 32 byte nonce", () => {
    const req = buildSignRequest("a.testnet", { "beras-medium": 5 }, NOW);
    expect(req.recipient).toBe("koelakan-agent");
    expect(req.nonce).toHaveLength(32);
    expect(atob(req.nonceBase64)).toHaveLength(32);
  });
  it("generates a fresh nonce each time and rejects wrong sizes", () => {
    expect(randomNonce()).not.toEqual(randomNonce());
    expect(() => buildSignRequest("a.testnet", {}, NOW, new Uint8Array(16))).toThrow();
  });
  it("builds the POST body from the signed result", () => {
    const req = buildSignRequest("a.testnet", { "beras-medium": 5 }, NOW, new Uint8Array(32).fill(1));
    const body = buildSubmission(req, { accountId: "a.testnet", publicKey: "ed25519:k", signature: "c2ln" });
    expect(body).toEqual({
      account_id: "a.testnet", public_key: "ed25519:k", signature: "c2ln",
      nonce: req.nonceBase64, recipient: "koelakan-agent", message: req.message,
    });
  });
});

describe("parseDemandInputs", () => {
  it("accepts 0..1000 and treats blank as 0", () => {
    expect(parseDemandInputs({ a: "10", b: "", c: "1000" })).toEqual({ ok: true, demand: { a: 10, b: 0, c: 1000 } });
  });
  it("rejects negatives, decimals and values over 1000", () => {
    expect(parseDemandInputs({ a: "-1" }).ok).toBe(false);
    expect(parseDemandInputs({ a: "1.5" }).ok).toBe(false);
    expect(parseDemandInputs({ a: "1001" }).ok).toBe(false);
  });
  it("detects an all-zero (unregister) order", () => {
    expect(isUnregister({ a: 0, b: 0 })).toBe(true);
    expect(isUnregister({ a: 0, b: 1 })).toBe(false);
  });
});

describe("parseSignCallback", () => {
  it("reads the redirect hash", () => {
    expect(parseSignCallback("#accountId=a.testnet&publicKey=ed25519%3Ak&signature=c2ln")).toEqual({ accountId: "a.testnet", publicKey: "ed25519:k", signature: "c2ln" });
  });
  it("returns null when incomplete", () => expect(parseSignCallback("#accountId=a.testnet")).toBeNull());
});
