import type { Tone } from "@/components/ui/stamp";
import type { Bid, Delivery, RoundView } from "./types";

export function deliveryLabel(d: Delivery): { text: string; tone: Tone } {
  if (typeof d === "object") {
    return d.Resolved.refunded
      ? { text: "Sengketa: dana kembali", tone: "warn" }
      : { text: "Sengketa: dibayar ke grosir", tone: "neutral" };
  }
  switch (d) {
    case "Pending": return { text: "Menunggu", tone: "neutral" };
    case "Confirmed": return { text: "Dikonfirmasi", tone: "good" };
    case "Accepted": return { text: "Diterima otomatis", tone: "info" };
    case "Disputed": return { text: "Sengketa", tone: "bad" };
    case "DefaultRefunded": return { text: "Dana kembali (arbiter telat)", tone: "warn" };
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
  winner: { text: "Menang", tone: "good" },
  valid: { text: "Valid, kalah", tone: "neutral" },
  invalid: { text: "Tidak valid", tone: "bad" },
  forfeited: { text: "Tidak dibuka, jaminan hangus", tone: "bad" },
  sealed: { text: "Tersegel", tone: "info" },
};
