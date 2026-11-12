/** WhatsApp-style messages (Indonesian) from agents to warung owners, built from a finished round. */
import type { ActionRecord } from "./chain/recorder.js";
import { proRataShares } from "./sim-bridge.js";
import { rupiah } from "./util.js";
import type { RoundRun } from "./round.js";

export interface WaMessage {
  readonly t: string;
  readonly direction: "agent_to_owner" | "owner_to_agent";
  readonly account: string;
  readonly owner: string;
  readonly kind: string;
  readonly text: string;
  readonly tx_hash: string | null;
}

/** Fictional owner names for the 20 simulated warungs. */
export const OWNER_NAMES: readonly string[] = [
  "Pak Budi", "Bu Siti", "Pak Agus", "Bu Wati", "Pak Joko", "Bu Rina", "Pak Dedi", "Bu Yanti", "Pak Eko", "Bu Lastri",
  "Pak Hendra", "Bu Tini", "Pak Slamet", "Bu Dewi", "Pak Rudi", "Bu Ani", "Pak Wahyu", "Bu Endang", "Pak Teguh", "Bu Sri",
];

export function ownerName(account: string): string {
  const n = Number(/^warung-(\d+)/.exec(account)?.[1] ?? "0");
  return OWNER_NAMES[(n - 1 + OWNER_NAMES.length) % OWNER_NAMES.length] ?? "Pak/Bu";
}

const find = (actions: readonly ActionRecord[], method: string, actor?: string): ActionRecord | undefined =>
  actions.find((a) => a.method === method && a.status === "ok" && (actor === undefined || a.actor === actor));

const msg = (a: Omit<WaMessage, "owner"> ): WaMessage => ({ ...a, owner: ownerName(a.account) });

function joinMessages(run: RoundRun): WaMessage[] {
  const { roundAfter: r, item, actions } = run;
  return r.participants.flatMap((p) => {
    const rec = find(actions, "join_round", p.account_id);
    if (rec === undefined) return [];
    const text = `${ownerName(p.account_id)}, ${item.name} ${p.qty} ${item.unit} sudah dipesan lewat ronde #${r.id}, harga maks ${rupiah(r.ceiling_price)}/${item.unit}.`;
    return [msg({ t: rec.timestamp, direction: "agent_to_owner", account: p.account_id, kind: "joined", text, tx_hash: rec.tx_hash })];
  });
}

function skipMessages(run: RoundRun): WaMessage[] {
  return run.actions.filter((a) => a.method === "join_round" && a.status === "skipped").map((a) =>
    msg({
      t: a.timestamp, direction: "agent_to_owner", account: a.actor, kind: "skipped", tx_hash: null,
      text: `${ownerName(a.actor)}, agen tidak ikut ronde #${run.roundId}: ${a.note ?? "tidak memenuhi syarat"}.`,
    }),
  );
}

function settleMessages(run: RoundRun): WaMessage[] {
  const { roundAfter: r, item } = run;
  const rec = find(run.actions, "settle");
  if (rec === undefined) return [];
  const winner = r.winner === null ? null : (r.bids[r.winner]?.seller_id ?? null);
  const forfeitedBids = r.bids.filter((b) => b.revealed_price === null);
  const forfeited = forfeitedBids.reduce((a, b) => a + BigInt(b.bond), 0n);
  const shares = forfeited > 0n ? proRataShares(forfeited, r.participants.map((p) => BigInt(p.qty))) : [];
  return r.participants.flatMap((p, i) => {
    const owner = ownerName(p.account_id);
    const base = { t: rec.timestamp, direction: "agent_to_owner" as const, account: p.account_id, tx_hash: rec.tx_hash };
    const out: WaMessage[] = [];
    if (winner !== null && r.clearing_price !== null) {
      const diff = BigInt(r.ceiling_price) - BigInt(r.clearing_price);
      const vsRef = BigInt(r.ref_price) - BigInt(r.clearing_price);
      out.push(msg({ ...base, kind: "settled", text:
        `${owner}, ronde #${r.id} selesai. ${winner.split(".")[0]} menang dengan harga ${rupiah(r.clearing_price)}/${item.unit} ` +
        `(hemat ${rupiah(vsRef)}/${item.unit} dari harga pasar PIHPS ${rupiah(r.ref_price)}). ` +
        `Selisih ${rupiah(diff * BigInt(p.qty))} sudah kembali ke saldo patungan. Barang akan dikirim grosir.` }));
    } else {
      out.push(msg({ ...base, kind: "failed", text: `${owner}, ronde #${r.id} tidak jadi (permintaan atau tawaran kurang). Seluruh saldo dikembalikan.` }));
    }
    if (forfeited > 0n) {
      const names = forfeitedBids.map((b) => b.seller_id.split(".")[0]).join(", ");
      out.push(msg({ ...base, kind: "bond_forfeited", text:
        `${owner}, ${names} tidak membuka tawarannya, jadi jaminannya hangus dan dibagi ke pembeli. Bagian Anda ${rupiah(shares[i] ?? 0n)} masuk saldo.` }));
    }
    return out;
  });
}

function confirmMessages(run: RoundRun): WaMessage[] {
  const seller = run.roundAfter.winner === null ? "grosir" : (run.roundAfter.bids[run.roundAfter.winner]?.seller_id.split(".")[0] ?? "grosir");
  return run.actions.filter((a) => a.method === "confirm_delivery" && a.status === "ok").flatMap((a) => {
    const p = run.roundAfter.participants.find((x) => x.account_id === a.actor);
    const paid = (a.events.find((e) => e.event === "delivery_confirmed")?.data as { paid?: string } | undefined)?.paid ?? "0";
    return [
      msg({ t: a.timestamp, direction: "owner_to_agent", account: a.actor, kind: "owner_confirm", tx_hash: a.tx_hash,
        text: "Barang sudah sampai, terima kasih." }),
      msg({ t: a.timestamp, direction: "agent_to_owner", account: a.actor, kind: "delivery_confirmed", tx_hash: a.tx_hash,
        text: `${ownerName(a.actor)}, konfirmasi terima ${p?.qty ?? ""} ${run.item.unit} tercatat. ${rupiah(paid)} diteruskan ke ${seller}.` }),
    ];
  });
}

function silentMessages(run: RoundRun): WaMessage[] {
  const acc = run.silentWarung;
  const fin = find(run.actions, "finalize");
  if (acc === null || fin === undefined) return [];
  return [msg({ t: fin.timestamp, direction: "agent_to_owner", account: acc, kind: "auto_accepted", tx_hash: fin.tx_hash,
    text: `${ownerName(acc)}, belum ada konfirmasi sampai batas waktu. Sesuai aturan, barang dianggap diterima dan pembayaran diteruskan ke grosir.` })];
}

export function buildWa(run: RoundRun): WaMessage[] {
  return [
    ...joinMessages(run), ...skipMessages(run), ...settleMessages(run), ...confirmMessages(run), ...silentMessages(run),
  ].sort((a, b) => a.t.localeCompare(b.t));
}
