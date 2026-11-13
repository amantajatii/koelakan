/**
 * "Agent chat": messages from a warung's agent to its owner, generated deterministically
 * from on-chain round data. Wording follows agents/src/wa.ts.
 *
 * The contract does not store per-event timestamps, so message times are estimates placed
 * inside the real phase windows (see `slot`). Transaction hashes live in the NEAR logs.
 */
import { nsToMs } from "./json";
import { shortAccount } from "./format";
import { forfeitedBids, isSettled, proRataShares, winnerBid } from "./stats";
import type { Item, RoundView } from "./types";
import { LEAD_MS, type ChatMessage, type Ctx } from "./wa-types";
import { deliveryMessages, openingMessages, settleMessages } from "./wa-messages";

export { slot } from "./wa-types";
export type { ChatKind, ChatMessage } from "./wa-types";

/** All chat messages for one round, sorted by time. */
export function buildRoundChat(round: RoundView, item: Item): ChatMessage[] {
  const ctx: Ctx = {
    round,
    item,
    opened: nsToMs(round.opened_at),
    joinEnd: nsToMs(round.join_deadline),
    settleAt: nsToMs(round.reveal_deadline) + LEAD_MS,
    deliveryEnd: nsToMs(round.delivery_deadline),
  };
  const done = round.state !== "Active";
  const forfeited = forfeitedBids(round);
  const forfeitedTotal = forfeited.reduce((a, b) => a + BigInt(b.bond), 0n);
  const shares = forfeitedTotal > 0n && done
    ? proRataShares(forfeitedTotal, round.participants.map((p) => BigInt(p.qty)))
    : [];
  const names = done ? forfeited.map((b) => shortAccount(b.seller_id)).join(", ") : "";
  const winner = winnerBid(round);
  const sellerName = winner === null ? "grosir" : shortAccount(winner.seller_id);

  const messages = round.participants.flatMap((p, i) => [
    ...openingMessages(ctx, p, i),
    ...(done ? settleMessages(ctx, p, i, shares, names) : []),
    ...(isSettled(round) ? deliveryMessages(ctx, p, i, sellerName) : []),
  ]);
  return messages.sort((a, b) => a.t - b.t || a.id.localeCompare(b.id));
}

export const filterByAccount = (messages: readonly ChatMessage[], account: string | null): ChatMessage[] =>
  account === null ? [...messages] : messages.filter((m) => m.account === account);
