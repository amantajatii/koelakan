/** A signing identity. Serialises its own transactions so nonces never clash. */
import { Account, KeyPairSigner, actions, type KeyPairString, type Provider } from "near-api-js";
import { EXPLORER_TX_URL, GAS } from "../config.js";
import { withRetry } from "./provider.js";
import type { ActionRecord, ChainEvent, Recorder } from "./recorder.js";

export type KeyKind = "full" | "function-call";

export interface CallOptions {
  readonly contract: string;
  readonly method: string;
  readonly args: object;
  readonly deposit?: bigint;
  readonly gas?: bigint;
  readonly key?: KeyKind;
  readonly role: string;
  readonly note?: string;
  /** The tx only counts as ok if the contract emitted this event (guards ft_transfer_call refunds). */
  readonly expectEvent?: string;
}

interface OutcomeLike {
  readonly status: unknown;
  readonly transaction: { readonly hash: string };
  readonly transaction_outcome: { readonly outcome: { readonly logs: string[] } };
  readonly receipts_outcome: ReadonlyArray<{ readonly outcome: { readonly logs: string[] } }>;
}

const EVENT_PREFIX = "EVENT_JSON:";
const TX_RETRY = { attempts: 4, baseMs: 1_000 } as const;
const RATE_LIMIT = /429|too many requests|rate limit|Exceeded \d+ providers/i;

export function parseEvents(logs: readonly string[]): ChainEvent[] {
  return logs
    .filter((l) => l.startsWith(EVENT_PREFIX))
    .flatMap((l) => {
      try {
        const j = JSON.parse(l.slice(EVENT_PREFIX.length)) as { event: string; data: unknown[] };
        return (j.data ?? []).map((data) => ({ event: j.event, data }));
      } catch {
        return [];
      }
    });
}

/** Decodes a `SuccessValue` (base64 JSON) or describes the failure. */
export function decodeStatus(status: unknown): { ok: boolean; result: unknown; error: string | null } {
  if (typeof status === "object" && status !== null && "SuccessValue" in status) {
    const b64 = (status as { SuccessValue: string }).SuccessValue;
    if (b64 === "") return { ok: true, result: null, error: null };
    const text = Buffer.from(b64, "base64").toString("utf8");
    try {
      return { ok: true, result: JSON.parse(text), error: null };
    } catch {
      return { ok: true, result: text, error: null };
    }
  }
  return { ok: false, result: null, error: typeof status === "string" ? status : JSON.stringify(status) };
}

const collectLogs = (o: OutcomeLike): string[] => [
  ...o.transaction_outcome.outcome.logs,
  ...o.receipts_outcome.flatMap((r) => r.outcome.logs),
];

export class Actor {
  private tail: Promise<unknown> = Promise.resolve();
  private readonly accounts: Record<KeyKind, Account | null>;

  constructor(
    readonly id: string,
    provider: Provider,
    private readonly recorder: Recorder,
    keys: { full?: KeyPairString; functionCall?: KeyPairString },
  ) {
    const mk = (k?: KeyPairString) => (k ? new Account(id, provider, KeyPairSigner.fromSecretKey(k)) : null);
    this.accounts = { full: mk(keys.full), "function-call": mk(keys.functionCall) };
  }

  /** Raw account handle for setup-only operations (create account, add key). Not serialised. */
  account(kind: KeyKind = "full"): Account {
    const a = this.accounts[kind];
    if (a === null) throw new Error(`${this.id}: no ${kind} key loaded`);
    return a;
  }

  /** Serialise any task on this actor's account (all keys share one queue). */
  enqueue<T>(task: () => Promise<T>): Promise<T> {
    const run = this.tail.then(task, task);
    this.tail = run.catch(() => undefined);
    return run;
  }

  /** Sends one function-call tx and records it. Never throws on contract failure: check `status`. */
  call(opts: CallOptions): Promise<ActionRecord> {
    return this.enqueue(() => this.send(opts));
  }

  private async send(opts: CallOptions): Promise<ActionRecord> {
    const kind = opts.key ?? "full";
    const base = {
      actor: this.id, role: opts.role, contract: opts.contract, method: opts.method, args: opts.args,
      deposit_yocto: (opts.deposit ?? 0n).toString(), key: kind, note: opts.note ?? null,
    } as const;
    const timestamp = new Date().toISOString();
    try {
      const out = await this.submit(opts, kind);
      const st = decodeStatus(out.status);
      const hash = out.transaction.hash;
      const events = parseEvents(collectLogs(out));
      const missing = st.ok && opts.expectEvent !== undefined && !events.some((e) => e.event === opts.expectEvent);
      return this.recorder.add({
        ...base, status: st.ok && !missing ? "ok" : "failed", tx_hash: hash, explorer_url: EXPLORER_TX_URL + hash,
        timestamp, result: st.result, events,
        error: missing ? `event '${opts.expectEvent}' not emitted: the contract refused or refunded the transfer` : st.error,
      });
    } catch (e) {
      return this.recorder.add({
        ...base, status: "failed", tx_hash: null, explorer_url: null, timestamp, result: null, events: [],
        error: e instanceof Error ? e.message : String(e),
      });
    }
  }

  private async submit(opts: CallOptions, kind: KeyKind): Promise<OutcomeLike> {
    const account = this.account(kind);
    const action = actions.functionCall(opts.method, opts.args, opts.gas ?? GAS.join, opts.deposit ?? 0n);
    // Retry only on rate limits (the tx was refused before inclusion), never on ambiguous errors.
    const out = await withRetry(
      () => account.signAndSendTransaction({ receiverId: opts.contract, actions: [action], throwOnFailure: false }),
      { ...TX_RETRY, isRetryable: (e) => RATE_LIMIT.test(e instanceof Error ? e.message : String(e)) },
    );
    return out as unknown as OutcomeLike;
  }
}
