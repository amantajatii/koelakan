/** Persisted local state: delegated-warung registry, used NEP-413 nonces, scheduler memory. */
import { join } from "node:path";
import { atomicWriteJson, readJsonFile } from "./store.js";

export interface WarungAction {
  readonly at: string;
  readonly round_id: number;
  readonly action: "joined" | "skipped";
  readonly qty: number | null;
  readonly reason: string | null;
  readonly tx: string | null;
}

export interface WarungRecord {
  readonly account_id: string;
  readonly demand: Readonly<Record<string, number>>;
  readonly registered_at: string;
  readonly updated_at: string;
  readonly last_actions: readonly WarungAction[];
}

export interface SchedulerState {
  /** First round id that may still be active; everything below is terminal. */
  readonly scan_from: number;
  readonly last_open_at_ms: number | null;
  readonly rotation: number;
  /** "<kind>:<round>:<account>" -> attempts so far. */
  readonly attempts: Readonly<Record<string, number>>;
  /** account -> ms of the last faucet attempt (cooldown guard). */
  readonly faucet_at: Readonly<Record<string, number>>;
}

const MAX_LAST_ACTIONS = 20;
export const NONCE_TTL_MS = 60 * 60 * 1000;

export const EMPTY_SCHEDULER: SchedulerState = { scan_from: 0, last_open_at_ms: null, rotation: 0, attempts: {}, faucet_at: {} };

export class StateStore {
  private warungs: Readonly<Record<string, WarungRecord>>;
  private nonces: Readonly<Record<string, number>>;
  private sched: SchedulerState;

  constructor(readonly dir: string) {
    this.warungs = readJsonFile<{ warungs: Record<string, WarungRecord> }>(this.path("registry.json"), { warungs: {} }).warungs;
    this.nonces = readJsonFile<{ nonces: Record<string, number> }>(this.path("nonces.json"), { nonces: {} }).nonces;
    this.sched = { ...EMPTY_SCHEDULER, ...readJsonFile<Partial<SchedulerState>>(this.path("scheduler.json"), {}) };
  }

  private path(name: string): string {
    return join(this.dir, name);
  }

  get saltsFile(): string {
    return this.path("salts.json");
  }

  // Registry
  warung(account: string): WarungRecord | null {
    return this.warungs[account] ?? null;
  }

  allWarungs(): readonly WarungRecord[] {
    return Object.values(this.warungs);
  }

  /** Register or update; the demand map is replaced, history and registered_at are kept. */
  upsertWarung(account: string, demand: Readonly<Record<string, number>>, nowIso: string): WarungRecord {
    const prior = this.warungs[account];
    const next: WarungRecord = {
      account_id: account, demand, registered_at: prior?.registered_at ?? nowIso, updated_at: nowIso,
      last_actions: prior?.last_actions ?? [],
    };
    this.saveWarungs({ ...this.warungs, [account]: next });
    return next;
  }

  removeWarung(account: string): void {
    const { [account]: _gone, ...rest } = this.warungs;
    this.saveWarungs(rest);
  }

  recordAction(account: string, action: WarungAction): void {
    const prior = this.warungs[account];
    if (prior === undefined) return;
    const last = [...prior.last_actions, action].slice(-MAX_LAST_ACTIONS);
    this.saveWarungs({ ...this.warungs, [account]: { ...prior, last_actions: last } });
  }

  private saveWarungs(next: Readonly<Record<string, WarungRecord>>): void {
    this.warungs = next;
    atomicWriteJson(this.path("registry.json"), { warungs: next });
  }

  // NEP-413 nonces
  hasNonce(nonce: string): boolean {
    return this.nonces[nonce] !== undefined;
  }

  addNonce(nonce: string, nowMs: number): void {
    const live = Object.entries(this.nonces).filter(([, t]) => nowMs - t < NONCE_TTL_MS);
    this.nonces = { ...Object.fromEntries(live), [nonce]: nowMs };
    atomicWriteJson(this.path("nonces.json"), { nonces: this.nonces });
  }

  // Scheduler
  scheduler(): SchedulerState {
    return this.sched;
  }

  patchScheduler(patch: Partial<SchedulerState>): void {
    this.sched = { ...this.sched, ...patch };
    atomicWriteJson(this.path("scheduler.json"), this.sched);
  }

  attempts(key: string): number {
    return this.sched.attempts[key] ?? 0;
  }

  /** Counts one attempt BEFORE the tx is sent, so a crash mid-send is never retried blindly. */
  bumpAttempt(key: string): number {
    const n = this.attempts(key) + 1;
    this.patchScheduler({ attempts: { ...this.sched.attempts, [key]: n } });
    return n;
  }

  /** Drops attempt counters of rounds that are behind the scan window. */
  pruneAttempts(scanFrom: number): void {
    const keep = Object.entries(this.sched.attempts).filter(([k]) => Number(k.split(":")[1]) >= scanFrom);
    if (keep.length !== Object.keys(this.sched.attempts).length) this.patchScheduler({ attempts: Object.fromEntries(keep) });
  }
}
