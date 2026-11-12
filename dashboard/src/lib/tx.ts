import { DEMO_DURATIONS, GAS, ONE_YOCTO, config } from "./config";
import type { Policy } from "./types";

/** Pure builders for the wallet-selector function-call actions used on the judge page. */
export interface FunctionCallSpec {
  receiverId: string;
  methodName: string;
  args: Record<string, unknown>;
  gas: string;
  deposit: string;
}

export const faucetCall = (): FunctionCallSpec => ({
  receiverId: config.tidrId,
  methodName: "faucet",
  args: {},
  gas: GAS.light,
  deposit: "0",
});

/** RULES §2.1: deposit is ft_transfer_call to the market with msg "deposit" (1 yocto required by NEP-141). */
export const depositCall = (amount: bigint): FunctionCallSpec => ({
  receiverId: config.tidrId,
  methodName: "ft_transfer_call",
  args: { receiver_id: config.marketId, amount: amount.toString(), msg: "deposit" },
  gas: GAS.ftTransferCall,
  deposit: ONE_YOCTO,
});

export const setPolicyCall = (policy: Policy): FunctionCallSpec => ({
  receiverId: config.marketId,
  methodName: "set_policy",
  args: { policy },
  gas: GAS.light,
  deposit: ONE_YOCTO,
});

/** Zero deposit, so the restricted function-call key can sign it without a wallet popup. */
export const joinRoundCall = (roundId: number, qty: number): FunctionCallSpec => ({
  receiverId: config.marketId,
  methodName: "join_round",
  args: { round_id: roundId, qty },
  gas: GAS.light,
  deposit: "0",
});

export const openRoundCall = (item: string, ceiling: bigint, minQty: number): FunctionCallSpec => ({
  receiverId: config.marketId,
  methodName: "open_round",
  args: {
    item,
    ceiling_price: ceiling.toString(),
    min_total_qty: minQty,
    join_secs: DEMO_DURATIONS.join,
    commit_secs: DEMO_DURATIONS.commit,
    reveal_secs: DEMO_DURATIONS.reveal,
    delivery_secs: DEMO_DURATIONS.delivery,
  },
  gas: GAS.light,
  deposit: "0",
});

export function singlePolicy(item: string, maxPrice: bigint, weeklyBudget: bigint): Policy {
  return { max_price: { [item]: maxPrice.toString() }, weekly_budget: weeklyBudget.toString(), auto_join: true };
}
