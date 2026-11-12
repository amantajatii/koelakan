import { describe, expect, it } from "vitest";
import type { ActionRecord } from "../src/chain/recorder.js";
import { skipRecord } from "../src/chain/recorder.js";
import { runCommit, runReveal, type GrosirDeps } from "../src/agents/grosir.js";
import { bidHash } from "../src/protocol.js";
import type { SaltEntry } from "../src/salts.js";

const okRecord = (method: string): ActionRecord => ({ ...skipRecord("a", "grosir", method, ""), status: "ok", tx_hash: "H" });

function makeDeps(over: Partial<GrosirDeps> = {}) {
  const log: string[] = [];
  const store: SaltEntry[] = [];
  const deps: GrosirDeps = {
    market: "market.x", tidr: "tidr.x", account: "grosir-1.x", short: "grosir-1",
    loadSalt: (id) => store.find((e) => e.round_id === id) ?? null,
    saveSalt: (e) => { log.push("saveSalt"); if (!store.some((x) => x.round_id === e.round_id)) store.push(e); }, // like persistSalt: idempotent
    newSalt: () => "ab".repeat(16),
    nowIso: () => "2026-11-12T00:00:00.000Z",
    walletBalance: async () => 1_000_000n,
    requiredBond: async () => 250_000n,
    quote: () => 15_000n,
    sendCommit: async () => { log.push("sendCommit"); return okRecord("ft_transfer_call"); },
    sendReveal: async () => { log.push("sendReveal"); return okRecord("reveal_bid"); },
    ...over,
  };
  return { deps, log, store };
}
const round = { id: 5, item: "beras-medium", ceiling: 16_650n };

describe("runCommit", () => {
  it("persists {round_id, price, salt} BEFORE sending the commit", async () => {
    const { deps, log, store } = makeDeps();
    await runCommit(deps, round);
    expect(log).toEqual(["saveSalt", "sendCommit"]);
    expect(store[0]).toMatchObject({ round_id: 5, price: "15000", salt: "ab".repeat(16), seller: "grosir-1.x" });
  });

  it("does not send the commit if persisting the salt fails", async () => {
    const { deps, log } = makeDeps({ saveSalt: () => { throw new Error("disk full"); } });
    await expect(runCommit(deps, round)).rejects.toThrow("disk full");
    expect(log).not.toContain("sendCommit");
  });

  it("sends the hash of the persisted price and salt with the exact bond", async () => {
    let sent: { receiver_id: string; amount: string; msg: string } | undefined;
    const { deps } = makeDeps({ sendCommit: async (args) => { sent = args; return okRecord("ft_transfer_call"); } });
    await runCommit(deps, round);
    expect(sent?.receiver_id).toBe("market.x");
    expect(sent?.amount).toBe("250000");
    const commit = (JSON.parse(sent?.msg ?? "{}") as { commit: { round_id: number; hash: string } }).commit;
    expect(commit.round_id).toBe(5);
    expect(commit.hash).toBe(bidHash(5, "grosir-1.x", 15_000n, "ab".repeat(16)));
  });

  it("skips (no salt, no tx) when the quote is above the ceiling", async () => {
    const { deps, log } = makeDeps({ quote: () => 17_000n });
    const rec = await runCommit(deps, round);
    expect(rec.status).toBe("skipped");
    expect(log).toEqual([]);
  });

  it("skips when the wallet cannot cover the bond", async () => {
    const { deps, log } = makeDeps({ walletBalance: async () => 10n });
    expect((await runCommit(deps, round)).status).toBe("skipped");
    expect(log).toEqual([]);
  });

  it("reuses an already-saved salt instead of generating a new one (crash recovery)", async () => {
    const { deps, store } = makeDeps({ newSalt: () => "ee".repeat(16) });
    store.push({ market: "market.x", round_id: 5, seller: "grosir-1.x", price: "14000", salt: "cd".repeat(16), saved_at: "t" });
    await runCommit(deps, round);
    expect(store).toHaveLength(1);
    expect(store[0]?.salt).toBe("cd".repeat(16));
  });
});

describe("runReveal", () => {
  it("reveals from the persisted salt", async () => {
    let args: unknown;
    const { deps, store } = makeDeps({ sendReveal: async (a) => { args = a; return okRecord("reveal_bid"); } });
    store.push({ market: "market.x", round_id: 5, seller: "grosir-1.x", price: "15000", salt: "ab".repeat(16), saved_at: "t" });
    await runReveal(deps, 5);
    expect(args).toEqual({ round_id: 5, unit_price: "15000", salt: "ab".repeat(16) });
  });

  it("skips if there is no saved salt", async () => {
    const { deps, log } = makeDeps();
    expect((await runReveal(deps, 5)).status).toBe("skipped");
    expect(log).toEqual([]);
  });

  it("grosir-5 never reveals even with a saved salt (forfeit path)", async () => {
    const { deps, log, store } = makeDeps({ short: "grosir-5", account: "grosir-5.x" });
    store.push({ market: "market.x", round_id: 5, seller: "grosir-5.x", price: "15000", salt: "ab".repeat(16), saved_at: "t" });
    const rec = await runReveal(deps, 5);
    expect(rec.status).toBe("skipped");
    expect(log).toEqual([]);
  });
});
