import { describe, expect, it } from "vitest";
import { validAccount, validUrl } from "@/lib/config";

describe("env validation", () => {
  it("keeps good URLs, strips trailing slashes and rejects others", () => {
    expect(validUrl("https://a.example/", "x")).toBe("https://a.example");
    expect(validUrl("javascript:alert(1)", "fb")).toBe("fb");
    expect(validUrl("", "fb")).toBe("fb");
  });
  it("accepts NEAR accounts and rejects junk", () => {
    expect(validAccount("market.koelakan.testnet", "fb")).toBe("market.koelakan.testnet");
    expect(validAccount("Bad Account!", "fb")).toBe("fb");
  });
});
