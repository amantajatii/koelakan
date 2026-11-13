/** Structured JSON logs (one line per action) plus a ring buffer of recent events for the API. */
export interface AgentEvent {
  readonly at: string;
  readonly kind: string;
  readonly round_id: number | null;
  readonly account: string | null;
  readonly message: string;
  readonly tx: string | null;
}

export type EventInput = Partial<Omit<AgentEvent, "at" | "kind" | "message">> & { readonly kind: string; readonly message: string };

const RING_SIZE = 200;
const RECENT_EVENTS = 50;

export class Events {
  private ring: readonly AgentEvent[] = [];

  constructor(
    private readonly write: (line: string) => void = (l) => process.stdout.write(`${l}\n`),
    private readonly now: () => Date = () => new Date(),
  ) {}

  emit(e: EventInput): AgentEvent {
    const full: AgentEvent = {
      at: this.now().toISOString(), kind: e.kind, round_id: e.round_id ?? null, account: e.account ?? null,
      message: e.message, tx: e.tx ?? null,
    };
    this.ring = [...this.ring, full].slice(-RING_SIZE);
    this.write(JSON.stringify(full));
    return full;
  }

  recent(n: number = RECENT_EVENTS): readonly AgentEvent[] {
    return this.ring.slice(-n);
  }
}
