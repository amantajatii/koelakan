import { describe, expect, it } from "vitest";
import { config } from "@/lib/config";
import { addDelegationKey, isDelegationKey, revokeDelegationKey } from "@/lib/delegation";

const PK = "ed25519:6E8sCci9badyRkXb3JoRpBj5p8C6Tw41ELDZoiihKEtp";

describe("delegation actions", () => {
  it("AddKey is a join_round-only function-call key with 0.25 NEAR allowance", () => {
    const a = addDelegationKey(PK);
    expect(a).toEqual({ type: "AddKey", publicKey: PK, receiverId: config.marketId, methodNames: ["join_round"], allowanceYocto: "250000000000000000000000" });
    expect(BigInt(a.allowanceYocto)).toBe(250_000_000_000_000_000_000_000n);
  });
  it("DeleteKey targets the same key", () => expect(revokeDelegationKey(PK)).toEqual({ type: "DeleteKey", publicKey: PK }));
});

describe("isDelegationKey", () => {
  const fc = (over: object) => ({ permission: { FunctionCall: { allowance: "1", receiver_id: config.marketId, method_names: ["join_round"], ...over } } });
  it("accepts the expected key", () => expect(isDelegationKey(fc({}))).toBe(true));
  it("rejects a missing key, full access, other receivers and extra methods", () => {
    expect(isDelegationKey(null)).toBe(false);
    expect(isDelegationKey({ permission: "FullAccess" })).toBe(false);
    expect(isDelegationKey(fc({ receiver_id: "other.testnet" }))).toBe(false);
    expect(isDelegationKey(fc({ method_names: ["join_round", "withdraw"] }))).toBe(false);
  });
});
