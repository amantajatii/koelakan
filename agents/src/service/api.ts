/** HTTP API handlers, framework-free so they can be tested in-process with a mocked chain. */
import type { AccessKeyInfo, ItemView } from "../chain/views.js";
import type { Events } from "./events.js";
import { ApiError, checkSignedFresh, parseSetDemand } from "./nep413.js";
import type { DelegationInfo } from "./runtime.js";
import type { StateStore, WarungRecord } from "./state.js";
import type { StatusBody } from "./status.js";

export const VERSION = "0.2.0";
export const POST_LIMIT_PER_MIN = 10;
const MINUTE_MS = 60_000;

export interface ApiDeps {
  readonly state: StateStore;
  readonly events: Events;
  readonly now: () => number;
  readonly startedAtMs: number;
  readonly items: () => Promise<readonly ItemView[]>;
  readonly accessKey: (account: string, publicKey: string) => Promise<AccessKeyInfo | null>;
  readonly delegation: (account: string) => Promise<DelegationInfo>;
  readonly status: () => StatusBody;
  readonly limiter: RateLimiter;
}

export interface ApiRequest {
  readonly method: string;
  readonly path: string;
  readonly body: unknown;
  readonly ip: string;
}

export interface ApiResponse {
  readonly status: number;
  readonly body: unknown;
}

/** Sliding-window limiter per key (client IP). */
export class RateLimiter {
  private hits: ReadonlyMap<string, readonly number[]> = new Map();

  constructor(private readonly max: number = POST_LIMIT_PER_MIN, private readonly windowMs: number = MINUTE_MS) {}

  /** Returns true if the request is allowed (and counts it). */
  allow(key: string, nowMs: number): boolean {
    const recent = (this.hits.get(key) ?? []).filter((t) => nowMs - t < this.windowMs);
    if (recent.length >= this.max) {
      this.hits = new Map(this.hits).set(key, recent);
      return false;
    }
    this.hits = new Map(this.hits).set(key, [...recent, nowMs]);
    return true;
  }
}

const json = (status: number, body: unknown): ApiResponse => ({ status, body });
const fail = (status: number, error: string, detail?: string): ApiResponse =>
  json(status, detail === undefined ? { ok: false, error } : { ok: false, error, detail });

async function warungShape(d: ApiDeps, rec: WarungRecord) {
  let del: DelegationInfo = { delegated: false, autoJoin: null };
  try {
    del = await d.delegation(rec.account_id);
  } catch (e) {
    d.events.emit({ kind: "error", account: rec.account_id, message: `delegation check failed: ${e instanceof Error ? e.message : String(e)}` });
  }
  return {
    account_id: rec.account_id, demand: rec.demand, registered_at: rec.registered_at, updated_at: rec.updated_at,
    delegated: del.delegated, auto_join: del.autoJoin, last_actions: rec.last_actions,
  };
}

async function getWarung(d: ApiDeps, account: string): Promise<ApiResponse> {
  const rec = d.state.warung(account);
  return rec === null ? fail(404, "not_registered") : json(200, await warungShape(d, rec));
}

async function postWarung(d: ApiDeps, body: unknown): Promise<ApiResponse> {
  const req = parseSetDemand(body);
  const nowMs = d.now();
  checkSignedFresh(req, nowMs);
  if (d.state.hasNonce(req.nonceB64)) throw new ApiError(401, "nonce_reused", "this nonce was already used");
  d.state.addNonce(req.nonceB64, nowMs);
  const key = await d.accessKey(req.account_id, req.public_key);
  if (key === null || key.kind !== "full") {
    throw new ApiError(401, "not_full_access_key", `${req.public_key} is not a full-access key of ${req.account_id}`);
  }
  const known = new Set((await d.items()).map((i) => i.id));
  const unknown = Object.keys(req.demand).filter((id) => !known.has(id));
  if (unknown.length > 0) throw new ApiError(400, "unknown_item", `unknown item id(s): ${unknown.join(", ")}`);
  const nowIso = new Date(nowMs).toISOString();
  if (Object.values(req.demand).every((q) => q === 0)) {
    const prior = d.state.warung(req.account_id);
    d.state.removeWarung(req.account_id);
    d.events.emit({ kind: "unregistered", account: req.account_id, message: `${req.account_id} unregistered (demand all zero)` });
    return json(200, { ok: true, warung: await warungShape(d, {
      account_id: req.account_id, demand: {}, registered_at: prior?.registered_at ?? nowIso, updated_at: nowIso, last_actions: [],
    }) });
  }
  const rec = d.state.upsertWarung(req.account_id, req.demand, nowIso);
  d.events.emit({ kind: "registered", account: req.account_id, message: `${req.account_id} set demand ${JSON.stringify(req.demand)}` });
  return json(200, { ok: true, warung: await warungShape(d, rec) });
}

export async function handleApi(d: ApiDeps, req: ApiRequest): Promise<ApiResponse> {
  try {
    if (req.method === "GET" && req.path === "/health") {
      return json(200, { ok: true, version: VERSION, uptime_s: Math.floor((d.now() - d.startedAtMs) / 1000) });
    }
    if (req.method === "GET" && req.path === "/status") return json(200, d.status());
    const m = /^\/warungs\/([^/]+)$/.exec(req.path);
    if (req.method === "GET" && m !== null) return await getWarung(d, decodeURIComponent(m[1] as string));
    if (req.method === "POST" && req.path === "/warungs") {
      if (!d.limiter.allow(req.ip, d.now())) return fail(429, "rate_limited", "too many requests, retry in a minute");
      return await postWarung(d, req.body);
    }
    return fail(404, "not_found");
  } catch (e) {
    if (e instanceof ApiError) return fail(e.status, e.code, e.detail);
    d.events.emit({ kind: "error", message: `api ${req.method} ${req.path}: ${e instanceof Error ? e.message : String(e)}` });
    return fail(500, "internal", "unexpected error");
  }
}
