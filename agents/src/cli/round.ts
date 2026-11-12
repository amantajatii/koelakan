/** `pnpm round`: run one full live round on testnet and print a readable timeline. */
import { parseRoundArgs } from "../cli-args.js";
import { crossCheck } from "../crosscheck.js";
import { clock, consoleLogger } from "../log.js";
import { buildReport, summarize, writeReport } from "../report.js";
import { runLiveRound } from "../round.js";
import { rupiah } from "../util.js";
import { buildWa } from "../wa.js";
import { createWorld } from "../world.js";

const log = consoleLogger;

async function main(): Promise<void> {
  const cli = parseRoundArgs(process.argv.slice(2));
  const world = await createWorld({
    root: process.env.KOELAKAN_ROOT, log,
    onRecord: (r) => {
      const who = r.actor.split(".")[0];
      const tag = r.status === "ok" ? "ok  " : r.status === "skipped" ? "skip" : "FAIL";
      const tail = r.status === "skipped" ? (r.note ?? "") : (r.explorer_url ?? r.error ?? "");
      log.info(`[${clock()}] ${tag} ${who} ${r.method} ${r.status === "failed" ? (r.error ?? "") + " " : ""}${tail}`);
    },
  });
  log.info(`Koelakan live round on ${world.dep.market} (item ${cli.item}; phases ${cli.join}/${cli.commit}/${cli.reveal}/${cli.delivery} s)`);
  const run = await runLiveRound(world, {
    item: cli.item, joinSecs: cli.join, commitSecs: cli.commit, revealSecs: cli.reveal,
    deliverySecs: cli.delivery, minTotalQty: cli.minQty,
  });
  const cross = crossCheck(run);
  const report = buildReport(world.dep, run, buildWa(run), cross);
  const path = await writeReport(report);
  printSummary(run.roundId, summarize(run), cross, path);
  if (cross.status !== "MATCH") process.exitCode = 2;
}

function printSummary(id: number, s: ReturnType<typeof summarize>, cross: ReturnType<typeof crossCheck>, path: string): void {
  log.info("");
  log.info(`=== round #${id}: ${s.state} ===`);
  log.info(`winner: ${s.winner ?? "none"}  clearing: ${s.clearing_price ? rupiah(s.clearing_price) : "-"}  ref (PIHPS): ${rupiah(s.ref_price)}`);
  log.info(`participants: ${s.participants}  total qty: ${s.total_qty}  saving vs PIHPS: ${s.saving_vs_pihps ? rupiah(s.saving_vs_pihps) : "-"}`);
  log.info(`forfeited bond: ${rupiah(s.forfeited_bond)} (${s.forfeited_sellers.join(", ") || "none"})  silent warung: ${s.silent_warung ?? "-"}`);
  log.info(`cross-check vs sim engine: ${cross.status} (${cross.checks.length - cross.mismatches.length}/${cross.checks.length} checks)`);
  if (cross.error !== null) log.warn(`  error: ${cross.error}`);
  for (const m of cross.mismatches) log.warn(`  MISMATCH ${m.name}: chain=${m.chain} sim=${m.sim}`);
  log.info(`report: ${path}`);
}

main().catch((e: unknown) => {
  log.warn(e instanceof Error ? (e.stack ?? e.message) : String(e));
  process.exit(1);
});
