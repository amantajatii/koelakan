import { describe, expect, it } from "vitest";
import type { ActionRecord } from "../src/chain/recorder.js";
import { skipRecord } from "../src/chain/recorder.js";
import type { RoundView } from "../src/chain/views.js";
import { crossCheck } from "../src/crosscheck.js";
import { bidHash } from "../src/protocol.js";
import type { RoundRun } from "../src/round.js";
import { buildWa } from "../src/wa.js";

const NS = 1_000_000_000;
const OPENED = 1_000_000 * NS;
const SALT_A = "aa".repeat(16);
const W1 = "warung-01.x.testnet";
const W2 = "warung-02.x.testnet";
const G1 = "grosir-1.x.testnet";
const G2 = "grosir-2.x.testnet";
const G5 = "grosir-5.x.testnet";

const act = (actor: string, method: string, args: object = {}, events: ActionRecord["events"] = []): ActionRecord => ({
  ...skipRecord(actor, "t", method, ""), status: "ok", args, events, tx_hash: "H", timestamp: "2026-11-12T00:00:00.000Z",
});

/**
 * Ceiling 1000, 2 warungs (60 + 60 units), bond = ceil(5% x 1000 x 120) = 6000.
 * grosir-1 bids 900, grosir-2 bids 950, grosir-5 commits and never reveals.
 */
function makeRun(over: { clearing?: string } = {}): RoundRun {
  const bids: RoundView["bids"] = [
    { seller_id: G1, hash: bidHash(0, G1, 900n, SALT_A), bond: "6000", bond_held: "0", revealed_price: "900", valid: true },
    { seller_id: G2, hash: bidHash(0, G2, 950n, SALT_A), bond: "6000", bond_held: "0", revealed_price: "950", valid: true },
    { seller_id: G5, hash: "f".repeat(64), bond: "6000", bond_held: "0", revealed_price: null, valid: false },
  ];
  const roundAfter = {
    id: 9, item: "beras-medium", ref_price: "1200", ceiling_price: "1000", min_total_qty: 100, total_qty: 120,
    opener: "k.x", opened_at: OPENED, join_deadline: OPENED + 90 * NS, commit_deadline: OPENED + 150 * NS,
    reveal_deadline: OPENED + 210 * NS, delivery_deadline: OPENED + 270 * NS, arbiter_deadline: OPENED + 330 * NS,
    state: "Closed", participants: [
      { account_id: W1, qty: 60, week: 0, held: "0", delivery: "Confirmed" },
      { account_id: W2, qty: 60, week: 0, held: "0", delivery: "Accepted" },
    ], bids, winner: 0, clearing_price: over.clearing ?? "900", phase: "Closed", saving: String(300 * 120),
  } as RoundView;
  const zero = { available: "0", held: "0" };
  const before = { [W1]: { available: "900000", held: "0" }, [W2]: { available: "900000", held: "0" },
    [G1]: zero, [G2]: zero, [G5]: zero };
  // Chain result (computed by hand): each warung locked 60k, got refund 60 x 100 = 6000 back at settle;
  // warung-01 confirmed (54000 -> grosir-1), warung-02 stayed silent (54000 -> grosir-1 at finalize).
  // grosir-5 bond 6000 forfeited, split 3000 / 3000 to buyers. grosir-1 and grosir-2 get bonds back.
  const after = {
    [W1]: { available: String(900000 - 60000 + 6000 + 3000), held: "0" },
    [W2]: { available: String(900000 - 60000 + 6000 + 3000), held: "0" },
    [G1]: { available: String(54000 * 2 + 6000), held: "0" },
    [G2]: { available: "6000", held: "0" },
    [G5]: zero,
  };
  return {
    roundId: 9, params: { item: "beras-medium", joinSecs: 90, commitSecs: 60, revealSecs: 60, deliverySecs: 60, minTotalQty: 100 },
    item: { id: "beras-medium", name: "Beras medium (tipe II)", unit: "kg", ref_price: "1200", het: "1000", source: "PIHPS", as_of: "2026-11-11" },
    startedAt: "", finishedAt: "", roundBefore: { ...roundAfter, participants: [], bids: [], total_qty: 0, state: "Active", phase: "Join", winner: null, clearing_price: null, saving: null } as RoundView,
    roundAfter, balancesBefore: before, balancesAfter: after, silentWarung: W2,
    actions: [
      act(W1, "join_round"), act(W2, "join_round"),
      act(G1, "reveal_bid", { unit_price: "900", salt: SALT_A }),
      act(G2, "reveal_bid", { unit_price: "950", salt: SALT_A }),
      act(W1, "confirm_delivery", {}, [{ event: "delivery_confirmed", data: { paid: "54000" } }]),
      act("k.x", "settle"), act("k.x", "finalize"),
    ],
  };
}

describe("crossCheck", () => {
  it("reports MATCH when the chain agrees with the sim engine replay", () => {
    const r = crossCheck(makeRun());
    expect(r.error).toBeNull();
    expect(r.mismatches).toEqual([]);
    expect(r.status).toBe("MATCH");
    expect(r.checks.length).toBeGreaterThan(10);
  });

  it("reports MISMATCH with details when the chain's clearing price differs", () => {
    const r = crossCheck(makeRun({ clearing: "950" }));
    expect(r.status).toBe("MISMATCH");
    expect(r.mismatches.map((m) => m.name)).toContain("clearing_price");
  });

  it("reports MISMATCH when a balance delta differs", () => {
    const run = makeRun();
    const tampered = { ...run, balancesAfter: { ...run.balancesAfter, [G2]: { available: "5999", held: "0" } } };
    const r = crossCheck(tampered);
    expect(r.status).toBe("MISMATCH");
    expect(r.mismatches.some((m) => m.name.includes(G2))).toBe(true);
  });
});

describe("buildWa", () => {
  it("writes English WhatsApp messages addressed to owners", () => {
    const wa = buildWa(makeRun());
    const join = wa.find((m) => m.kind === "joined" && m.account === W1);
    expect(join?.text).toBe("Pak Budi, you're in round #9 with 60 kg of Medium rice (type II), max price Rp1,000/kg.");
    expect(wa.some((m) => m.kind === "settled" && m.text.includes("Rp900/kg") && m.text.includes("Rp6,000"))).toBe(true);
    expect(wa.some((m) => m.kind === "bond_forfeited" && m.text.includes("grosir-5") && m.text.includes("Rp3,000"))).toBe(true);
    expect(wa.some((m) => m.kind === "owner_confirm" && m.direction === "owner_to_agent")).toBe(true);
    expect(wa.some((m) => m.kind === "auto_accepted" && m.account === W2)).toBe(true);
  });
});
