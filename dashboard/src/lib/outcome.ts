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
    [/wait one hour/i, "Free test money can only be claimed once per hour. Try again later, or add the test money you already have."],
    [/no policy/i, "You have not set your limits yet. Set them first, then try again."],
    [/ceiling above owner max_price/i, "The round's top price is above the price limit you set."],
    [/weekly budget exceeded/i, "Your weekly budget is too small for this order. Raise it in your limits, or order less."],
    [/insufficient available balance/i, "Not enough test money in your market balance. Add more test money first."],
    [/already joined/i, "This account has already joined that round."],
    [/not accepting joins/i, "The round is no longer accepting joins."],
    [/item not in owner policy/i, "This item is not in your limits."],
    [/does not have enough balance|NotEnoughBalance|not enough/i, "Not enough test rupiah in your wallet. Add test money first."],
    [/not registered|storage/i, "This account is not set up for test rupiah yet. Add test money first."],
    [/NotEnoughAllowance|allowance/i, "The agent ran out of network-fee allowance. Allow the agent again from your limits."],
  ];
  for (const [re, text] of rules) if (re.test(message)) return text;
  return message;
}
