import { describe, expect, it } from "vitest";
import { DEFAULT_DEMO_ACCOUNT, demoHref, parseDemoParam } from "@/lib/demo";

describe("parseDemoParam", () => {
  it("accepts seeded warung accounts", () => {
    expect(parseDemoParam("warung-20.koelakan.testnet")).toBe("warung-20.koelakan.testnet");
    expect(parseDemoParam(" warung-01.koelakan.testnet ")).toBe("warung-01.koelakan.testnet");
  });
  it.each([null, undefined, "", "warung-2.koelakan.testnet", "warung-200.koelakan.testnet", "alice.testnet", "warung-20.koelakan.testnet.evil.com", "evil-warung-20.koelakan.testnet", "warung-20.koelakan.near", "../warung-20.koelakan.testnet", "warung-20.koelakan.testnet\nx"])(
    "rejects %j",
    (v) => expect(parseDemoParam(v)).toBeNull(),
  );
  it("builds the default link", () => {
    expect(demoHref()).toBe(`/warung?demo=${DEFAULT_DEMO_ACCOUNT}`);
    expect(parseDemoParam(new URL(demoHref(), "http://x").searchParams.get("demo"))).toBe(DEFAULT_DEMO_ACCOUNT);
  });
});
