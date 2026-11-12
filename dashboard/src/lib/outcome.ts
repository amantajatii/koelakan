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

/** Turn contract panic text into a short English explanation. */
export function explainFailure(message: string): string {
  const rules: Array<[RegExp, string]> = [
    [/wait one hour/i, "The faucet can only be claimed once per hour. Try again later, or use the tIDR you already have."],
    [/no policy/i, 'This account has no policy yet. Run the "Set your policy" step first.'],
    [/ceiling above owner max_price/i, "The round max price is above the price limit in your policy."],
    [/weekly budget exceeded/i, "Your weekly budget is not enough for this quantity."],
    [/insufficient available balance/i, 'Not enough available balance in the market. Run "Deposit to market" with a larger amount.'],
    [/already joined/i, "This account has already joined that round."],
    [/not accepting joins/i, "The round is no longer accepting joins."],
    [/item not in owner policy/i, "This item is not in your policy."],
    [/does not have enough balance|NotEnoughBalance|not enough/i, "Not enough tIDR in your wallet."],
    [/not registered|storage/i, 'This account is not registered on the tIDR token. Click "Get tIDR" first.'],
    [/NotEnoughAllowance|allowance/i, "The restricted key ran out of gas allowance. Sign in again to create a new key."],
  ];
  for (const [re, text] of rules) if (re.test(message)) return text;
  return message;
}
