/** CLI: `pnpm simulate [--json]`. The only place that prints. */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { RoundReport, RunReport } from "./report.js";
import { runSimulation } from "./runner.js";

const fmt = (n: bigint | null): string => (n === null ? "-" : n.toLocaleString("en-US"));

function printRound(r: RoundReport): void {
  console.log(`\n=== Round ${r.round}: ${r.item} (PIHPS ref Rp${fmt(r.refPrice)}, ceiling Rp${fmt(r.ceilingPrice)}) ===`);
  console.log(`participants: ${r.participants}  total_qty: ${fmt(r.totalQty)} kg  state: ${r.state}`);
  for (const j of r.rejectedJoins) console.log(`  rejected join ${j.account}: ${j.reason}`);
  for (const b of r.bids) {
    const price = b.revealedPrice === null ? "NOT REVEALED" : `Rp${fmt(b.revealedPrice)}${b.valid ? "" : " (invalid)"}`;
    console.log(`  bid ${b.seller}: ${price}  bond ${fmt(b.bond)}`);
  }
  console.log(`winner: ${r.winner ?? "-"}  clearing price: ${fmt(r.clearingPrice)}`);
  console.log(`saving vs PIHPS ref: Rp${fmt(r.saving)}`);
  if (r.forfeited > 0n) {
    const top = r.forfeitShares.slice(0, 3).map((s) => `${s.account}=${fmt(s.amount)}`).join(", ");
    console.log(`forfeited bonds: ${fmt(r.forfeited)} split pro rata to ${r.forfeitShares.length} buyers (${top}, ...)`);
  }
  for (const d of r.disputes) console.log(`dispute: ${d.account} -> arbiter ${d.refunded ? "refunded buyer + bond share" : "paid seller"}`);
}

function printSummary(run: RunReport): void {
  const total = run.rounds.reduce((a, r) => a + (r.saving ?? 0n), 0n);
  console.log(`\nTotal saving vs PIHPS across ${run.rounds.length} rounds: Rp${fmt(total)}`);
  console.log(`Conservation: tIDR in ${fmt(run.totalIn)}  out ${fmt(run.totalOut)}  -> ${run.conserved ? "OK" : "FAILED"}`);
  console.log("(Grosir costs and margins are ASSUMPTIONS; reference prices are real PIHPS data.)");
}

function main(): void {
  const run = runSimulation();
  console.log(`Koelakan simulation, seed ${run.seed}`);
  run.rounds.forEach(printRound);
  printSummary(run);
  if (process.argv.includes("--json")) {
    const out = resolve(dirname(fileURLToPath(import.meta.url)), "../out/run.json");
    mkdirSync(dirname(out), { recursive: true });
    writeFileSync(out, JSON.stringify(run, (_k, v) => (typeof v === "bigint" ? v.toString() : v), 2) + "\n");
    console.log(`wrote ${out}`);
  }
  if (!run.conserved) process.exit(1);
}

main();
