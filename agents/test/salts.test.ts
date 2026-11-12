import { mkdtempSync, readFileSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { findSalt, persistSalt, readSalts, type SaltEntry } from "../src/salts.js";

let dir: string;
let file: string;
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "salts-"));
  file = join(dir, "state", "salts.json");
});
afterEach(() => rmSync(dir, { recursive: true, force: true }));

const entry = (over: Partial<SaltEntry> = {}): SaltEntry => ({
  market: "market.x", round_id: 1, seller: "grosir-1.x", price: "15000", salt: "ab".repeat(16),
  saved_at: "2026-11-12T00:00:00.000Z", ...over,
});

describe("salt store", () => {
  it("returns [] when the file does not exist", () => {
    expect(readSalts(file)).toEqual([]);
  });

  it("persists an entry and finds it by market, round and seller", () => {
    persistSalt(file, entry());
    expect(findSalt(file, "market.x", 1, "grosir-1.x")?.salt).toBe("ab".repeat(16));
    expect(findSalt(file, "market.x", 2, "grosir-1.x")).toBeNull();
    expect(findSalt(file, "other", 1, "grosir-1.x")).toBeNull();
  });

  it("keeps older entries when adding new ones", () => {
    persistSalt(file, entry());
    persistSalt(file, entry({ round_id: 2 }));
    expect(readSalts(file)).toHaveLength(2);
  });

  it("is idempotent for identical data but refuses to overwrite a different salt", () => {
    persistSalt(file, entry());
    persistSalt(file, entry());
    expect(readSalts(file)).toHaveLength(1);
    expect(() => persistSalt(file, entry({ salt: "cd".repeat(16) }))).toThrow(/refusing to overwrite/);
  });

  it("writes a private (0600) file and leaves no temp file behind", () => {
    persistSalt(file, entry());
    expect(statSync(file).mode & 0o777).toBe(0o600);
    expect(() => readFileSync(`${file}.tmp`)).toThrow();
  });
});
