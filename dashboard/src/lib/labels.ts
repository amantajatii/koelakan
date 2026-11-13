import type { Bid, Delivery, RoundView } from "./types";

/** Visual weight of a status label; the Chip component maps each tone to colours. */
export type Tone = "neutral" | "good" | "bad" | "warn" | "info";

export function deliveryLabel(d: Delivery): { text: string; tone: Tone } {
  if (typeof d === "object") {
    return d.Resolved.refunded
      ? { text: "Disputed: refunded", tone: "warn" }
      : { text: "Disputed: paid to grosir", tone: "neutral" };
  }
  switch (d) {
    case "Pending": return { text: "Waiting", tone: "neutral" };
    case "Confirmed": return { text: "Confirmed", tone: "good" };
    case "Accepted": return { text: "Auto-accepted", tone: "info" };
    case "Disputed": return { text: "Disputed", tone: "bad" };
    case "DefaultRefunded": return { text: "Refunded (arbiter timed out)", tone: "warn" };
  }
}

export type BidStatus = "winner" | "valid" | "invalid" | "forfeited" | "sealed";

/** Where a bid stands: sealed until revealed, forfeited if it never revealed once the round is over. */
export function bidStatus(round: RoundView, bid: Bid, index: number): BidStatus {
  if (bid.revealed_price === null) return round.state === "Active" ? "sealed" : "forfeited";
  if (!bid.valid) return "invalid";
  return round.winner === index ? "winner" : "valid";
}

export const BID_LABEL: Record<BidStatus, { text: string; tone: Tone }> = {
  winner: { text: "Won", tone: "good" },
  valid: { text: "Valid, lost", tone: "neutral" },
  invalid: { text: "Invalid", tone: "bad" },
  forfeited: { text: "Not revealed, bond forfeited", tone: "bad" },
  sealed: { text: "Sealed", tone: "info" },
};
