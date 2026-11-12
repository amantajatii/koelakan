/**
 * "Agent chat": messages from a warung's agent to its owner, generated deterministically
 * from on-chain round data. Wording follows agents/src/wa.ts.
 *
 * The contract does not store per-event timestamps, so message times are estimates placed
 * inside the real phase windows (see `slot`). Transaction hashes live in the NEAR logs.
 */
import { nsToMs } from "./json";
import { ownerName, rupiah, shortAccount } from "./format";
import { itemLabel } from "./items";
import { forfeitedBids, isSettled, proRataShares, winnerBid } from "./stats";
import type { Delivery, Item, Participant, RoundView } from "./types";

export type ChatKind =
  | "announce"
  | "joined"
  | "settled"
  | "failed"
  | "bond_forfeited"
  | "delivering"
  | "owner_confirm"
  | "delivery_confirmed"
  | "auto_accepted"
  | "owner_dispute"
  | "disputed"
  | "dispute_resolved";

export interface ChatMessage {
  id: string;
  t: number;
  direction: "agent_to_owner" | "owner_to_agent";
  account: string;
  owner: string;
  kind: ChatKind;
  text: string;
}

const STEP_MS = 3_000;
const LEAD_MS = 4_000;

/** Place the i-th event after `startMs`, never past `endMs`. */
export function slot(startMs: number, endMs: number, index: number): number {
  const wanted = startMs + LEAD_MS + index * STEP_MS;
  return Math.min(wanted, Math.max(startMs, endMs - 1_000));
}

interface Ctx {
  round: RoundView;
  item: Item;
  opened: number;
  joinEnd: number;
  settleAt: number;
  deliveryEnd: number;
}

const make = (ctx: Ctx, p: Participant, kind: ChatKind, direction: ChatMessage["direction"], t: number, text: string, n = 0): ChatMessage => ({
  id: `r${ctx.round.id}-${p.account_id}-${kind}-${n}`,
  t,
  direction,
  account: p.account_id,
  owner: ownerName(p.account_id),
  kind,
  text,
});

function openingMessages(ctx: Ctx, p: Participant, i: number): ChatMessage[] {
  const { round: r, item } = ctx;
  const t = slot(ctx.opened, ctx.joinEnd, i);
  const owner = ownerName(p.account_id);
  const name = itemLabel(item);
  return [
    make(ctx, p, "announce", "agent_to_owner", t,
      `${owner}, round #${r.id} is open: ${name}. Max price ${rupiah(r.ceiling_price)}/${item.unit}, PIHPS market price ${rupiah(r.ref_price)}/${item.unit}. ` +
      `Join with ${p.qty} ${item.unit}? Within your policy, so I said YES.`),
    make(ctx, p, "joined", "agent_to_owner", t + 1_000,
      `${owner}, you're in round #${r.id} with ${p.qty} ${item.unit} of ${name}, max price ${rupiah(r.ceiling_price)}/${item.unit}. ` +
      `${rupiah(BigInt(r.ceiling_price) * BigInt(p.qty))} is held until the round settles.`),
  ];
}

function settleMessages(ctx: Ctx, p: Participant, i: number, shares: bigint[], forfeitedNames: string): ChatMessage[] {
  const { round: r, item } = ctx;
  const owner = ownerName(p.account_id);
  const winner = winnerBid(r);
  const out: ChatMessage[] = [];
  if (winner !== null && r.clearing_price !== null) {
    const diff = BigInt(r.ceiling_price) - BigInt(r.clearing_price);
    const vsRef = BigInt(r.ref_price) - BigInt(r.clearing_price);
    out.push(make(ctx, p, "settled", "agent_to_owner", ctx.settleAt,
      `${owner}, round #${r.id} is settled. ${shortAccount(winner.seller_id)} won at ${rupiah(r.clearing_price)}/${item.unit} ` +
      `(${rupiah(vsRef)}/${item.unit} below the PIHPS market price of ${rupiah(r.ref_price)}). ` +
      `The difference of ${rupiah(diff * BigInt(p.qty))} went back to your pooled balance. The grosir will deliver the goods.`));
  } else {
    out.push(make(ctx, p, "failed", "agent_to_owner", ctx.settleAt,
      `${owner}, round #${r.id} did not go ahead (not enough demand or bids). Your full balance was refunded.`));
  }
  const share = shares[i] ?? 0n;
  if (forfeitedNames !== "") {
    out.push(make(ctx, p, "bond_forfeited", "agent_to_owner", ctx.settleAt + 1_000,
      `${owner}, ${forfeitedNames} did not reveal a bid, so the bond is forfeited and split among buyers. Your share, ${rupiah(share)}, was added to your balance.`));
  }
  return out;
}

function paidOf(r: RoundView, p: Participant): bigint {
  return r.clearing_price === null ? 0n : BigInt(r.clearing_price) * BigInt(p.qty);
}

function deliveryMessages(ctx: Ctx, p: Participant, i: number, sellerName: string): ChatMessage[] {
  const { round: r, item } = ctx;
  const owner = ownerName(p.account_id);
  const t = slot(ctx.settleAt, ctx.deliveryEnd, i + 1);
  const d: Delivery = p.delivery;
  if (d === "Confirmed") {
    return [
      make(ctx, p, "owner_confirm", "owner_to_agent", t, "The goods arrived, thank you."),
      make(ctx, p, "delivery_confirmed", "agent_to_owner", t + 1_000,
        `${owner}, receipt of ${p.qty} ${item.unit} is confirmed. ${rupiah(paidOf(r, p))} was released to ${sellerName}.`),
    ];
  }
  if (d === "Accepted") {
    return [make(ctx, p, "auto_accepted", "agent_to_owner", ctx.deliveryEnd + LEAD_MS,
      `${owner}, no confirmation by the deadline. Per the rules, the goods count as received and payment was released to ${sellerName}.`)];
  }
  if (d === "Disputed") {
    return [
      make(ctx, p, "owner_dispute", "owner_to_agent", t, "The goods have not arrived."),
      make(ctx, p, "disputed", "agent_to_owner", t + 1_000,
        `${owner}, dispute filed. ${rupiah(paidOf(r, p))} is frozen until the arbiter decides.`),
    ];
  }
  if (d === "Pending") {
    return [make(ctx, p, "delivering", "agent_to_owner", ctx.settleAt + 2_000,
      `${owner}, ${sellerName} is preparing ${p.qty} ${item.unit}. Confirm "received" before the delivery deadline so payment can be released.`)];
  }
  const refunded = d === "DefaultRefunded" || (typeof d === "object" && d.Resolved.refunded);
  const text = refunded
    ? `${owner}, dispute resolved: ${rupiah(paidOf(r, p))} was refunded to your balance.`
    : `${owner}, dispute resolved: the arbiter decided payment goes to ${sellerName}.`;
  return [make(ctx, p, "dispute_resolved", "agent_to_owner", ctx.deliveryEnd + LEAD_MS, text)];
}

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
