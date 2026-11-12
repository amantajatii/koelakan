import { describe, expect, it } from "vitest";
import { computeSteps, isReady, nextStep, type FlowInput } from "@/lib/steps";
import type { Policy } from "@/lib/types";

const policy: Policy = { max_price: { "beras-medium": "16650" }, weekly_budget: "2000000", auto_join: true };
const base: FlowInput = { accountId: null, tidr: null, available: null, held: null, policy: null, delegated: null, demand: null, apiOnline: true };
const status = (i: FlowInput) => Object.fromEntries(computeSteps(i).map((s) => [s.id, s.status]));

describe("computeSteps", () => {
  it("signed out: sign in is next and the rest are locked", () => {
    expect(status(base)).toEqual({ signin: "next", faucet: "locked", deposit: "locked", policy: "locked", delegate: "locked", order: "locked" });
  });
  it("fresh account asks for the faucet next", () => {
    const s = computeSteps({ ...base, accountId: "a.testnet", tidr: 0n, available: 0n, held: 0n });
    expect(nextStep(s)).toBe("faucet");
    expect(status({ ...base, accountId: "a.testnet", tidr: 0n, available: 0n, held: 0n }).deposit).toBe("todo");
  });
  it("with tIDR but no deposit, deposit is next", () => {
    expect(nextStep(computeSteps({ ...base, accountId: "a", tidr: 1_000_000n, available: 0n, held: 0n }))).toBe("deposit");
  });
  it("after a deposit, policy then delegate then order", () => {
    const funded = { ...base, accountId: "a", tidr: 0n, available: 500_000n, held: 0n };
    expect(nextStep(computeSteps(funded))).toBe("policy");
    expect(nextStep(computeSteps({ ...funded, policy, delegated: false }))).toBe("delegate");
    expect(nextStep(computeSteps({ ...funded, policy, delegated: true }))).toBe("order");
  });
  it("funds locked in rounds still count as deposited", () => {
    expect(status({ ...base, accountId: "a", tidr: 0n, available: 0n, held: 1n }).deposit).toBe("done");
  });
  it("is resumable: delegated chain state alone marks the step done", () => {
    expect(status({ ...base, accountId: "a", tidr: 1n, available: 1n, held: 0n, policy, delegated: true }).delegate).toBe("done");
  });
  it("locks the standing order while the service is offline and never offers it as next", () => {
    const i = { ...base, accountId: "a", tidr: 0n, available: 1n, held: 0n, policy, delegated: true, apiOnline: false };
    expect(status(i).order).toBe("locked");
    expect(nextStep(computeSteps(i))).toBeNull();
  });
  it("is ready when every step is done; an all-zero demand does not count", () => {
    const all = { ...base, accountId: "a", tidr: 0n, available: 1n, held: 0n, policy, delegated: true };
    expect(isReady(computeSteps({ ...all, demand: { "beras-medium": 0 } }))).toBe(false);
    expect(isReady(computeSteps({ ...all, demand: { "beras-medium": 20 } }))).toBe(true);
  });
});
