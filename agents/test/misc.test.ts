import { mkdtempSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { decodeStatus, parseEvents } from "../src/chain/actor.js";
import { fcKeyPath, generateKey, loadFcKey, loadFullAccessKey, parseCredential, saveFcKey, saveFullAccessKey } from "../src/chain/keys.js";
import { parseRoundArgs } from "../src/cli-args.js";
import { mapLimit, rupiah, toJson } from "../src/util.js";
import { assertRootCanFund } from "../src/setup.js";

describe("decodeStatus", () => {
  it("decodes a base64 JSON SuccessValue", () => {
    const b64 = Buffer.from("7").toString("base64");
    expect(decodeStatus({ SuccessValue: b64 })).toEqual({ ok: true, result: 7, error: null });
    expect(decodeStatus({ SuccessValue: "" }).result).toBeNull();
  });

  it("reports failures", () => {
    const r = decodeStatus({ Failure: { ActionError: "boom" } });
    expect(r.ok).toBe(false);
    expect(r.error).toContain("boom");
  });
});

describe("parseEvents", () => {
  it("extracts koelakan NEP-297 events and ignores other logs", () => {
    const logs = [
      "rejected: unsupported token",
      `EVENT_JSON:${JSON.stringify({ standard: "koelakan", event: "joined", data: [{ qty: 3 }] })}`,
      "EVENT_JSON:{not json",
    ];
    expect(parseEvents(logs)).toEqual([{ event: "joined", data: { qty: 3 } }]);
  });
});

describe("key storage", () => {
  it("round-trips a full-access key in the legacy near-cli format with mode 0600", async () => {
    const dir = mkdtempSync(join(tmpdir(), "keys-"));
    try {
      const key = generateKey();
      await saveFullAccessKey("a.testnet", key, dir);
      expect(statSync(join(dir, "a.testnet.json")).mode & 0o777).toBe(0o600);
      expect(await loadFullAccessKey("a.testnet", dir)).toEqual(key);
      expect(await loadFullAccessKey("missing.testnet", dir)).toBeNull();
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("stores function-call keys privately with their restriction", async () => {
    const dir = mkdtempSync(join(tmpdir(), "fck-"));
    try {
      const k = generateKey();
      await saveFcKey({
        account_id: "w.testnet", public_key: k.publicKey, private_key: k.privateKey, receiver_id: "market.testnet",
        method_names: ["join_round"], allowance_yocto: "1",
      }, dir);
      expect(statSync(fcKeyPath("w.testnet", dir)).mode & 0o777).toBe(0o600);
      expect((await loadFcKey("w.testnet", dir))?.method_names).toEqual(["join_round"]);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("parseCredential rejects files without an ed25519 key", () => {
    expect(() => parseCredential({ foo: 1 })).toThrow(/ed25519/);
  });
});

describe("parseRoundArgs", () => {
  it("applies defaults 90/60/60/60 for beras-medium", () => {
    expect(parseRoundArgs([])).toEqual({ item: "beras-medium", join: 90, commit: 60, reveal: 60, delivery: 60, minQty: 100 });
  });

  it("accepts overrides", () => {
    expect(parseRoundArgs(["--item", "gula-pasir", "--join", "120", "--delivery", "45"])).toMatchObject({ item: "gula-pasir", join: 120, delivery: 45 });
  });

  it("rejects durations outside the contract's 30 s .. 30 days", () => {
    expect(() => parseRoundArgs(["--join", "10"])).toThrow(/between 30/);
    expect(() => parseRoundArgs(["--commit", "abc"])).toThrow(/--commit/);
    expect(() => parseRoundArgs(["--reveal", String(31 * 24 * 3600)])).toThrow(/--reveal/);
  });
});

describe("setup guard", () => {
  const NEAR = 10n ** 24n;
  it("aborts when root would drop below 0.5 NEAR", () => {
    expect(() => assertRootCanFund(2n * NEAR, 25)).toThrow(/abort/);
  });

  it("allows creation when enough remains", () => {
    expect(() => assertRootCanFund(4n * NEAR, 25)).not.toThrow();
    expect(() => assertRootCanFund(NEAR / 10n, 0)).toThrow(/abort/);
  });
});

describe("util", () => {
  it("formats rupiah with commas", () => {
    expect(rupiah(16650n)).toBe("Rp16,650");
    expect(rupiah("2000000")).toBe("Rp2,000,000");
    expect(rupiah(0)).toBe("Rp0");
  });

  it("mapLimit keeps order and respects the concurrency limit", async () => {
    let active = 0;
    let peak = 0;
    const out = await mapLimit([1, 2, 3, 4, 5, 6], 2, async (n) => {
      active += 1;
      peak = Math.max(peak, active);
      await new Promise((r) => setTimeout(r, 5));
      active -= 1;
      return n * 2;
    });
    expect(out).toEqual([2, 4, 6, 8, 10, 12]);
    expect(peak).toBeLessThanOrEqual(2);
  });

  it("toJson renders bigint as strings", () => {
    expect(JSON.parse(toJson({ a: 5n }))).toEqual({ a: "5" });
  });
});
