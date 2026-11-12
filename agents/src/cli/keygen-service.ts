/** `pnpm keygen:service`: prints a fresh service keypair. The secret is shown once. */
import { generateKey } from "../chain/keys.js";

const key = generateKey();
process.stdout.write(`public key (safe to share; dashboards add it as an access key):\n  ${key.publicKey}\n\n`);
process.stdout.write(`secret key (shown ONCE, never commit it):\n  SERVICE_KEY=${key.privateKey}\n\n`);
process.stdout.write("Put the SERVICE_KEY line in agents/deploy/.env on the VPS (chmod 600), then redeploy.\n");
process.stdout.write("The public key is also served by GET /status as service_public_key.\n");
