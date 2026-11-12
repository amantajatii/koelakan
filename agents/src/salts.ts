/** Durable salt store. A salt must hit disk (fsync) BEFORE the commit tx is sent. */
import { closeSync, fsyncSync, mkdirSync, openSync, readFileSync, renameSync, writeSync } from "node:fs";
import { dirname } from "node:path";

export interface SaltEntry {
  readonly market: string;
  readonly round_id: number;
  readonly seller: string;
  readonly price: string;
  readonly salt: string;
  readonly saved_at: string;
}

interface SaltFile {
  readonly entries: readonly SaltEntry[];
}

export function readSalts(path: string): SaltEntry[] {
  try {
    return [...(JSON.parse(readFileSync(path, "utf8")) as SaltFile).entries];
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw e;
  }
}

function fsyncPath(path: string): void {
  const fd = openSync(path, "r");
  try {
    fsyncSync(fd);
  } finally {
    closeSync(fd);
  }
}

/** Atomic write: temp file + fsync + rename + fsync of the directory. Synchronous on purpose. */
export function persistSalt(path: string, entry: SaltEntry): void {
  const dir = dirname(path);
  mkdirSync(dir, { recursive: true, mode: 0o700 });
  const existing = readSalts(path);
  const prior = existing.find((e) => e.market === entry.market && e.round_id === entry.round_id && e.seller === entry.seller);
  if (prior !== undefined) {
    if (prior.salt === entry.salt && prior.price === entry.price) return; // idempotent
    throw new Error(`refusing to overwrite saved salt for ${entry.seller} round ${entry.round_id}`);
  }
  const next: SaltFile = { entries: [...existing, entry] };
  const tmp = `${path}.tmp`;
  const fd = openSync(tmp, "w", 0o600);
  try {
    writeSync(fd, JSON.stringify(next, null, 2));
    fsyncSync(fd);
  } finally {
    closeSync(fd);
  }
  renameSync(tmp, path);
  fsyncPath(dir);
}

export function findSalt(path: string, market: string, roundId: number, seller: string): SaltEntry | null {
  return readSalts(path).find((e) => e.market === market && e.round_id === roundId && e.seller === seller) ?? null;
}
