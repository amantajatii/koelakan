/** `pnpm pack:secrets`: copies exactly the key files the daemon needs (never the root key) for scp to the VPS. */
import { chmod, copyFile, mkdir, readdir, rm } from "node:fs/promises";
import { join } from "node:path";
import { AGENTS_DIR, fullId, grosirShortIds, warungShortIds, deployment } from "../config.js";
import { loadConfig } from "../service/env.js";

const OUT = join(AGENTS_DIR, "deploy", "secrets");

async function copyKey(src: string, dst: string): Promise<boolean> {
  try {
    await copyFile(src, dst);
    await chmod(dst, 0o600);
    return true;
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === "ENOENT") return false;
    throw e;
  }
}

async function main(): Promise<void> {
  const cfg = loadConfig();
  const root = cfg.dep.root;
  await rm(join(OUT, "keys"), { recursive: true, force: true }); // keeps service-key.env, if any
  await rm(join(OUT, "fck"), { recursive: true, force: true });
  await mkdir(join(OUT, "keys"), { recursive: true, mode: 0o700 });
  await mkdir(join(OUT, "fck"), { recursive: true, mode: 0o700 });
  const full = [deployment(root).koordinator, ...grosirShortIds().map((s) => fullId(s, root)), ...warungShortIds().map((s) => fullId(s, root))];
  const missing: string[] = [];
  for (const id of full) {
    if (!(await copyKey(join(cfg.credentialsDir, `${id}.json`), join(OUT, "keys", `${id}.json`)))) missing.push(`${id}.json`);
  }
  for (const s of warungShortIds()) {
    const f = `${fullId(s, root)}.fck.json`;
    if (!(await copyKey(join(cfg.fckDir, f), join(OUT, "fck", f)))) missing.push(f);
  }
  const files = [...(await readdir(join(OUT, "keys"))), ...(await readdir(join(OUT, "fck")))];
  process.stdout.write(`packed ${files.length} key files into ${OUT}\n`);
  if (files.some((f) => f.startsWith(`${root}.`) || f === `${root}.json`)) throw new Error("root key must never be packed");
  if (missing.length > 0) process.stdout.write(`missing (daemon will report them in /status): ${missing.join(", ")}\n`);
}

main().catch((e: unknown) => {
  process.stderr.write(`${e instanceof Error ? e.message : String(e)}\n`);
  process.exit(1);
});
