import { DELEGATION_ALLOWANCE_YOCTO, config } from "./config";

/** Wallet-agnostic descriptions of the two key actions; wallet.tsx turns them into NEAR actions. */
export interface AddKeySpec {
  type: "AddKey";
  publicKey: string;
  receiverId: string;
  methodNames: string[];
  allowanceYocto: string;
}
export interface DeleteKeySpec {
  type: "DeleteKey";
  publicKey: string;
}

/** Function-call key for the agent service: `join_round` on the market only, 0.25 NEAR of gas allowance. */
export const addDelegationKey = (servicePublicKey: string): AddKeySpec => ({
  type: "AddKey",
  publicKey: servicePublicKey,
  receiverId: config.marketId,
  methodNames: ["join_round"],
  allowanceYocto: DELEGATION_ALLOWANCE_YOCTO,
});

export const revokeDelegationKey = (servicePublicKey: string): DeleteKeySpec => ({
  type: "DeleteKey",
  publicKey: servicePublicKey,
});

/** Shape of the RPC `view_access_key` result (only what we read). */
export interface AccessKeyView {
  permission: "FullAccess" | { FunctionCall: { allowance: string | null; receiver_id: string; method_names: string[] } };
}

/** True when the key can call `join_round` on the market and nothing broader is hiding behind it. */
export function isDelegationKey(key: AccessKeyView | null): boolean {
  if (!key || key.permission === "FullAccess") return false;
  const fc = key.permission.FunctionCall;
  return fc.receiver_id === config.marketId && fc.method_names.length === 1 && fc.method_names[0] === "join_round";
}
