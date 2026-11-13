import { derivePhase } from "@/lib/phase";
import { isSettled, savingOf, savingPercent } from "@/lib/stats";
import type { RoundView } from "@/lib/types";

export interface SavingsPoint {
  roundId: number;
  itemId: string;
  /** Share below the PIHPS price (0-100). */
  percent: number;
  saving: bigint;
}

export const CHART_ROUNDS = 12;

/** Settled rounds in id order, newest last, trimmed to the most recent `limit`. */
export function savingsSeries(rounds: readonly RoundView[], limit: number = CHART_ROUNDS): SavingsPoint[] {
  return rounds
    .filter((r) => isSettled(r) && r.clearing_price !== null)
    .sort((a, b) => a.id - b.id)
    .slice(-limit)
    .map((r) => ({ roundId: r.id, itemId: r.item, percent: savingPercent(r), saving: savingOf(r) }));
}

export type StatusBucket = "live" | "waiting" | "closed" | "failed";

export interface BucketSummary {
  bucket: StatusBucket;
  count: number;
  /** Highest round id in the bucket; null when empty. */
  latest: RoundView | null;
}

const BUCKET_ORDER: readonly StatusBucket[] = ["live", "waiting", "closed", "failed"];

function bucketOf(round: RoundView, nowMs: number): StatusBucket {
  const phase = derivePhase(round, nowMs);
  if (phase === "Join" || phase === "Commit" || phase === "Reveal") return "live";
  if (phase === "Closed") return "closed";
  if (phase === "Failed") return "failed";
  return "waiting";
}

/** Counts rounds by what they are waiting for, with the newest round of each kind. */
export function bucketRounds(rounds: readonly RoundView[], nowMs: number): BucketSummary[] {
  return BUCKET_ORDER.map((bucket) => {
    const members = rounds.filter((r) => bucketOf(r, nowMs) === bucket);
    const latest = members.reduce<RoundView | null>((best, r) => (best === null || r.id > best.id ? r : best), null);
    return { bucket, count: members.length, latest };
  });
}
