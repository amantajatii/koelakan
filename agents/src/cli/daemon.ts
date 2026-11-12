/** `pnpm daemon`: the 24/7 Koelakan service. */
import { loadConfig } from "../service/env.js";
import { runDaemon } from "../service/daemon.js";

async function main(): Promise<void> {
  await runDaemon(loadConfig());
}

main().catch((e: unknown) => {
  process.stderr.write(`${e instanceof Error ? (e.stack ?? e.message) : String(e)}\n`);
  process.exit(1);
});
