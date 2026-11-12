/** `pnpm grosir`: run your own wholesaler bidding agent against the Koelakan market. */
import { runExternalGrosir } from "../service/external-grosir.js";

runExternalGrosir().catch((e: unknown) => {
  process.stderr.write(`${e instanceof Error ? e.message : String(e)}\n`);
  process.exit(1);
});
