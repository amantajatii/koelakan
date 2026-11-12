import { afterEach, describe, expect, it, vi } from "vitest";
import { explainApiError, fetchHealth, fetchStatus, fetchWarung, parseStatus, submitDemand } from "@/lib/agent-api";
import type { DemandSubmission } from "@/lib/agent-types";
import { STATUS, WARUNG, jsonResponse } from "./agent-fixtures";

const mockFetch = (impl: (url: string, init?: RequestInit) => Promise<Response>) =>
  vi.stubGlobal("fetch", vi.fn((u: string, i?: RequestInit) => impl(u, i)));

afterEach(() => vi.unstubAllGlobals());

const SUB: DemandSubmission = { account_id: "a.testnet", public_key: "ed25519:x", signature: "c2ln", nonce: "bm9uY2U=", recipient: "koelakan-agent", message: "{}" };

describe("parseStatus", () => {
  it("accepts the documented shape", () => expect(parseStatus(STATUS)).toEqual(STATUS));
  it("rejects missing or mistyped fields", () => {
    expect(parseStatus({ ...STATUS, tick_secs: "15" })).toBeNull();
    expect(parseStatus({ ...STATUS, cadence: { round_every_min: 10 } })).toBeNull();
    expect(parseStatus({ ...STATUS, last_tick_at: "not a date" })).toBeNull();
    expect(parseStatus({ ...STATUS, ok: false })).toBeNull();
    expect(parseStatus(null)).toBeNull();
  });
  it("allows null last_tick_at and next_open_at", () => {
    expect(parseStatus({ ...STATUS, last_tick_at: null, next_open_at: null })).not.toBeNull();
  });
});

describe("fetchStatus / fetchHealth", () => {
  it("returns parsed data on 200", async () => {
    mockFetch(async () => jsonResponse(200, STATUS));
    const r = await fetchStatus();
    expect(r.ok && r.data.cadence.round_every_min).toBe(10);
  });
  it("calls the configured base URL", async () => {
    const spy = vi.fn(async () => jsonResponse(200, { ok: true, version: "1.0.0", uptime_s: 5 }));
    vi.stubGlobal("fetch", spy);
    const r = await fetchHealth();
    expect(r.ok).toBe(true);
    expect((spy.mock.calls[0] as unknown as [string])[0]).toMatch(/\/health$/);
  });
  it("reports offline when fetch throws", async () => {
    mockFetch(async () => { throw new TypeError("failed to fetch"); });
    const r = await fetchStatus();
    expect(r).toMatchObject({ ok: false, kind: "offline" });
  });
  it("reports offline on gateway errors", async () => {
    mockFetch(async () => jsonResponse(502, {}));
    expect(await fetchStatus()).toMatchObject({ ok: false, kind: "offline" });
  });
  it("flags a malformed 200 as invalid_response", async () => {
    mockFetch(async () => jsonResponse(200, { ok: true }));
    expect(await fetchStatus()).toMatchObject({ ok: false, kind: "invalid_response" });
  });
});

describe("fetchWarung", () => {
  it("parses a registered warung and encodes the account", async () => {
    const spy = vi.fn(async () => jsonResponse(200, WARUNG));
    vi.stubGlobal("fetch", spy);
    const r = await fetchWarung("owner.testnet");
    expect(r.ok && r.data.delegated).toBe(true);
    expect((spy.mock.calls[0] as unknown as [string])[0]).toMatch(/\/warungs\/owner\.testnet$/);
  });
  it("maps 404 not_registered", async () => {
    mockFetch(async () => jsonResponse(404, { ok: false, error: "not_registered" }));
    expect(await fetchWarung("x.testnet")).toMatchObject({ ok: false, kind: "not_registered" });
  });
  it("rejects an invalid last_actions entry", async () => {
    mockFetch(async () => jsonResponse(200, { ...WARUNG, last_actions: [{ at: "x" }] }));
    expect(await fetchWarung("owner.testnet")).toMatchObject({ ok: false, kind: "invalid_response" });
  });
});

describe("submitDemand and error mapping", () => {
  it("POSTs JSON and succeeds on 200", async () => {
    const spy = vi.fn(async (...args: [string, RequestInit?]) => {
      void args;
      return jsonResponse(200, { ok: true });
    });
    vi.stubGlobal("fetch", spy);
    expect((await submitDemand(SUB)).ok).toBe(true);
    const init = spy.mock.calls[0]?.[1];
    expect(init?.method).toBe("POST");
    expect(JSON.parse(String(init?.body))).toEqual(SUB);
  });
  it.each(["bad_request", "bad_signature", "not_full_access_key", "expired", "nonce_reused", "unknown_item"])("maps %s to friendly text", async (code) => {
    mockFetch(async () => jsonResponse(code === "bad_signature" ? 401 : 400, { ok: false, error: code, detail: "raw detail" }));
    const r = await submitDemand(SUB);
    expect(r).toMatchObject({ ok: false, kind: "api_error", code });
    if (!r.ok) {
      expect(r.message).toBe(explainApiError(code));
      expect(r.message).not.toContain("raw detail");
      expect(r.message).not.toBe(code);
    }
  });
  it("falls back to the detail for unknown codes", () => {
    expect(explainApiError("weird", "boom")).toContain("boom");
    expect(explainApiError(null)).toMatch(/unexpected/);
  });
});
