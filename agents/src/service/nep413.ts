/** NEP-413 (sign message) verification plus the validation of Koelakan's set_demand payload. */
import { createHash } from "node:crypto";
import { PublicKey, baseDecode } from "near-api-js";

const NEP413_TAG = 2147484061; // 2^31 + 413
export const NEP413_RECIPIENT = "koelakan-agent";
const NONCE_BYTES = 32;
const MAX_AGE_MS = 10 * 60 * 1000;
const MAX_DEMAND = 1000;

export type ErrorCode = "bad_request" | "bad_signature" | "not_full_access_key" | "expired" | "nonce_reused" | "unknown_item";

export class ApiError extends Error {
  constructor(readonly status: number, readonly code: ErrorCode, readonly detail: string) {
    super(`${code}: ${detail}`);
  }
}

const u32 = (n: number): Buffer => {
  const b = Buffer.alloc(4);
  b.writeUInt32LE(n);
  return b;
};

const borshString = (s: string): Buffer => {
  const body = Buffer.from(s, "utf8");
  return Buffer.concat([u32(body.length), body]);
};

export interface Nep413Payload {
  readonly message: string;
  readonly nonce: Uint8Array;
  readonly recipient: string;
}

/** sha256(u32 tag || borsh{message, nonce[32], recipient, callbackUrl: Option<string> = None}). */
export function nep413Digest(p: Nep413Payload): Buffer {
  const payload = Buffer.concat([borshString(p.message), Buffer.from(p.nonce), borshString(p.recipient), Buffer.from([0])]);
  return createHash("sha256").update(Buffer.concat([u32(NEP413_TAG), payload])).digest();
}

export function verifyNep413(publicKey: string, signature: Uint8Array, p: Nep413Payload): boolean {
  try {
    return PublicKey.fromString(publicKey).verify(nep413Digest(p), signature);
  } catch {
    return false; // malformed key or signature bytes simply fail verification
  }
}

const B64 = /^[A-Za-z0-9+/]+={0,2}$/;

function decodeBase64(raw: unknown, what: string): Buffer {
  if (typeof raw !== "string" || raw.length === 0 || !B64.test(raw)) throw new ApiError(400, "bad_request", `${what} must be base64`);
  return Buffer.from(raw, "base64");
}

const SIG_PREFIX = "ed25519:";

/** Wallet Selector returns base64; some wallets return "ed25519:<base58>". Accept both. */
function decodeSignature(raw: unknown): Buffer {
  if (typeof raw === "string" && raw.startsWith(SIG_PREFIX)) {
    try {
      return Buffer.from(baseDecode(raw.slice(SIG_PREFIX.length)));
    } catch {
      throw new ApiError(400, "bad_request", "signature is not valid base58");
    }
  }
  return decodeBase64(raw, "signature");
}

export interface SetDemandRequest {
  readonly account_id: string;
  readonly public_key: string;
  readonly signature: Buffer;
  readonly nonce: Buffer;
  readonly nonceB64: string;
  readonly message: string;
  readonly demand: Readonly<Record<string, number>>;
  readonly issued_at: number;
}

const ACCOUNT_RE = /^[a-z0-9._-]{2,64}$/;
const isObject = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const bad = (detail: string): ApiError => new ApiError(400, "bad_request", detail);

function parseDemand(raw: unknown): Record<string, number> {
  if (!isObject(raw)) throw bad("demand must be an object");
  const out: Record<string, number> = {};
  for (const [item, qty] of Object.entries(raw)) {
    if (typeof qty !== "number" || !Number.isInteger(qty) || qty < 0 || qty > MAX_DEMAND) throw bad(`demand['${item}'] must be an integer 0..${MAX_DEMAND}`);
    out[item] = qty;
  }
  return out;
}

function parseMessage(raw: string): { account_id: string; demand: Record<string, number>; issued_at: number } {
  let m: unknown;
  try {
    m = JSON.parse(raw);
  } catch {
    throw bad("message is not valid JSON");
  }
  if (!isObject(m) || m.action !== "set_demand") throw bad("message.action must be 'set_demand'");
  if (typeof m.account_id !== "string") throw bad("message.account_id missing");
  const issued = typeof m.issued_at === "string" ? Date.parse(m.issued_at) : Number.NaN;
  if (Number.isNaN(issued)) throw bad("message.issued_at must be an ISO timestamp");
  return { account_id: m.account_id, demand: parseDemand(m.demand), issued_at: issued };
}

/** Pure shape validation of the POST /warungs body (no signature or chain checks yet). */
export function parseSetDemand(body: unknown): SetDemandRequest {
  if (!isObject(body)) throw bad("body must be a JSON object");
  const { account_id, public_key, message, recipient } = body;
  if (typeof account_id !== "string" || !ACCOUNT_RE.test(account_id)) throw bad("account_id is invalid");
  if (typeof public_key !== "string" || !public_key.startsWith("ed25519:")) throw bad("public_key must be ed25519:...");
  if (typeof message !== "string") throw bad("message must be a string");
  if (recipient !== NEP413_RECIPIENT) throw bad(`recipient must be '${NEP413_RECIPIENT}'`);
  const nonce = decodeBase64(body.nonce, "nonce");
  if (nonce.length !== NONCE_BYTES) throw bad(`nonce must be ${NONCE_BYTES} bytes`);
  const signature = decodeSignature(body.signature);
  const parsed = parseMessage(message);
  if (parsed.account_id !== account_id) throw bad("account_id in message and body differ");
  return { account_id, public_key, signature, nonce, nonceB64: nonce.toString("base64"), message, demand: parsed.demand, issued_at: parsed.issued_at };
}

/** Signature + freshness. Throws ApiError(401). */
export function checkSignedFresh(req: SetDemandRequest, nowMs: number): void {
  const ok = verifyNep413(req.public_key, req.signature, { message: req.message, nonce: req.nonce, recipient: NEP413_RECIPIENT });
  if (!ok) throw new ApiError(401, "bad_signature", "signature does not verify for this public_key");
  if (Math.abs(nowMs - req.issued_at) > MAX_AGE_MS) throw new ApiError(401, "expired", "issued_at is older than 10 minutes");
}
