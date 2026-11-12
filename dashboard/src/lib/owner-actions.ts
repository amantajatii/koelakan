import { nsToMs } from "./json";
import { derivePhase } from "./phase";
import { forfeitedBond, isSettled, proRataShares } from "./stats";
import { ONE_YOCTO, GAS, config } from "./config";
import type { FunctionCallSpec } from "./tx";
import type { Participant, RoundView } from "./types";

export interface PendingAction {
  round: RoundView;
  participant: Participant;
  /** Escrowed payment waiting for the owner's decision. */
  amount: bigint;
  /** Epoch ms when silence turns into acceptance. */
  deadlineMs: number;
}

/**
 * Rounds where `account` can still confirm or dispute: settled, inside the delivery window,
 * and that owner's delivery is still Pending (contract: `confirm_delivery` / `dispute`, RULES §6).
 */
export function pendingActions(rounds: readonly RoundView[], account: string, nowMs: number): PendingAction[] {
  const out: PendingAction[] = [];
  for (const round of rounds) {
    if (round.state !== "Settled" || derivePhase(round, nowMs) !== "Delivery") continue;
    const participant = round.participants.find((p) => p.account_id === account);
    if (!participant || participant.delivery !== "Pending") continue;
    out.push({ round, participant, amount: BigInt(participant.held), deadlineMs: nsToMs(round.delivery_deadline) });
  }
  return out.sort((a, b) => a.deadlineMs - b.deadlineMs);
}

export const confirmDeliveryCall = (roundId: number): FunctionCallSpec => ({
  receiverId: config.marketId,
  methodName: "confirm_delivery",
  args: { round_id: roundId },
  gas: GAS.light,
  deposit: ONE_YOCTO,
});

export const disputeCall = (roundId: number): FunctionCallSpec => ({
  receiverId: config.marketId,
  methodName: "dispute",
  args: { round_id: roundId },
  gas: GAS.light,
  deposit: ONE_YOCTO,
});

export const withdrawCall = (amount: bigint): FunctionCallSpec => ({
  receiverId: config.marketId,
  methodName: "withdraw",
  args: { amount: amount.toString() },
  gas: GAS.light,
  deposit: ONE_YOCTO,
});

export type ParticipationTone = "good" | "bad" | "warn" | "info" | "neutral";

export interface Participation {
  round: RoundView;
  qty: number;
  outcome: string;
  tone: ParticipationTone;
  /** Paid to the grosir for goods (zero if refunded). */
  paid: bigint;
  /** Returned to the owner: price gap, refunds and any forfeited-bond share. */
  refund: bigint;
}

function outcomeFor(round: RoundView, p: Participant, nowMs: number): Pick<Participation, "outcome" | "tone"> {
  if (round.state === "Failed") return { outcome: "Failed, fully refunded", tone: "bad" };
  if (round.state === "Active") return { outcome: "Round in progress", tone: "info" };
  if (p.delivery === "Pending") {
    return derivePhase(round, nowMs) === "Delivery"
      ? { outcome: "Awaiting your confirmation", tone: "warn" }
      : { outcome: "Counts as received", tone: "neutral" };
  }
  if (p.delivery === "Disputed") return { outcome: "Dispute open", tone: "warn" };
  if (p.delivery === "DefaultRefunded") return { outcome: "Dispute timed out, refunded", tone: "neutral" };
  if (typeof p.delivery === "object") {
    return p.delivery.Resolved.refunded ? { outcome: "Dispute ruled: refunded", tone: "good" } : { outcome: "Dispute ruled: paid to grosir", tone: "neutral" };
  }
  return { outcome: p.delivery === "Confirmed" ? "Received and confirmed" : "Counts as received", tone: "good" };
}

/** Every round `account` took part in, newest first, with what it paid and got back. */
export function myParticipations(rounds: readonly RoundView[], account: string, nowMs: number): Participation[] {
  const out: Participation[] = [];
  for (const round of rounds) {
    const p = round.participants.find((x) => x.account_id === account);
    if (!p) continue;
    const qty = BigInt(p.qty);
    const locked = BigInt(round.ceiling_price) * qty;
    const base = outcomeFor(round, p, nowMs);
    if (round.state === "Failed") {
      out.push({ round, qty: p.qty, ...base, paid: 0n, refund: locked });
      continue;
    }
    if (!isSettled(round) || round.clearing_price === null) {
      out.push({ round, qty: p.qty, ...base, paid: 0n, refund: 0n });
      continue;
    }
    const clearing = BigInt(round.clearing_price);
    const gap = (BigInt(round.ceiling_price) - clearing) * qty;
    const shares = proRataShares(forfeitedBond(round), round.participants.map((x) => BigInt(x.qty)));
    const bondShare = shares[round.participants.indexOf(p)] ?? 0n;
    const refundedPayment =
      p.delivery === "DefaultRefunded" || (typeof p.delivery === "object" && p.delivery.Resolved.refunded);
    const payment = clearing * qty;
    out.push({
      round,
      qty: p.qty,
      ...base,
      paid: refundedPayment ? 0n : payment,
      refund: gap + bondShare + (refundedPayment ? payment : 0n),
    });
  }
  return out.sort((a, b) => b.round.id - a.round.id);
}
