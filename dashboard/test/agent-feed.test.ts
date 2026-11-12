import { describe, expect, it } from "vitest";
import { chatHref, latestAgentMessages } from "@/lib/agent-feed";
import { BERAS, closedRound, makeRound, msAt } from "./fixtures";

describe("latestAgentMessages", () => {
  const rounds = [makeRound({ id: 1 }), { ...closedRound(), id: 2 }];
  const acct = "warung-01.koelakan.testnet";
  it("returns at most three agent messages for the account, oldest first", () => {
    const f = latestAgentMessages(rounds, [BERAS], acct, msAt(10_000), 3);
    expect(f.messages.length).toBeLessThanOrEqual(3);
    expect(f.messages.every((m) => m.account === acct && m.direction === "agent_to_owner")).toBe(true);
    expect([...f.messages].sort((a, b) => a.t - b.t)).toEqual(f.messages);
    expect(f.latestRoundId).toBe(2);
  });
  it("is empty for an account that took part in nothing", () => {
    expect(latestAgentMessages(rounds, [BERAS], "warung-09.koelakan.testnet", msAt(10_000))).toEqual({ messages: [], latestRoundId: null });
  });
  it("builds a /chat link filtered to the warung", () => {
    expect(chatHref(acct, 2)).toBe(`/chat?round=2&warung=${acct}`);
    expect(chatHref(acct, null)).toBe(`/chat?warung=${acct}`);
  });
});
