import { derivePhase } from "./phase";
import { rupiah } from "./format";
import type { Balance, Item, Policy, RoundView } from "./types";

export interface JoinInput {
  round: RoundView | null;
  item: Item | undefined;
  qty: number;
  policy: Policy | null;
  balance: Balance | null;
  /** tIDR already counted against this week's budget. */
  spent: bigint | null;
  nowMs: number;
  account: string;
}

export interface JoinProblem {
  code:
    | "no_round"
    | "not_open"
    | "bad_qty"
    | "already_joined"
    | "full"
    | "no_policy"
    | "item_not_in_policy"
    | "ceiling_above_max"
    | "budget"
    | "balance"
    | "needs_owner";
  message: string;
}

export const MAX_PARTICIPANTS = 50;

/** Mirror of the checks in `join_round` (RULES §3, §5.2), returning every reason a join would fail. */
export function checkJoin(input: JoinInput): JoinProblem[] {
  const { round, policy, balance, qty, nowMs, account } = input;
  if (round === null) return [{ code: "no_round", message: "Pilih ronde yang masih terbuka." }];
  const problems: JoinProblem[] = [];
  const add = (code: JoinProblem["code"], message: string): void => {
    problems.push({ code, message });
  };

  if (derivePhase(round, nowMs) !== "Join") add("not_open", "Ronde ini sudah tidak menerima pendaftaran.");
  if (!Number.isInteger(qty) || qty < 1) add("bad_qty", "Jumlah minimal 1.");
  if (round.participants.some((p) => p.account_id === account)) add("already_joined", "Akun ini sudah ikut ronde ini.");
  if (round.participants.length >= MAX_PARTICIPANTS) add("full", "Ronde penuh (maks 50 warung).");

  if (policy === null) {
    add("no_policy", 'Belum ada kebijakan. Atur dulu lewat "Atur kebijakan".');
    return problems;
  }
  const max = policy.max_price[round.item];
  if (max === undefined) {
    add("item_not_in_policy", "Barang ini belum ada di kebijakan Anda.");
  } else if (BigInt(round.ceiling_price) > BigInt(max)) {
    add("ceiling_above_max", `Harga maks ronde ${rupiah(round.ceiling_price)} melebihi batas Anda ${rupiah(max)}.`);
  }
  if (!policy.auto_join) add("needs_owner", "auto_join mati: hanya kunci penuh yang bisa ikut, kunci terbatas ditolak.");

  if (Number.isInteger(qty) && qty >= 1) {
    const cost = BigInt(round.ceiling_price) * BigInt(qty);
    if (input.spent !== null && input.spent + cost > BigInt(policy.weekly_budget)) {
      add("budget", `Anggaran mingguan terlampaui: terpakai ${rupiah(input.spent)} + ${rupiah(cost)} > ${rupiah(policy.weekly_budget)}.`);
    }
    if (balance !== null && BigInt(balance.available) < cost) {
      add("balance", `Saldo tersedia ${rupiah(balance.available)} kurang dari ${rupiah(cost)} yang harus dikunci.`);
    }
  }
  return problems;
}
