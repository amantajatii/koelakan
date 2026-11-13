import { config } from "./config";
import type {
  AgentHealth,
  AgentStatus,
  DemandSubmission,
  GrosirAgent,
  ServiceEvent,
  WarungAction,
  WarungRecord,
} from "./agent-types";

const TIMEOUT_MS = 8_000;

export type ApiFailureKind = "offline" | "not_registered" | "api_error" | "invalid_response";

export interface ApiFailure {
  ok: false;
  kind: ApiFailureKind;
  /** Error code from the service (bad_signature, expired, ...), when it sent one. */
  code: string | null;
  /** Friendly English text, safe to show to owners. */
  message: string;
}
export type ApiResult<T> = { ok: true; data: T } | ApiFailure;

export const OFFLINE_MESSAGE = "Agent service offline. On-chain data is still live.";

const ERROR_TEXT: Readonly<Record<string, string>> = {
  bad_request: "The request was malformed. Check the quantities and try again.",
  bad_signature: "The wallet signature could not be verified. Sign again with the same account.",
  not_full_access_key: "The signature came from a restricted key. Sign with a full-access key (your wallet's main key).",
  expired: "The signed request expired. Click save again to sign a fresh one.",
  nonce_reused: "That signature was already used. Click save again to sign a fresh one.",
  unknown_item: "One of the items is not in the catalogue. Reload the page and try again.",
  not_registered: "This account has no standing order yet.",
};

/** Map a service error code to friendly English text. Unknown codes keep their detail. */
export function explainApiError(code: string | null, detail?: string | null): string {
  if (code && ERROR_TEXT[code]) return ERROR_TEXT[code];
  return detail ? `The agent service refused the request: ${detail}` : "The agent service returned an unexpected error.";
}

// Runtime validation (handwritten, no dependencies)

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => typeof v === "object" && v !== null && !Array.isArray(v);
const isStr = (v: unknown): v is string => typeof v === "string";
const isNum = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);
const isIso = (v: unknown): v is string => isStr(v) && !Number.isNaN(Date.parse(v));
const nullable = <T,>(check: (v: unknown) => v is T) => (v: unknown): v is T | null => v === null || check(v);
const isArr = <T,>(v: unknown, item: (x: unknown) => x is T): v is T[] => Array.isArray(v) && v.every(item);

function isGrosir(v: unknown): v is GrosirAgent {
  return isObj(v) && isStr(v.account_id) && isStr(v.near) && isStr(v.tidr_wallet) && isStr(v.market_available) && typeof v.paused === "boolean";
}
function isEvent(v: unknown): v is ServiceEvent {
  return (
    isObj(v) && isIso(v.at) && isStr(v.kind) && nullable(isNum)(v.round_id) && nullable(isStr)(v.account) && isStr(v.message) && nullable(isStr)(v.tx)
  );
}
function isActiveRound(v: unknown): v is AgentStatus["active_rounds"][number] {
  return isObj(v) && isNum(v.id) && isStr(v.item) && isStr(v.phase);
}
function isAction(v: unknown): v is WarungAction {
  return (
    isObj(v) && isIso(v.at) && isNum(v.round_id) && (v.action === "joined" || v.action === "skipped") &&
    nullable(isNum)(v.qty) && nullable(isStr)(v.reason) && nullable(isStr)(v.tx)
  );
}

export function parseHealth(v: unknown): AgentHealth | null {
  return isObj(v) && v.ok === true && isStr(v.version) && isNum(v.uptime_s) ? { ok: true, version: v.version, uptime_s: v.uptime_s } : null;
}

export function parseStatus(v: unknown): AgentStatus | null {
  if (!isObj(v) || v.ok !== true) return null;
  const { cadence, agents, budget } = v;
  if (!isStr(v.network) || !isStr(v.market) || !isStr(v.service_public_key)) return null;
  if (!isStr(v.service_fc_allowance_near) || !isNum(v.tick_secs)) return null;
  if (!nullable(isIso)(v.last_tick_at) || !nullable(isIso)(v.next_open_at)) return null;
  if (!isObj(cadence) || !isNum(cadence.round_every_min) || !isNum(cadence.join_secs) || !isNum(cadence.commit_secs) || !isNum(cadence.reveal_secs) || !isNum(cadence.delivery_secs)) return null;
  if (!isObj(agents) || !isArr(agents.grosir, isGrosir) || !isNum(agents.seeded_warungs) || !isNum(agents.delegated_warungs)) return null;
  if (!isObj(budget) || !isStr(budget.est_near_per_day) || !isArr(budget.low_accounts, isStr)) return null;
  if (!isArr(v.active_rounds, isActiveRound) || !isArr(v.recent_events, isEvent)) return null;
  return v as unknown as AgentStatus;
}

export function parseWarung(v: unknown): WarungRecord | null {
  if (!isObj(v) || !isStr(v.account_id) || !isObj(v.demand)) return null;
  if (!Object.values(v.demand).every(isNum)) return null;
  if (!isIso(v.registered_at) || !isIso(v.updated_at) || typeof v.delegated !== "boolean") return null;
  if (!nullable((x): x is boolean => typeof x === "boolean")(v.auto_join)) return null;
  if (!isArr(v.last_actions, isAction)) return null;
  return v as unknown as WarungRecord;
}

// HTTP client

const offline = (): ApiFailure => ({ ok: false, kind: "offline", code: null, message: OFFLINE_MESSAGE });
const invalid = (): ApiFailure => ({ ok: false, kind: "invalid_response", code: null, message: "The agent service sent an unexpected response." });

async function request(path: string, init?: RequestInit): Promise<{ status: number; body: unknown } | ApiFailure> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`${config.agentApiUrl}${path}`, { ...init, signal: ctrl.signal, cache: "no-store" });
    let body: unknown = null;
    try {
      body = await res.json();
    } catch {
      body = null;
    }
    if (res.status >= 502 && res.status <= 504) return offline();
    return { status: res.status, body };
  } catch {
    return offline();
  } finally {
    clearTimeout(timer);
  }
}

function failureFrom(status: number, body: unknown): ApiFailure {
  const code = isObj(body) && isStr(body.error) ? body.error : null;
  const detail = isObj(body) && isStr(body.detail) ? body.detail : null;
  if (code === "not_registered" || status === 404) {
    return { ok: false, kind: "not_registered", code: "not_registered", message: ERROR_TEXT.not_registered ?? "" };
  }
  return { ok: false, kind: "api_error", code, message: explainApiError(code, detail) };
}

export async function fetchHealth(): Promise<ApiResult<AgentHealth>> {
  const r = await request("/health");
  if ("ok" in r) return r;
  const data = parseHealth(r.body);
  return r.status === 200 && data ? { ok: true, data } : r.status === 200 ? invalid() : failureFrom(r.status, r.body);
}

export async function fetchStatus(): Promise<ApiResult<AgentStatus>> {
  const r = await request("/status");
  if ("ok" in r) return r;
  if (r.status !== 200) return failureFrom(r.status, r.body);
  const data = parseStatus(r.body);
  return data ? { ok: true, data } : invalid();
}

export async function fetchWarung(accountId: string): Promise<ApiResult<WarungRecord>> {
  const r = await request(`/warungs/${encodeURIComponent(accountId)}`);
  if ("ok" in r) return r;
  if (r.status !== 200) return failureFrom(r.status, r.body);
  const data = parseWarung(r.body);
  return data ? { ok: true, data } : invalid();
}

export async function submitDemand(body: DemandSubmission): Promise<ApiResult<null>> {
  const r = await request("/warungs", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  if ("ok" in r) return r;
  if (r.status >= 200 && r.status < 300) return { ok: true, data: null };
  return failureFrom(r.status, r.body);
}
