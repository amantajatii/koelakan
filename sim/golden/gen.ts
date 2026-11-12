/** `pnpm golden:gen`: recomputes `expected` for every scenario using the TS engine. */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { checkInvariant } from "../src/engine.js";
import { replay, snapshot, type ScenarioFile } from "./replay.js";

const path = resolve(dirname(fileURLToPath(import.meta.url)), "scenarios.json");
const file = JSON.parse(readFileSync(path, "utf8")) as ScenarioFile;

const scenarios = file.scenarios.map((sc) => {
  const state = replay(sc);
  checkInvariant(state);
  return { ...sc, expected: snapshot(sc, state) };
});

writeFileSync(path, JSON.stringify({ ...file, scenarios }, null, 2) + "\n");
console.log(`wrote expected for ${scenarios.length} scenarios to ${path}`);
