import { ownerName, rupiah, shortAccount } from "./format";
import { itemLabel } from "./items";
import { winnerBid } from "./stats";
import type { Delivery, Participant, RoundView } from "./types";
import { LEAD_MS, slot, type ChatKind, type ChatMessage, type Ctx } from "./wa-types";

const make = (ctx: Ctx, p: Participant, kind: ChatKind, direction: ChatMessage["direction"], t: number, text: string, n = 0): ChatMessage => ({
  id: `r${ctx.round.id}-${p.account_id}-${kind}-${n}`,
  t,
  direction,
  account: p.account_id,
  owner: ownerName(p.account_id),
  kind,
  text,
});

export function openingMessages(ctx: Ctx, p: Participant, i: number): ChatMessage[] {
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

export function settleMessages(ctx: Ctx, p: Participant, i: number, shares: bigint[], forfeitedNames: string): ChatMessage[] {
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

export function deliveryMessages(ctx: Ctx, p: Participant, i: number, sellerName: string): ChatMessage[] {
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
