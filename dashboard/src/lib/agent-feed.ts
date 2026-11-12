import { itemOf } from "./stats";
import type { Item, RoundView } from "./types";
import { buildRoundChat, type ChatMessage } from "./wa";

export interface FeedResult {
  /** Oldest first, so the newest message sits at the bottom like a chat. */
  messages: ChatMessage[];
  /** Round the newest message belongs to, for deep-linking into /chat. */
  latestRoundId: number | null;
}

/** The latest agent-to-owner messages for one account, generated from chain data (same wording as /chat). */
export function latestAgentMessages(rounds: readonly RoundView[], items: readonly Item[], account: string, nowMs: number, limit = 3): FeedResult {
  const all: Array<{ roundId: number; message: ChatMessage }> = [];
  for (const round of rounds) {
    if (!round.participants.some((p) => p.account_id === account)) continue;
    const item = itemOf(items, round.item);
    if (!item) continue;
    for (const message of buildRoundChat(round, item)) {
      if (message.account === account && message.direction === "agent_to_owner" && message.t <= nowMs) all.push({ roundId: round.id, message });
    }
  }
  all.sort((a, b) => a.message.t - b.message.t || a.message.id.localeCompare(b.message.id));
  const last = all.slice(-limit);
  return { messages: last.map((x) => x.message), latestRoundId: last[last.length - 1]?.roundId ?? null };
}

export const chatHref = (account: string, roundId: number | null): string =>
  `/chat?${roundId !== null ? `round=${roundId}&` : ""}warung=${encodeURIComponent(account)}`;
