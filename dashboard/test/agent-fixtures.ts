import type { AgentStatus, WarungRecord } from "@/lib/agent-types";

export const STATUS: AgentStatus = {
  ok: true,
  network: "testnet",
  market: "market.koelakan.testnet",
  service_public_key: "ed25519:6E8sCci9badyRkXb3JoRpBj5p8C6Tw41ELDZoiihKEtp",
  service_fc_allowance_near: "0.25",
  tick_secs: 15,
  last_tick_at: "2026-11-12T08:00:00.000Z",
  cadence: { round_every_min: 10, join_secs: 120, commit_secs: 60, reveal_secs: 60, delivery_secs: 120 },
  next_open_at: "2026-11-12T08:05:00.000Z",
  active_rounds: [{ id: 7, item: "beras-medium", phase: "Join" }],
  agents: {
    grosir: [{ account_id: "grosir-1.koelakan.testnet", near: "1.5", tidr_wallet: "900000", market_available: "120000", paused: false }],
    seeded_warungs: 20,
    delegated_warungs: 3,
  },
  budget: { est_near_per_day: "0.4", low_accounts: [] },
  recent_events: [{ at: "2026-11-12T07:59:00.000Z", kind: "round_opened", round_id: 7, account: null, message: "Opened round 7", tx: "abc123" }],
};

export const WARUNG: WarungRecord = {
  account_id: "owner.testnet",
  demand: { "beras-medium": 20 },
  registered_at: "2026-11-12T07:00:00.000Z",
  updated_at: "2026-11-12T07:30:00.000Z",
  delegated: true,
  auto_join: true,
  last_actions: [{ at: "2026-11-12T07:40:00.000Z", round_id: 6, action: "joined", qty: 20, reason: null, tx: "def456" }],
};

export function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}
