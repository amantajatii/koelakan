import * as borsh from "borsh";
import { createHash } from "node:crypto";
import { KeyPair, baseEncode } from "near-api-js";
import { describe, expect, it } from "vitest";
import {
  ApiError, NEP413_RECIPIENT, checkSignedFresh, nep413Digest, parseSetDemand, verifyNep413,
} from "../../src/service/nep413.js";

const TAG = 2147484061;
const PAYLOAD_SCHEMA = {
  struct: { message: "string", nonce: { array: { type: "u8", len: 32 } }, recipient: "string", callbackUrl: { option: "string" } },
};

/** Wallet-side signing, built with the independent `borsh` library (not our hand-rolled encoder). */
function walletSign(kp: KeyPair, message: string, nonce: Buffer, recipient = NEP413_RECIPIENT) {
  const payload = borsh.serialize(PAYLOAD_SCHEMA, { message, nonce: [...nonce], recipient, callbackUrl: null });
  const tag = Buffer.alloc(4);
  tag.writeUInt32LE(TAG);
  const digest = createHash("sha256").update(Buffer.concat([tag, payload])).digest();
  return Buffer.from(kp.sign(digest).signature).toString("base64");
}

const NOW = Date.parse("2026-11-12T10:00:00Z");
const kp = KeyPair.fromRandom("ed25519");
const pk = kp.getPublicKey().toString();

function body(over: Record<string, unknown> = {}, msgOver: Record<string, unknown> = {}) {
  const nonce = Buffer.alloc(32, 7);
  const message = JSON.stringify({
    action: "set_demand", account_id: "pak.testnet", demand: { "beras-medium": 10 }, issued_at: new Date(NOW - 60_000).toISOString(), ...msgOver,
  });
  return {
    account_id: "pak.testnet", public_key: pk, signature: walletSign(kp, message, nonce), nonce: nonce.toString("base64"),
    recipient: NEP413_RECIPIENT, message, ...over,
  };
}

describe("NEP-413 verification", () => {
  it("our digest matches the independent borsh encoding", () => {
    const nonce = Buffer.alloc(32, 1);
    const payload = borsh.serialize(PAYLOAD_SCHEMA, { message: "hi", nonce: [...nonce], recipient: "r", callbackUrl: null });
    const tag = Buffer.alloc(4);
    tag.writeUInt32LE(TAG);
    expect(nep413Digest({ message: "hi", nonce, recipient: "r" }).toString("hex")).toBe(
      createHash("sha256").update(Buffer.concat([tag, payload])).digest("hex"),
    );
  });

  it("accepts a good signature and fresh issued_at", () => {
    const req = parseSetDemand(body());
    expect(() => checkSignedFresh(req, NOW)).not.toThrow();
    expect(req.demand).toEqual({ "beras-medium": 10 });
  });

  it("accepts an ed25519:-prefixed base58 signature as well as base64", () => {
    const b = body();
    const b58 = `ed25519:${baseEncode(Buffer.from(b.signature, "base64"))}`;
    const req = parseSetDemand({ ...b, signature: b58 });
    expect(() => checkSignedFresh(req, NOW)).not.toThrow();
    expect(() => parseSetDemand({ ...b, signature: "ed25519:0OIl" })).toThrow(/bad_request/);
  });

  it("rejects a signature made by another key", () => {
    const other = KeyPair.fromRandom("ed25519");
    const b = body();
    const forged = walletSign(other, b.message, Buffer.alloc(32, 7));
    expect(() => checkSignedFresh(parseSetDemand({ ...b, signature: forged }), NOW)).toThrow(/bad_signature/);
  });

  it("rejects a tampered message or a different recipient in the signed payload", () => {
    const b = body();
    const tampered = JSON.stringify({ ...JSON.parse(b.message), demand: { "beras-medium": 999 } });
    expect(() => checkSignedFresh(parseSetDemand({ ...b, message: tampered }), NOW)).toThrow(/bad_signature/);
    const wrongRecipient = walletSign(kp, b.message, Buffer.alloc(32, 7), "someone-else");
    expect(() => checkSignedFresh(parseSetDemand({ ...b, signature: wrongRecipient }), NOW)).toThrow(/bad_signature/);
  });

  it("rejects stale and far-future issued_at", () => {
    const old = body({}, { issued_at: new Date(NOW - 11 * 60_000).toISOString() });
    expect(() => checkSignedFresh(parseSetDemand(old), NOW)).toThrow(/expired/);
    const future = body({}, { issued_at: new Date(NOW + 11 * 60_000).toISOString() });
    expect(() => checkSignedFresh(parseSetDemand(future), NOW)).toThrow(/expired/);
  });

  it("rejects an account mismatch between message and body, and malformed input", () => {
    expect(() => parseSetDemand(body({ account_id: "other.testnet" }))).toThrow(/bad_request/);
    expect(() => parseSetDemand(body({ recipient: "evil" }))).toThrow(/bad_request/);
    expect(() => parseSetDemand(body({ nonce: Buffer.alloc(16).toString("base64") }))).toThrow(/bad_request/);
    expect(() => parseSetDemand(body({}, { demand: { "beras-medium": 1001 } }))).toThrow(/bad_request/);
    expect(() => parseSetDemand(body({}, { demand: { "beras-medium": 1.5 } }))).toThrow(/bad_request/);
    expect(() => parseSetDemand(null)).toThrow(ApiError);
  });

  it("verifyNep413 returns false (never throws) on garbage keys", () => {
    expect(verifyNep413("ed25519:not-a-key", new Uint8Array(64), { message: "m", nonce: new Uint8Array(32), recipient: "r" })).toBe(false);
  });
});
