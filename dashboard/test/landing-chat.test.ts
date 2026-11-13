import { describe, expect, it } from "vitest";
import { buildLandingChat, latestShowcaseRound } from "@/lib/landing-chat";
import { BERAS, closedRound, makeRound } from "./fixtures";

describe("latestShowcaseRound", () => {
  it("returns the newest settled round with a winner", () => {
    const rounds = [{ ...closedRound(), id: 1 }, { ...closedRound(), id: 4 }, makeRound({ id: 5 })];
    expect(latestShowcaseRound(rounds)?.id).toBe(4);
  });

  it("returns null when nothing has settled", () => {
    expect(latestShowcaseRound([makeRound()])).toBeNull();
  });
});

describe("buildLandingChat", () => {
  it("builds beats from the round's own numbers", () => {
    const chat = buildLandingChat(closedRound(), BERAS, "warung-01.koelakan.testnet");
    expect(chat?.warung).toBe("warung-01");
    const result = chat?.beats.find((b) => b.kind === "result");
    expect(result).toMatchObject({ kind: "result", paid: "12000", winner: "grosir-1" });
    expect(chat?.beats.find((b) => b.kind === "agent" && b.text.includes("3 grosirs"))).toBeDefined();
  });

  it("adds the owner's confirmation only when delivery was confirmed on-chain", () => {
    const confirmed = buildLandingChat(closedRound(), BERAS, "warung-01.koelakan.testnet");
    const accepted = buildLandingChat(closedRound(), BERAS, "warung-02.koelakan.testnet");
    expect(confirmed?.beats.some((b) => b.kind === "owner")).toBe(true);
    expect(accepted?.beats.some((b) => b.kind === "owner")).toBe(false);
  });

  it("falls back to the first participant when the preferred warung did not join", () => {
    expect(buildLandingChat(closedRound(), BERAS, "warung-20.koelakan.testnet")?.warung).toBe("warung-01");
  });

  it("returns null for a round that has not settled", () => {
    expect(buildLandingChat(makeRound(), BERAS, "warung-01.koelakan.testnet")).toBeNull();
  });
});
