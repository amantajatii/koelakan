import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { checkInvariant } from "../src/engine.js";
import { replay, snapshot, type ScenarioFile } from "../golden/replay.js";

const path = resolve(dirname(fileURLToPath(import.meta.url)), "../golden/scenarios.json");
const file = JSON.parse(readFileSync(path, "utf8")) as ScenarioFile;

describe("golden scenarios (shared with the Rust contract test)", () => {
  it("has at least 4 scenarios", () => {
    expect(file.scenarios.length).toBeGreaterThanOrEqual(4);
  });

  for (const sc of file.scenarios) {
    it(`replays ${sc.name}`, () => {
      expect(sc.expected).toBeDefined();
      const state = replay(sc);
      checkInvariant(state);
      expect(snapshot(sc, state)).toEqual(sc.expected);
    });
  }
});
