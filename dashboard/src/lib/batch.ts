import { addDelegationKey, type AddKeySpec } from "./delegation";
import { depositCall, faucetCall, setPolicyCall, type FunctionCallSpec } from "./tx";
import type { Policy } from "./types";

/**
 * One wallet approval can carry several transactions. These are wallet-agnostic descriptions;
 * wallet.tsx turns them into NEAR actions for `signAndSendTransactions`.
 */
export type ActionSpec = ({ type: "FunctionCall" } & Omit<FunctionCallSpec, "receiverId">) | AddKeySpec;

export interface TxSpec {
  receiverId: string;
  actions: ActionSpec[];
}

const fromCall = ({ receiverId, ...rest }: FunctionCallSpec): TxSpec => ({ receiverId, actions: [{ type: "FunctionCall", ...rest }] });

/** The token contract allows one faucet claim per hour per account. */
export const FAUCET_COOLDOWN_MS = 3_600_000;

export function faucetCooldownLeftMs(lastClaimMs: number | null, nowMs: number): number {
  return lastClaimMs === null ? 0 : Math.max(0, lastClaimMs + FAUCET_COOLDOWN_MS - nowMs);
}

export interface FundsPlan {
  /** Add test rupiah first (two transactions, one approval). */
  includeFaucet: boolean;
  /** What goes into the market. May be lower than asked when the faucet is cooling down. */
  depositAmount: bigint;
  /** Set when nothing can be deposited right now. */
  blocked: { reason: "cooldown"; minutesLeft: number } | null;
}

/** Skip the faucet when the wallet already holds enough or the hour is not over; then only deposit. */
export function planFunds(input: { tidr: bigint; wanted: bigint; cooldownLeftMs: number }): FundsPlan {
  const { tidr, wanted, cooldownLeftMs } = input;
  if (tidr >= wanted) return { includeFaucet: false, depositAmount: wanted, blocked: null };
  if (cooldownLeftMs > 0) {
    if (tidr > 0n) return { includeFaucet: false, depositAmount: tidr, blocked: null };
    return { includeFaucet: false, depositAmount: 0n, blocked: { reason: "cooldown", minutesLeft: Math.ceil(cooldownLeftMs / 60_000) } };
  }
  return { includeFaucet: true, depositAmount: wanted, blocked: null };
}

/** Faucet (optional) then deposit to the market, in this order. */
export function fundsBatch(plan: Pick<FundsPlan, "includeFaucet" | "depositAmount">): TxSpec[] {
  const out: TxSpec[] = [];
  if (plan.includeFaucet) out.push(fromCall(faucetCall()));
  out.push(fromCall(depositCall(plan.depositAmount)));
  return out;
}

/**
 * Limits and permission together: `set_policy` on the market and the agent's restricted key on the
 * owner's own account. Either half is left out when the chain already has it, so the step can resume.
 */
export function limitsBatch(input: { accountId: string; policy: Policy | null; servicePublicKey: string | null; includeDelegation: boolean }): TxSpec[] {
  const out: TxSpec[] = [];
  if (input.policy) out.push(fromCall(setPolicyCall(input.policy)));
  if (input.includeDelegation && input.servicePublicKey) out.push({ receiverId: input.accountId, actions: [addDelegationKey(input.servicePublicKey)] });
  return out;
}
