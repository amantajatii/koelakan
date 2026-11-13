import type { Item, RoundView } from "./types";

export type ChatKind =
  | "announce"
  | "joined"
  | "settled"
  | "failed"
  | "bond_forfeited"
  | "delivering"
  | "owner_confirm"
  | "delivery_confirmed"
  | "auto_accepted"
  | "owner_dispute"
  | "disputed"
  | "dispute_resolved";

export interface ChatMessage {
  id: string;
  t: number;
  direction: "agent_to_owner" | "owner_to_agent";
  account: string;
  owner: string;
  kind: ChatKind;
  text: string;
}

const STEP_MS = 3_000;
export const LEAD_MS = 4_000;

/** Place the i-th event after `startMs`, never past `endMs`. */
export function slot(startMs: number, endMs: number, index: number): number {
  const wanted = startMs + LEAD_MS + index * STEP_MS;
  return Math.min(wanted, Math.max(startMs, endMs - 1_000));
}

export interface Ctx {
  round: RoundView;
  item: Item;
  opened: number;
  joinEnd: number;
  settleAt: number;
  deliveryEnd: number;
}
