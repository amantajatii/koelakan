/** Parsing and validation of `pnpm round` flags. */
import { parseArgs } from "node:util";
import { DEFAULT_PHASES, MAX_PHASE_SECS, MIN_PHASE_SECS } from "./config.js";

export interface RoundCli {
  readonly item: string;
  readonly join: number;
  readonly commit: number;
  readonly reveal: number;
  readonly delivery: number;
  readonly minQty: number;
}

const DEFAULT_ITEM = "beras-medium";
const DEFAULT_MIN_QTY = 100;

function secs(name: string, raw: string | undefined, fallback: number): number {
  if (raw === undefined) return fallback;
  const n = Number(raw);
  if (!Number.isInteger(n) || n < MIN_PHASE_SECS || n > MAX_PHASE_SECS) {
    throw new Error(`--${name} must be an integer between ${MIN_PHASE_SECS} and ${MAX_PHASE_SECS} seconds (got '${raw}')`);
  }
  return n;
}

export function parseRoundArgs(argv: readonly string[]): RoundCli {
  const { values } = parseArgs({
    args: [...argv],
    options: {
      item: { type: "string" }, join: { type: "string" }, commit: { type: "string" },
      reveal: { type: "string" }, delivery: { type: "string" }, "min-qty": { type: "string" },
    },
    allowPositionals: false,
  });
  const minQty = values["min-qty"] === undefined ? DEFAULT_MIN_QTY : Number(values["min-qty"]);
  if (!Number.isInteger(minQty) || minQty < 1) throw new Error("--min-qty must be an integer >= 1");
  return {
    item: values.item ?? DEFAULT_ITEM,
    join: secs("join", values.join, DEFAULT_PHASES.join),
    commit: secs("commit", values.commit, DEFAULT_PHASES.commit),
    reveal: secs("reveal", values.reveal, DEFAULT_PHASES.reveal),
    delivery: secs("delivery", values.delivery, DEFAULT_PHASES.delivery),
    minQty,
  };
}
