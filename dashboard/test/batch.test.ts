import { describe, expect, it } from "vitest";
import { FAUCET_COOLDOWN_MS, faucetCooldownLeftMs, fundsBatch, limitsBatch, planFunds } from "@/lib/batch";
import { config, DELEGATION_ALLOWANCE_YOCTO } from "@/lib/config";
import type { Policy } from "@/lib/types";

const policy: Policy = { max_price: { "beras-medium": "16650" }, weekly_budget: "2000000", auto_join: true };
const KEY = "ed25519:6E8sCci9badyRkXb3JoRpBj5p8C6Tw41ELDZoiihKEtp";

describe("planFunds", () => {
  it("claims then deposits when the wallet is short and the faucet is ready", () => {
    expect(planFunds({ tidr: 0n, wanted: 500_000n, cooldownLeftMs: 0 })).toEqual({ includeFaucet: true, depositAmount: 500_000n, blocked: null });
  });
  it("skips the faucet when the wallet already has enough", () => {
    expect(planFunds({ tidr: 700_000n, wanted: 500_000n, cooldownLeftMs: 0 }).includeFaucet).toBe(false);
    expect(planFunds({ tidr: 500_000n, wanted: 500_000n, cooldownLeftMs: 60_000 })).toEqual({ includeFaucet: false, depositAmount: 500_000n, blocked: null });
  });
  it("during the cooldown deposits what the wallet has", () => {
    expect(planFunds({ tidr: 120_000n, wanted: 500_000n, cooldownLeftMs: 600_000 })).toEqual({ includeFaucet: false, depositAmount: 120_000n, blocked: null });
  });
  it("blocks with minutes left when there is nothing to deposit during the cooldown", () => {
    expect(planFunds({ tidr: 0n, wanted: 500_000n, cooldownLeftMs: 61_000 }).blocked).toEqual({ reason: "cooldown", minutesLeft: 2 });
  });
});

describe("faucetCooldownLeftMs", () => {
  it("counts down from the last claim", () => {
    expect(faucetCooldownLeftMs(null, 1000)).toBe(0);
    expect(faucetCooldownLeftMs(1000, 1000 + 1000)).toBe(FAUCET_COOLDOWN_MS - 1000);
    expect(faucetCooldownLeftMs(1000, 1000 + FAUCET_COOLDOWN_MS)).toBe(0);
  });
});

describe("fundsBatch", () => {
  it("is two transactions in order: faucet on the token, then deposit via ft_transfer_call", () => {
    const [faucet, deposit] = fundsBatch({ includeFaucet: true, depositAmount: 500_000n });
    expect(faucet).toMatchObject({ receiverId: config.tidrId, actions: [{ type: "FunctionCall", methodName: "faucet", deposit: "0" }] });
    expect(deposit).toMatchObject({
      receiverId: config.tidrId,
      actions: [{ type: "FunctionCall", methodName: "ft_transfer_call", deposit: "1", args: { receiver_id: config.marketId, amount: "500000", msg: "deposit" } }],
    });
  });
  it("is a single deposit when the faucet is skipped", () => {
    expect(fundsBatch({ includeFaucet: false, depositAmount: 1n })).toHaveLength(1);
  });
});

describe("limitsBatch", () => {
  it("sets the policy on the market and adds the agent key on the owner's own account", () => {
    const txs = limitsBatch({ accountId: "a.testnet", policy, servicePublicKey: KEY, includeDelegation: true });
    expect(txs).toHaveLength(2);
    expect(txs[0]).toMatchObject({ receiverId: config.marketId, actions: [{ type: "FunctionCall", methodName: "set_policy", deposit: "1", args: { policy } }] });
    expect(txs[1]).toEqual({
      receiverId: "a.testnet",
      actions: [{ type: "AddKey", publicKey: KEY, receiverId: config.marketId, methodNames: ["join_round"], allowanceYocto: DELEGATION_ALLOWANCE_YOCTO }],
    });
  });
  it("leaves out the half the chain already has", () => {
    expect(limitsBatch({ accountId: "a", policy, servicePublicKey: KEY, includeDelegation: false })).toHaveLength(1);
    expect(limitsBatch({ accountId: "a", policy: null, servicePublicKey: KEY, includeDelegation: true })).toHaveLength(1);
    expect(limitsBatch({ accountId: "a", policy, servicePublicKey: null, includeDelegation: true })).toHaveLength(1);
  });
});
