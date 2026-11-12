/** Response shapes of the Koelakan agent service (fixed contract). */

export interface AgentHealth {
  ok: true;
  version: string;
  uptime_s: number;
}

export interface Cadence {
  round_every_min: number;
  join_secs: number;
  commit_secs: number;
  reveal_secs: number;
  delivery_secs: number;
}

export interface ActiveRound {
  id: number;
  item: string;
  phase: string;
}

export interface GrosirAgent {
  account_id: string;
  near: string;
  tidr_wallet: string;
  market_available: string;
  paused: boolean;
}

export interface ServiceEvent {
  at: string;
  kind: string;
  round_id: number | null;
  account: string | null;
  message: string;
  tx: string | null;
}

export interface AgentStatus {
  ok: true;
  network: string;
  market: string;
  service_public_key: string;
  service_fc_allowance_near: string;
  tick_secs: number;
  last_tick_at: string | null;
  cadence: Cadence;
  next_open_at: string | null;
  active_rounds: ActiveRound[];
  agents: { grosir: GrosirAgent[]; seeded_warungs: number; delegated_warungs: number };
  budget: { est_near_per_day: string; low_accounts: string[] };
  recent_events: ServiceEvent[];
}

export interface WarungAction {
  at: string;
  round_id: number;
  action: "joined" | "skipped";
  qty: number | null;
  reason: string | null;
  tx: string | null;
}

export interface WarungRecord {
  account_id: string;
  demand: Record<string, number>;
  registered_at: string;
  updated_at: string;
  delegated: boolean;
  auto_join: boolean | null;
  last_actions: WarungAction[];
}

export interface DemandSubmission {
  account_id: string;
  public_key: string;
  signature: string;
  nonce: string;
  recipient: string;
  message: string;
}
