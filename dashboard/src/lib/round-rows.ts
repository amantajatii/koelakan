import type { WarungAction } from "./agent-types";
import type { Participation, ParticipationTone } from "./owner-actions";
import type { RoundView } from "./types";

export interface OwnerRoundRow {
  roundId: number;
  itemId: string | null;
  qty: number | null;
  outcome: string;
  tone: ParticipationTone;
  /** Null for rounds the agent skipped: nothing was paid or refunded. */
  paid: bigint | null;
  refund: bigint | null;
  /** Why the agent skipped this round; null for joined rounds. */
  reason: string | null;
  /** Transaction of the agent's join, when the service log has it. */
  tx: string | null;
}

const SKIPPED_FALLBACK = "Skipped by your agent";

/**
 * One list for "your rounds": every round the owner joined (from the chain), plus rounds the agent
 * skipped (from the service log) that are not already covered. Newest first.
 */
export function buildOwnerRoundRows(
  participations: readonly Participation[],
  actions: readonly WarungAction[] | null,
  rounds: readonly RoundView[],
): OwnerRoundRow[] {
  const rows: OwnerRoundRow[] = participations.map((p) => ({
    roundId: p.round.id,
    itemId: p.round.item,
    qty: p.qty,
    outcome: p.outcome,
    tone: p.tone,
    paid: p.paid,
    refund: p.refund,
    reason: null,
    tx: actions?.find((a) => a.round_id === p.round.id && a.action === "joined")?.tx ?? null,
  }));
  const seen = new Set(rows.map((r) => r.roundId));
  for (const a of actions ?? []) {
    if (a.action !== "skipped" || seen.has(a.round_id)) continue;
    seen.add(a.round_id);
    rows.push({
      roundId: a.round_id,
      itemId: rounds.find((r) => r.id === a.round_id)?.item ?? null,
      qty: null,
      outcome: "Skipped",
      tone: "neutral",
      paid: null,
      refund: null,
      reason: a.reason?.trim() || SKIPPED_FALLBACK,
      tx: null,
    });
  }
  return rows.sort((a, b) => b.roundId - a.roundId);
}
