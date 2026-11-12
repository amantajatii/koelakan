import * as borsh from "borsh";
import { createHash } from "node:crypto";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { KeyPair } from "near-api-js";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { RateLimiter, handleApi, type ApiDeps, type ApiRequest } from "../../src/service/api.js";
import { Events } from "../../src/service/events.js";
import { NEP413_RECIPIENT } from "../../src/service/nep413.js";
import { StateStore } from "../../src/service/state.js";
import { corsHeaders } from "../../src/service/server.js";
import { item } from "./helpers.js";

const NOW = Date.parse("2026-11-12T10:00:00Z");
const kp = KeyPair.fromRandom("ed25519");
const pk = kp.getPublicKey().toString();
const SCHEMA = { struct: { message: "string", nonce: { array: { type: "u8", len: 32 } }, recipient: "string", callbackUrl: { option: "string" } } };

function signed(account: string, demand: Record<string, number>, nonceByte = 1, signer = kp) {
  const nonce = Buffer.alloc(32, nonceByte);
  const message = JSON.stringify({ action: "set_demand", account_id: account, demand, issued_at: new Date(NOW).toISOString() });
  const tag = Buffer.alloc(4);
  tag.writeUInt32LE(2147484061);
  const payload = borsh.serialize(SCHEMA, { message, nonce: [...nonce], recipient: NEP413_RECIPIENT, callbackUrl: null });
  const digest = createHash("sha256").update(Buffer.concat([tag, payload])).digest();
  return {
    account_id: account, public_key: signer.getPublicKey().toString(), signature: Buffer.from(signer.sign(digest).signature).toString("base64"),
    nonce: nonce.toString("base64"), recipient: NEP413_RECIPIENT, message,
  };
}

let dir: string;
let deps: ApiDeps;
let keys: Record<string, "full" | "fc" | null>;
let delegated: boolean;

const post = (body: unknown, ip = "1.1.1.1"): Promise<{ status: number; body: any }> =>
  handleApi(deps, { method: "POST", path: "/warungs", body, ip } as ApiRequest) as Promise<{ status: number; body: any }>;
const get = (path: string) => handleApi(deps, { method: "GET", path, body: undefined, ip: "x" }) as Promise<{ status: number; body: any }>;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "koelakan-api-"));
  keys = { [`pak.testnet:${pk}`]: "full" };
  delegated = false;
  deps = {
    state: new StateStore(dir), events: new Events(() => undefined), now: () => NOW, startedAtMs: NOW - 5_000,
    items: async () => [item("beras-medium"), item("gula-pasir")],
    accessKey: async (a, k) => {
      const kind = keys[`${a}:${k}`];
      return kind === "full" ? { kind: "full" } : kind === "fc" ? { kind: "function-call", receiver: "m", methods: ["join_round"], allowance: 1n } : null;
    },
    delegation: async () => ({ delegated, autoJoin: true }),
    status: () => ({ ok: true }) as never, limiter: new RateLimiter(10, 60_000),
  };
});
afterEach(() => rmSync(dir, { recursive: true, force: true }));

describe("GET endpoints", () => {
  it("/health", async () => {
    const r = await get("/health");
    expect(r.status).toBe(200);
    expect(r.body).toEqual({ ok: true, version: expect.any(String), uptime_s: 5 });
  });

  it("/warungs/:id is 404 not_registered when unknown", async () => {
    const r = await get("/warungs/nobody.testnet");
    expect(r.status).toBe(404);
    expect(r.body).toEqual({ ok: false, error: "not_registered" });
  });

  it("unknown routes are 404", async () => {
    expect((await get("/nope")).status).toBe(404);
  });
});

describe("POST /warungs", () => {
  it("registers a warung, returns the GET shape and persists it", async () => {
    delegated = true;
    const r = await post(signed("pak.testnet", { "beras-medium": 10, "gula-pasir": 0 }));
    expect(r.status).toBe(200);
    expect(r.body.ok).toBe(true);
    expect(r.body.warung).toEqual({
      account_id: "pak.testnet", demand: { "beras-medium": 10, "gula-pasir": 0 }, registered_at: new Date(NOW).toISOString(),
      updated_at: new Date(NOW).toISOString(), delegated: true, auto_join: true, last_actions: [],
    });
    const g = await get("/warungs/pak.testnet");
    expect(g.status).toBe(200);
    expect(g.body.demand["beras-medium"]).toBe(10);
    expect(new StateStore(dir).warung("pak.testnet")?.demand["beras-medium"]).toBe(10); // survives a restart
  });

  it("rejects a replayed nonce", async () => {
    const body = signed("pak.testnet", { "beras-medium": 5 });
    expect((await post(body)).status).toBe(200);
    const again = await post(body);
    expect(again.status).toBe(401);
    expect(again.body.error).toBe("nonce_reused");
  });

  it("rejects a key that is not full access (function-call or absent)", async () => {
    keys[`pak.testnet:${pk}`] = "fc";
    expect((await post(signed("pak.testnet", { "beras-medium": 5 }, 2))).body.error).toBe("not_full_access_key");
    keys[`pak.testnet:${pk}`] = null;
    expect((await post(signed("pak.testnet", { "beras-medium": 5 }, 3))).body.error).toBe("not_full_access_key");
  });

  it("rejects a signature from a different key and a wrong account", async () => {
    const mallory = KeyPair.fromRandom("ed25519");
    const forged = { ...signed("pak.testnet", { "beras-medium": 5 }, 4, mallory), public_key: pk };
    expect((await post(forged)).body.error).toBe("bad_signature");
    const wrongAccount = { ...signed("pak.testnet", { "beras-medium": 5 }, 5), account_id: "victim.testnet" };
    const r = await post(wrongAccount);
    expect(r.status).toBe(400);
    expect(r.body.error).toBe("bad_request");
  });

  it("rejects an unknown item id", async () => {
    const r = await post(signed("pak.testnet", { "emas-batangan": 3 }, 6));
    expect(r.status).toBe(400);
    expect(r.body.error).toBe("unknown_item");
  });

  it("all-zero demand unregisters", async () => {
    await post(signed("pak.testnet", { "beras-medium": 5 }, 7));
    const r = await post(signed("pak.testnet", { "beras-medium": 0 }, 8));
    expect(r.status).toBe(200);
    expect((await get("/warungs/pak.testnet")).status).toBe(404);
  });

  it("rate-limits POST per IP (10/min) but not another IP", async () => {
    for (let i = 0; i < 10; i += 1) await post({}, "9.9.9.9");
    const blocked = await post({}, "9.9.9.9");
    expect(blocked.status).toBe(429);
    expect((await post({}, "8.8.8.8")).status).toBe(400);
  });

  it("answers malformed bodies with bad_request", async () => {
    const r = await post("not an object");
    expect(r.status).toBe(400);
    expect(r.body).toMatchObject({ ok: false, error: "bad_request", detail: expect.any(String) });
  });
});

describe("CORS", () => {
  it("echoes only allowed origins", () => {
    const allowed = ["http://localhost:3000", "https://dash.app"];
    expect(corsHeaders("https://dash.app", allowed)["Access-Control-Allow-Origin"]).toBe("https://dash.app");
    expect(corsHeaders("https://evil.app", allowed)["Access-Control-Allow-Origin"]).toBeUndefined();
    expect(corsHeaders(undefined, allowed)["Access-Control-Allow-Origin"]).toBeUndefined();
  });
});
