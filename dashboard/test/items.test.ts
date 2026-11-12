import { describe, expect, it } from "vitest";
import { itemLabel } from "@/lib/items";
import { BERAS } from "./fixtures";

describe("itemLabel", () => {
  it("maps known item ids to English display names", () => {
    expect(itemLabel(BERAS)).toBe("Medium rice (type II)");
    expect(itemLabel(undefined, "minyak-curah")).toBe("Bulk cooking oil");
  });
  it("falls back to the chain name, then the id", () => {
    expect(itemLabel({ id: "garam", name: "Garam dapur" })).toBe("Garam dapur");
    expect(itemLabel(undefined, "garam")).toBe("garam");
  });
});
