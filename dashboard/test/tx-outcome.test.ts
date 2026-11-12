import { describe, expect, it } from "vitest";
import { explainFailure, outcomeFailure, outcomeHash } from "@/lib/outcome";
import { depositCall, faucetCall, joinRoundCall, openRoundCall, setPolicyCall, singlePolicy } from "@/lib/tx";

describe("tx builders", () => {
  it("deposit is ft_transfer_call to the market with 1 yocto and msg=deposit", () => {
    const c = depositCall(500000n);
    expect(c.methodName).toBe("ft_transfer_call");
    expect(c.deposit).toBe("1");
    expect(c.args).toEqual({ receiver_id: "market.koelakan.testnet", amount: "500000", msg: "deposit" });
    expect(c.receiverId).toBe("tidr.koelakan.testnet");
  });
  it("join_round attaches no deposit, so the function-call key can sign it", () => {
    const c = joinRoundCall(3, 10);
    expect(c.deposit).toBe("0");
    expect(c.args).toEqual({ round_id: 3, qty: 10 });
    expect(c.receiverId).toBe("market.koelakan.testnet");
  });
  it("set_policy needs 1 yocto and wraps the policy", () => {
    const c = setPolicyCall(singlePolicy("beras-medium", 16650n, 2_000_000n));
    expect(c.deposit).toBe("1");
    expect(c.args).toEqual({ policy: { max_price: { "beras-medium": "16650" }, weekly_budget: "2000000", auto_join: true } });
  });
  it("open_round uses demo durations within the 30 s minimum", () => {
    const c = openRoundCall("gula-pasir", 19950n, 100);
    expect(c.args).toMatchObject({ item: "gula-pasir", ceiling_price: "19950", min_total_qty: 100 });
    for (const k of ["join_secs", "commit_secs", "reveal_secs", "delivery_secs"]) expect(c.args[k] as number).toBeGreaterThanOrEqual(30);
  });
  it("faucet is a zero-deposit call on tidr", () => expect(faucetCall()).toMatchObject({ receiverId: "tidr.koelakan.testnet", methodName: "faucet", deposit: "0" }));
});

describe("outcome parsing", () => {
  const failing = {
    status: { SuccessValue: "" },
    transaction: { hash: "abc" },
    receipts_outcome: [
      { outcome: { status: { SuccessValue: "" } } },
      { outcome: { status: { Failure: { ActionError: { kind: { FunctionCallError: { ExecutionError: "Smart contract panicked: faucet: wait one hour between claims" } } } } } } },
    ],
  };
  it("finds a failure buried in a receipt", () => expect(outcomeFailure(failing)).toContain("wait one hour"));
  it("returns null on success or no outcome", () => {
    expect(outcomeFailure({ status: { SuccessValue: "" }, receipts_outcome: [] })).toBeNull();
    expect(outcomeFailure(undefined)).toBeNull();
  });
  it("reads the transaction hash", () => {
    expect(outcomeHash(failing)).toBe("abc");
    expect(outcomeHash({ transaction_outcome: { id: "xyz" } })).toBe("xyz");
  });
  it("explains the faucet cooldown in Indonesian", () => {
    expect(explainFailure("Smart contract panicked: faucet: wait one hour between claims")).toMatch(/sekali per jam/);
    expect(explainFailure("something unknown")).toBe("something unknown");
  });
});
