import { describe, expect, it } from "vitest";
import { computeSteps, isReady, limitsMissing, nextStep, STEP_ORDER, type FlowInput } from "@/lib/steps";
import type { Policy } from "@/lib/types";

const policy: Policy = { max_price: { "beras-medium": "16650" }, weekly_budget: "2000000", auto_join: true };
const base: FlowInput = { accountId: null, tidr: null, available: null, held: null, policy: null, delegated: null, demand: null, apiOnline: true };
const status = (i: FlowInput) => Object.fromEntries(computeSteps(i).map((s) => [s.id, s.status]));

describe("computeSteps", () => {
  it("has four steps", () => {
    expect(STEP_ORDER).toEqual(["signin", "funds", "limits", "order"]);
  });
  it("signed out: sign in is next and the rest are locked", () => {
    expect(status(base)).toEqual({ signin: "next", funds: "locked", limits: "locked", order: "locked" });
  });
  it("fresh account asks for test money next", () => {
    const i = { ...base, accountId: "a.testnet", tidr: 0n, available: 0n, held: 0n };
    expect(nextStep(computeSteps(i))).toBe("funds");
    expect(status(i).limits).toBe("todo");
  });
  it("test rupiah in the wallet alone does not finish the funds step: it must reach the market", () => {
    expect(nextStep(computeSteps({ ...base, accountId: "a", tidr: 1_000_000n, available: 0n, held: 0n }))).toBe("funds");
  });
  it("after funding, limits then order", () => {
    const funded = { ...base, accountId: "a", tidr: 0n, available: 500_000n, held: 0n };
    expect(nextStep(computeSteps(funded))).toBe("limits");
    expect(nextStep(computeSteps({ ...funded, policy, delegated: false }))).toBe("limits");
    expect(nextStep(computeSteps({ ...funded, policy: null, delegated: true }))).toBe("limits");
    expect(nextStep(computeSteps({ ...funded, policy, delegated: true }))).toBe("order");
  });
  it("funds locked in rounds still count as deposited", () => {
    expect(status({ ...base, accountId: "a", tidr: 0n, available: 0n, held: 1n }).funds).toBe("done");
  });
  it("is resumable: limits are done only when both policy and the agent key are on chain", () => {
    const funded = { ...base, accountId: "a", tidr: 1n, available: 1n, held: 0n };
    expect(status({ ...funded, policy, delegated: true }).limits).toBe("done");
    expect(status({ ...funded, policy, delegated: null }).limits).not.toBe("done");
  });
  it("limitsMissing reports which half the chain still lacks", () => {
    expect(limitsMissing({ policy: null, delegated: null })).toEqual({ policy: true, delegation: true });
    expect(limitsMissing({ policy, delegated: false })).toEqual({ policy: false, delegation: true });
    expect(limitsMissing({ policy: null, delegated: true })).toEqual({ policy: true, delegation: false });
    expect(limitsMissing({ policy, delegated: true })).toEqual({ policy: false, delegation: false });
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
