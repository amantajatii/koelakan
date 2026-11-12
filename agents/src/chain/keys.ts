/** Key storage: full-access keys (near-cli legacy format) and function-call keys (agents/.keys). */
import { chmod, mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { KeyPair, type KeyPairString } from "near-api-js";
import { CREDENTIALS_DIR, KEYS_DIR } from "../config.js";

export interface StoredKey {
  readonly publicKey: string;
  readonly privateKey: KeyPairString;
}

/** Accepts the legacy near-cli credential JSON (`private_key` or `secret_key`). */
export function parseCredential(raw: unknown): StoredKey {
  const o = raw as { public_key?: unknown; private_key?: unknown; secret_key?: unknown } | null;
  const priv = o?.private_key ?? o?.secret_key;
  if (typeof priv !== "string" || !priv.startsWith("ed25519:")) {
    throw new Error("credential file has no ed25519 private_key");
  }
  const kp = KeyPair.fromString(priv as KeyPairString);
  return { publicKey: kp.getPublicKey().toString(), privateKey: priv as KeyPairString };
}

async function readJson(path: string): Promise<unknown | null> {
  try {
    return JSON.parse(await readFile(path, "utf8"));
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw e;
  }
}

/** Loads a full-access key: `<dir>/<account>.json`, else the first file in `<dir>/<account>/`. */
export async function loadFullAccessKey(account: string, dir: string = CREDENTIALS_DIR): Promise<StoredKey | null> {
  const flat = await readJson(join(dir, `${account}.json`));
  if (flat !== null) return parseCredential(flat);
  try {
    const files = (await readdir(join(dir, account))).filter((f) => f.endsWith(".json"));
    const first = files[0];
    if (first === undefined) return null;
    return parseCredential(await readJson(join(dir, account, first)));
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw e;
  }
}

export function generateKey(): StoredKey {
  const kp = KeyPair.fromRandom("ed25519");
  return { publicKey: kp.getPublicKey().toString(), privateKey: kp.toString() as KeyPairString };
}

async function writeSecret(path: string, body: unknown): Promise<void> {
  await mkdir(join(path, ".."), { recursive: true, mode: 0o700 });
  await writeFile(path, JSON.stringify(body, null, 2), { mode: 0o600 });
  await chmod(path, 0o600);
}

/** Saves a full-access key in the legacy near-cli format. */
export async function saveFullAccessKey(account: string, key: StoredKey, dir: string = CREDENTIALS_DIR): Promise<void> {
  await writeSecret(join(dir, `${account}.json`), {
    account_id: account,
    public_key: key.publicKey,
    private_key: key.privateKey,
  });
}

export interface FcKeyFile {
  readonly account_id: string;
  readonly public_key: string;
  readonly private_key: KeyPairString;
  readonly receiver_id: string;
  readonly method_names: readonly string[];
  readonly allowance_yocto: string;
}

export const fcKeyPath = (account: string, dir: string = KEYS_DIR): string => join(dir, `${account}.fck.json`);

export async function loadFcKey(account: string, dir: string = KEYS_DIR): Promise<FcKeyFile | null> {
  return (await readJson(fcKeyPath(account, dir))) as FcKeyFile | null;
}

export async function saveFcKey(file: FcKeyFile, dir: string = KEYS_DIR): Promise<void> {
  await writeSecret(fcKeyPath(file.account_id, dir), file);
}
