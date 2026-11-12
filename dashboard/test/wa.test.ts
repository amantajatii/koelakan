import { describe, expect, it } from "vitest";
import { buildRoundChat, filterByAccount, slot } from "@/lib/wa";
import { BERAS, closedRound, makeRound, msAt } from "./fixtures";

describe("slot", () => {
  it("places events after the start but never past the end", () => {
    expect(slot(1000, 100_000, 2)).toBe(1000 + 4000 + 2 * 3000);
    expect(slot(1000, 3000, 50)).toBe(2000);
  });
});

describe("buildRoundChat", () => {
  const chat = buildRoundChat(closedRound(), BERAS);
  const first = filterByAccount(chat, "warung-01.koelakan.testnet");

  it("is deterministic", () => expect(buildRoundChat(closedRound(), BERAS)).toEqual(chat));
  it("sorts messages by time", () => {
    for (let i = 1; i < chat.length; i++) expect(chat[i]!.t).toBeGreaterThanOrEqual(chat[i - 1]!.t);
  });
  it("tells the owner about the ceiling and the join", () => {
    const kinds = first.map((m) => m.kind);
    expect(kinds).toContain("announce");
    expect(kinds).toContain("joined");
    expect(first.find((m) => m.kind === "joined")?.text).toBe(
      "Pak Budi, Beras medium (tipe II) 10 kg sudah dipesan lewat ronde #1, harga maks Rp16.650/kg. Saldo Rp166.500 dikunci sampai ronde selesai.",
    );
  });
  it("reports the clearing result with saving and refund of the difference", () => {
    const settled = first.find((m) => m.kind === "settled")!;
    expect(settled.text).toContain("grosir-1 menang dengan harga Rp12.000/kg");
    expect(settled.text).toContain("hemat Rp4.650/kg dari harga pasar PIHPS Rp16.650");
    expect(settled.text).toContain("Selisih Rp46.500 sudah kembali");
  });
  it("splits the forfeited bond pro rata (Rp1.000 over 10 and 30 kg)", () => {
    expect(first.find((m) => m.kind === "bond_forfeited")?.text).toContain("Bagian Anda Rp250 masuk saldo");
    const second = filterByAccount(chat, "warung-02.koelakan.testnet");
    expect(second.find((m) => m.kind === "bond_forfeited")?.text).toContain("grosir-5");
    expect(second.find((m) => m.kind === "bond_forfeited")?.text).toContain("Rp750");
  });
  it("renders a confirmed delivery as an owner reply plus an agent receipt", () => {
    const owner = first.find((m) => m.kind === "owner_confirm");
    expect(owner?.direction).toBe("owner_to_agent");
    expect(first.find((m) => m.kind === "delivery_confirmed")?.text).toContain("Rp120.000 diteruskan ke grosir-1");
  });
  it("renders silence as an automatic acceptance after the delivery deadline", () => {
    const auto = filterByAccount(chat, "warung-02.koelakan.testnet").find((m) => m.kind === "auto_accepted")!;
    expect(auto.t).toBeGreaterThan(msAt(360));
  });
});

describe("buildRoundChat for other states", () => {
  it("only announces and confirms joins while the round is active", () => {
    const kinds = new Set(buildRoundChat(makeRound(), BERAS).map((m) => m.kind));
    expect([...kinds].sort()).toEqual(["announce", "joined"]);
  });
  it("tells every buyer a failed round refunded everything", () => {
    const chat = buildRoundChat(makeRound({ state: "Failed", phase: "Failed" }), BERAS);
    expect(chat.filter((m) => m.kind === "failed")).toHaveLength(2);
    expect(chat.find((m) => m.kind === "failed")?.text).toContain("Seluruh saldo dikembalikan");
  });
  it("shows disputes and their resolution", () => {
    const base = closedRound();
    const round = {
      ...base,
      participants: [
        { ...base.participants[0]!, delivery: "Disputed" as const },
        { ...base.participants[1]!, delivery: { Resolved: { refunded: true } } },
      ],
    };
    const kinds = buildRoundChat(round, BERAS).map((m) => m.kind);
    expect(kinds).toContain("owner_dispute");
    expect(kinds).toContain("disputed");
    expect(kinds).toContain("dispute_resolved");
  });
  it("filters by account", () => {
    expect(filterByAccount(buildRoundChat(closedRound(), BERAS), null).length).toBeGreaterThan(
      filterByAccount(buildRoundChat(closedRound(), BERAS), "warung-01.koelakan.testnet").length,
    );
  });
});
