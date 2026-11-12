/** Append-only record of every agent action (feeds out/round-<id>.json). */

export interface ChainEvent {
  readonly event: string;
  readonly data: unknown;
}

export type ActionStatus = "ok" | "failed" | "skipped";

export interface ActionRecord {
  readonly actor: string;
  readonly role: string;
  readonly contract: string;
  readonly method: string;
  readonly args: unknown;
  readonly deposit_yocto: string;
  readonly key: "full" | "function-call" | "none";
  readonly status: ActionStatus;
  readonly tx_hash: string | null;
  readonly explorer_url: string | null;
  readonly timestamp: string;
  readonly result: unknown;
  readonly events: readonly ChainEvent[];
  readonly error: string | null;
  readonly note: string | null;
}

export class Recorder {
  private readonly items: ActionRecord[] = [];

  constructor(private readonly onRecord: (r: ActionRecord) => void = () => undefined) {}

  add(record: ActionRecord): ActionRecord {
    this.items.push(record);
    this.onRecord(record);
    return record;
  }

  list(): readonly ActionRecord[] {
    return [...this.items];
  }
}

export function skipRecord(actor: string, role: string, method: string, reason: string, args: unknown = {}): ActionRecord {
  return {
    actor, role, contract: "", method, args, deposit_yocto: "0", key: "none", status: "skipped",
    tx_hash: null, explorer_url: null, timestamp: new Date().toISOString(), result: null,
    events: [], error: null, note: reason,
  };
}
