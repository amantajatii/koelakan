/**
 * "Chat agen": messages from a warung's agent to its owner, generated deterministically
 * from on-chain round data. Wording follows agents/src/wa.ts.
 *
 * The contract does not store per-event timestamps, so message times are estimates placed
 * inside the real phase windows (see `slot`). Transaction hashes live in the NEAR logs.
 */
import { nsToMs } from "./json";
import { ownerName, rupiah, shortAccount } from "./format";
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
  return [
    make(ctx, p, "announce", "agent_to_owner", t,
      `${owner}, ronde #${r.id} dibuka: ${item.name}. Harga maks ${rupiah(r.ceiling_price)}/${item.unit}, harga pasar PIHPS ${rupiah(r.ref_price)}/${item.unit}. ` +
      `Ikut patungan ${p.qty} ${item.unit}? Sesuai kebijakan Anda, saya jawab YA.`),
    make(ctx, p, "joined", "agent_to_owner", t + 1_000,
      `${owner}, ${item.name} ${p.qty} ${item.unit} sudah dipesan lewat ronde #${r.id}, harga maks ${rupiah(r.ceiling_price)}/${item.unit}. ` +
      `Saldo ${rupiah(BigInt(r.ceiling_price) * BigInt(p.qty))} dikunci sampai ronde selesai.`),
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
      `${owner}, ronde #${r.id} selesai. ${shortAccount(winner.seller_id)} menang dengan harga ${rupiah(r.clearing_price)}/${item.unit} ` +
      `(hemat ${rupiah(vsRef)}/${item.unit} dari harga pasar PIHPS ${rupiah(r.ref_price)}). ` +
      `Selisih ${rupiah(diff * BigInt(p.qty))} sudah kembali ke saldo patungan. Barang akan dikirim grosir.`));
  } else {
    out.push(make(ctx, p, "failed", "agent_to_owner", ctx.settleAt,
      `${owner}, ronde #${r.id} tidak jadi (permintaan atau tawaran kurang). Seluruh saldo dikembalikan.`));
  }
  const share = shares[i] ?? 0n;
  if (forfeitedNames !== "") {
    out.push(make(ctx, p, "bond_forfeited", "agent_to_owner", ctx.settleAt + 1_000,
      `${owner}, ${forfeitedNames} tidak membuka tawarannya, jadi jaminannya hangus dan dibagi ke pembeli. Bagian Anda ${rupiah(share)} masuk saldo.`));
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
      make(ctx, p, "owner_confirm", "owner_to_agent", t, "Barang sudah sampai, terima kasih."),
      make(ctx, p, "delivery_confirmed", "agent_to_owner", t + 1_000,
        `${owner}, konfirmasi terima ${p.qty} ${item.unit} tercatat. ${rupiah(paidOf(r, p))} diteruskan ke ${sellerName}.`),
    ];
  }
  if (d === "Accepted") {
    return [make(ctx, p, "auto_accepted", "agent_to_owner", ctx.deliveryEnd + LEAD_MS,
      `${owner}, belum ada konfirmasi sampai batas waktu. Sesuai aturan, barang dianggap diterima dan pembayaran diteruskan ke ${sellerName}.`)];
  }
  if (d === "Disputed") {
    return [
      make(ctx, p, "owner_dispute", "owner_to_agent", t, "Barangnya belum sampai."),
      make(ctx, p, "disputed", "agent_to_owner", t + 1_000,
        `${owner}, sengketa diajukan. ${rupiah(paidOf(r, p))} dibekukan sampai arbiter memutuskan.`),
    ];
  }
  if (d === "Pending") {
    return [make(ctx, p, "delivering", "agent_to_owner", ctx.settleAt + 2_000,
      `${owner}, ${sellerName} sedang menyiapkan ${p.qty} ${item.unit}. Konfirmasi "sudah sampai" sebelum batas pengiriman agar pembayaran diteruskan.`)];
  }
  const refunded = d === "DefaultRefunded" || (typeof d === "object" && d.Resolved.refunded);
  const text = refunded
    ? `${owner}, sengketa selesai: ${rupiah(paidOf(r, p))} dikembalikan ke saldo Anda.`
    : `${owner}, sengketa selesai: arbiter memutuskan pembayaran diteruskan ke ${sellerName}.`;
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
