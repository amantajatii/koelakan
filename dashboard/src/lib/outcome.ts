/** Helpers for reading a NEAR FinalExecutionOutcome without depending on near-api-js types. */

interface Status {
  Failure?: unknown;
  SuccessValue?: string;
}
interface ReceiptOutcome {
  outcome?: { status?: Status };
}
export interface OutcomeLike {
  status?: Status | string;
  transaction?: { hash?: string };
  transaction_outcome?: { id?: string };
  receipts_outcome?: ReceiptOutcome[];
}

/** Find the human-readable panic message inside a failure object. */
function failureText(failure: unknown): string {
  const raw = JSON.stringify(failure) ?? "";
  const exec = /"ExecutionError":"((?:[^"\\]|\\.)*)"/.exec(raw);
  if (exec?.[1]) return exec[1].replace(/\\"/g, '"');
  return raw.length > 200 ? `${raw.slice(0, 200)}...` : raw;
}

/** First failure message in the transaction or any of its receipts, or null on success. */
export function outcomeFailure(outcome: OutcomeLike | null | undefined): string | null {
  if (!outcome) return null;
  const top = outcome.status;
  if (typeof top === "object" && top?.Failure) return failureText(top.Failure);
  for (const r of outcome.receipts_outcome ?? []) {
    const st = r.outcome?.status;
    if (st?.Failure) return failureText(st.Failure);
  }
  return null;
}

export function outcomeHash(outcome: OutcomeLike | null | undefined): string | null {
  return outcome?.transaction?.hash ?? outcome?.transaction_outcome?.id ?? null;
}

/** Turn contract panic text into a short Indonesian explanation. */
export function explainFailure(message: string): string {
  const rules: Array<[RegExp, string]> = [
    [/wait one hour/i, "Faucet hanya bisa diklaim sekali per jam. Coba lagi nanti, atau pakai saldo tIDR yang sudah ada."],
    [/no policy/i, 'Belum ada kebijakan untuk akun ini. Jalankan langkah "Atur kebijakan" dulu.'],
    [/ceiling above owner max_price/i, "Harga maks ronde lebih tinggi dari batas harga di kebijakan Anda."],
    [/weekly budget exceeded/i, "Anggaran mingguan Anda tidak cukup untuk jumlah ini."],
    [/insufficient available balance/i, 'Saldo tersedia di market kurang. Jalankan "Setor ke market" lebih banyak.'],
    [/already joined/i, "Akun ini sudah ikut ronde tersebut."],
    [/not accepting joins/i, "Ronde sudah tidak menerima pendaftaran."],
    [/item not in owner policy/i, "Barang ini belum ada di kebijakan Anda."],
    [/does not have enough balance|NotEnoughBalance|not enough/i, "Saldo tIDR di dompet tidak cukup."],
    [/not registered|storage/i, 'Akun belum terdaftar di token tIDR. Klik "Ambil tIDR" dulu.'],
    [/NotEnoughAllowance|allowance/i, "Kunci terbatas kehabisan jatah gas. Masuk ulang untuk membuat kunci baru."],
  ];
  for (const [re, text] of rules) if (re.test(message)) return text;
  return message;
}
