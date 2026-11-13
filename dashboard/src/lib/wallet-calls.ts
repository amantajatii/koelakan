import type { WalletSelector } from "@near-wallet-selector/core";
import { Buffer } from "buffer";
import type { ActionSpec, TxSpec } from "./batch";
import type { AddKeySpec, DeleteKeySpec } from "./delegation";
import { SIGN_MESSAGE_HINT, type SignRequest, type SignedResult } from "./nep413";
import { explainFailure, outcomeFailure, outcomeHash, type OutcomeLike } from "./outcome";
import type { FunctionCallSpec } from "./tx";

export interface CallResult {
  ok: boolean;
  hash: string | null;
  /** English message when `ok` is false. */
  error: string | null;
}

export type SignOutcome =
  | { status: "signed"; signed: SignedResult }
  | { status: "redirected" }
  | { status: "failed"; error: string };

type Selector = WalletSelector | null;
type SentOutcome = OutcomeLike | void;

const NOT_SIGNED_IN = "Sign in with a NEAR wallet first.";

function errorMessage(e: unknown): string {
  if (e instanceof Error) return explainFailure(e.message);
  return "Something unexpected went wrong.";
}

const failed = (error: string, hash: string | null = null): CallResult => ({ ok: false, hash, error });

/** Result for a single transaction outcome: a failure anywhere in it becomes an English error. */
function resultOf(outcome: SentOutcome): CallResult {
  const failure = outcomeFailure(outcome ?? null);
  if (failure) return failed(explainFailure(failure), outcomeHash(outcome ?? null));
  return { ok: true, hash: outcomeHash(outcome ?? null), error: null };
}

export async function sendFunctionCall(selector: Selector, accountId: string | null, spec: FunctionCallSpec): Promise<CallResult> {
  if (!selector || !accountId) return failed(NOT_SIGNED_IN);
  try {
    const { actionCreators } = await import("@near-wallet-selector/core");
    const wallet = await selector.wallet();
    const outcome = (await wallet.signAndSendTransaction({
      signerId: accountId,
      receiverId: spec.receiverId,
      actions: [actionCreators.functionCall(spec.methodName, spec.args, BigInt(spec.gas), BigInt(spec.deposit))],
    })) as SentOutcome;
    return resultOf(outcome);
  } catch (e) {
    return failed(errorMessage(e));
  }
}

/** AddKey or DeleteKey on the signed-in account itself (needs the full-access key). */
export async function sendKeyAction(selector: Selector, accountId: string | null, spec: AddKeySpec | DeleteKeySpec): Promise<CallResult> {
  if (!selector || !accountId) return failed(NOT_SIGNED_IN);
  try {
    const [{ actionCreators }, { utils }] = await Promise.all([import("@near-wallet-selector/core"), import("near-api-js")]);
    const publicKey = utils.PublicKey.from(spec.publicKey) as unknown as Parameters<typeof actionCreators.addKey>[0];
    const action =
      spec.type === "AddKey"
        ? actionCreators.addKey(publicKey, actionCreators.functionCallAccessKey(spec.receiverId, spec.methodNames, BigInt(spec.allowanceYocto)))
        : actionCreators.deleteKey(publicKey);
    const wallet = await selector.wallet();
    const outcome = (await wallet.signAndSendTransaction({ signerId: accountId, receiverId: accountId, actions: [action] })) as SentOutcome;
    return resultOf(outcome);
  } catch (e) {
    return failed(errorMessage(e));
  }
}

/**
 * Several transactions behind one wallet approval (`signAndSendTransactions`). Wallets without it
 * get the same transactions one after another.
 */
export async function sendBatch(selector: Selector, accountId: string | null, txs: TxSpec[]): Promise<CallResult> {
  if (!selector || !accountId) return failed(NOT_SIGNED_IN);
  if (txs.length === 0) return failed("There is nothing to approve.");
  try {
    const [{ actionCreators }, { utils }] = await Promise.all([import("@near-wallet-selector/core"), import("near-api-js")]);
    const toAction = (spec: ActionSpec) =>
      spec.type === "FunctionCall"
        ? actionCreators.functionCall(spec.methodName, spec.args, BigInt(spec.gas), BigInt(spec.deposit))
        : actionCreators.addKey(
            utils.PublicKey.from(spec.publicKey) as unknown as Parameters<typeof actionCreators.addKey>[0],
            actionCreators.functionCallAccessKey(spec.receiverId, spec.methodNames, BigInt(spec.allowanceYocto)),
          );
    const transactions = txs.map((t) => ({ signerId: accountId, receiverId: t.receiverId, actions: t.actions.map(toAction) }));
    const wallet = await selector.wallet();
    let outcomes: SentOutcome[];
    if (typeof wallet.signAndSendTransactions === "function") {
      const sent = (await wallet.signAndSendTransactions({ transactions, callbackUrl: `${window.location.origin}/warung` } as Parameters<typeof wallet.signAndSendTransactions>[0])) as Array<OutcomeLike> | void;
      outcomes = Array.isArray(sent) ? sent : [];
    } else {
      outcomes = [];
      for (const tx of transactions) outcomes.push((await wallet.signAndSendTransaction(tx)) as SentOutcome);
    }
    for (const o of outcomes) {
      const failure = outcomeFailure(o ?? null);
      if (failure) return failed(explainFailure(failure), outcomeHash(o ?? null));
    }
    const last = outcomes[outcomes.length - 1];
    return { ok: true, hash: outcomeHash(last ?? null), error: null };
  } catch (e) {
    return failed(errorMessage(e));
  }
}

/** NEP-413 signature. `redirected` means the wallet left the page and the result comes back in the URL hash. */
export async function signNep413(selector: Selector, accountId: string | null, req: SignRequest): Promise<SignOutcome> {
  if (!selector || !accountId) return { status: "failed", error: NOT_SIGNED_IN };
  try {
    const wallet = await selector.wallet();
    if (!wallet.signMessage) return { status: "failed", error: SIGN_MESSAGE_HINT };
    const result = await wallet.signMessage({
      message: req.message,
      recipient: req.recipient,
      nonce: Buffer.from(req.nonce),
      callbackUrl: `${window.location.origin}/warung`,
    });
    if (!result) return { status: "redirected" };
    return { status: "signed", signed: { accountId: result.accountId, publicKey: result.publicKey, signature: result.signature } };
  } catch (e) {
    return { status: "failed", error: e instanceof Error && /reject|cancel|closed|denied/i.test(e.message) ? "Signing was cancelled in the wallet." : errorMessage(e) };
  }
}
