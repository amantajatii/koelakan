import { AGENT_RECIPIENT } from "./config";
import type { DemandSubmission } from "./agent-types";

export const MAX_DEMAND_QTY = 1000;
export const NONCE_BYTES = 32;

/** Quantities typed by the owner (kg per round), keyed by item id. Zero means "do not buy". */
export type Demand = Record<string, number>;

export type DemandCheck = { ok: true; demand: Demand } | { ok: false; message: string };

/** Validate raw text inputs: each must be a whole number from 0 to 1000. Keeps every item, zeros included. */
export function parseDemandInputs(raw: Readonly<Record<string, string>>): DemandCheck {
  const demand: Demand = {};
  for (const [item, text] of Object.entries(raw)) {
    const t = text.trim() === "" ? "0" : text.trim();
    if (!/^\d+$/.test(t)) return { ok: false, message: "Quantities must be whole numbers (kg per round)." };
    const n = Number(t);
    if (n > MAX_DEMAND_QTY) return { ok: false, message: `The maximum is ${MAX_DEMAND_QTY} per item per round.` };
    demand[item] = n;
  }
  return { ok: true, demand };
}

export const isUnregister = (demand: Demand): boolean => Object.values(demand).every((q) => q === 0);

/** The exact JSON string the service verifies (key order is part of the contract shape). */
export function buildDemandMessage(accountId: string, demand: Demand, issuedAt: Date): string {
  return JSON.stringify({ action: "set_demand", account_id: accountId, demand, issued_at: issuedAt.toISOString() });
}

export function randomNonce(): Uint8Array {
  const bytes = new Uint8Array(NONCE_BYTES);
  crypto.getRandomValues(bytes);
  return bytes;
}

export function toBase64(bytes: Uint8Array): string {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
}

export interface SignRequest {
  accountId: string;
  message: string;
  recipient: string;
  nonce: Uint8Array;
  nonceBase64: string;
}

export function buildSignRequest(accountId: string, demand: Demand, now: Date = new Date(), nonce: Uint8Array = randomNonce()): SignRequest {
  if (nonce.length !== NONCE_BYTES) throw new Error(`NEP-413 nonce must be ${NONCE_BYTES} bytes`);
  return {
    accountId,
    message: buildDemandMessage(accountId, demand, now),
    recipient: AGENT_RECIPIENT,
    nonce,
    nonceBase64: toBase64(nonce),
  };
}

export interface SignedResult {
  accountId: string;
  publicKey: string;
  signature: string;
}

/** Combine the request and the wallet's signature into the POST /warungs body. */
export function buildSubmission(req: SignRequest, signed: SignedResult): DemandSubmission {
  return {
    account_id: req.accountId,
    public_key: signed.publicKey,
    signature: signed.signature,
    nonce: req.nonceBase64,
    recipient: req.recipient,
    message: req.message,
  };
}

/** Redirect wallets return `#accountId=..&publicKey=..&signature=..` on the callback URL. */
export function parseSignCallback(hash: string): SignedResult | null {
  const params = new URLSearchParams(hash.startsWith("#") ? hash.slice(1) : hash);
  const accountId = params.get("accountId");
  const publicKey = params.get("publicKey");
  const signature = params.get("signature");
  return accountId && publicKey && signature ? { accountId, publicKey, signature } : null;
}

/** Wallets known to expose NEP-413 `signMessage`; others get a hint to switch. */
export const SIGN_MESSAGE_HINT =
  "This wallet cannot sign messages. Sign out and sign in with MyNearWallet or Meteor to save a standing order.";
