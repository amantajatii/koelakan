/** `pnpm setup`: create and fund the agent accounts on testnet (idempotent). */
import { consoleLogger } from "../log.js";
import { runSetup } from "../setup.js";
import { formatNear } from "../util.js";

async function main(): Promise<void> {
  const s = await runSetup({ root: process.env.KOELAKAN_ROOT, log: consoleLogger });
  consoleLogger.info("");
  consoleLogger.info(`created: ${s.created.length} (${s.created.join(", ") || "none"})`);
  consoleLogger.info(`already existed: ${s.existing.length}`);
  consoleLogger.info(`root balance: ${formatNear(s.rootBefore)} -> ${formatNear(s.rootAfter)}`);
}

main().catch((e: unknown) => {
  consoleLogger.warn(e instanceof Error ? e.message : String(e));
  process.exit(1);
});
