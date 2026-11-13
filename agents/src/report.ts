/** Builds and writes agents/out/round-<id>.json (documented in agents/README.md). */
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { NETWORK, OUT_DIR, type Deployment } from "./config.js";
import type { CrossCheck } from "./crosscheck.js";
import type { ActionRecord } from "./chain/recorder.js";
import type { RoundView } from "./chain/views.js";
import type { BalanceSnapshot, RoundParams, RoundRun } from "./round.js";
import { toJson } from "./util.js";
import type { WaMessage } from "./wa.js";

const SCHEMA_VERSION = 1;

export interface Summary {
  readonly state: string;
  readonly winner: string | null;
  readonly clearing_price: string | null;
  readonly ceiling_price: string;
  readonly ref_price: string;
  readonly total_qty: number;
  readonly participants: number;
  readonly saving_vs_pihps: string | null;
  readonly forfeited_bond: string;
  readonly forfeited_sellers: readonly string[];
  readonly silent_warung: string | null;
}

export function summarize(run: RoundRun): Summary {
  const r = run.roundAfter;
  const lost = r.bids.filter((b) => b.revealed_price === null);
  return {
    state: r.state,
    winner: r.winner === null ? null : (r.bids[r.winner]?.seller_id ?? null),
    clearing_price: r.clearing_price,
    ceiling_price: r.ceiling_price,
    ref_price: r.ref_price,
    total_qty: r.total_qty,
    participants: r.participants.length,
    saving_vs_pihps: r.saving,
    forfeited_bond: lost.reduce((a, b) => a + BigInt(b.bond), 0n).toString(),
    forfeited_sellers: lost.map((b) => b.seller_id),
    silent_warung: run.silentWarung,
  };
}

export interface RoundReportJson {
  readonly schema_version: number;
  readonly network: string;
  readonly contracts: { readonly market: string; readonly tidr: string; readonly koordinator: string; readonly arbiter: string };
  readonly round_id: RoundRun["roundId"];
  readonly item: RoundRun["item"];
  readonly params: RoundParams;
  readonly started_at: RoundRun["startedAt"];
  readonly finished_at: RoundRun["finishedAt"];
  readonly summary: Summary;
  readonly round_before: RoundView;
  readonly round_after: RoundView;
  readonly balances_before: BalanceSnapshot;
  readonly balances_after: BalanceSnapshot;
  readonly actions: readonly ActionRecord[];
  readonly wa: readonly WaMessage[];
  readonly crosscheck: CrossCheck;
}

export function buildReport(dep: Deployment, run: RoundRun, wa: readonly WaMessage[], cross: CrossCheck): RoundReportJson {
  return {
    schema_version: SCHEMA_VERSION,
    network: NETWORK,
    contracts: { market: dep.market, tidr: dep.tidr, koordinator: dep.koordinator, arbiter: dep.arbiter },
    round_id: run.roundId,
    item: run.item,
    params: run.params,
    started_at: run.startedAt,
    finished_at: run.finishedAt,
    summary: summarize(run),
    round_before: run.roundBefore,
    round_after: run.roundAfter,
    balances_before: run.balancesBefore,
    balances_after: run.balancesAfter,
    actions: run.actions,
    wa,
    crosscheck: cross,
  };
}

export async function writeReport(report: RoundReportJson, dir: string = OUT_DIR): Promise<string> {
  await mkdir(dir, { recursive: true });
  const path = join(dir, `round-${report.round_id}.json`);
  await writeFile(path, toJson(report), "utf8");
  return path;
}
