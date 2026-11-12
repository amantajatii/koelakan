import type { AgentStatus } from "./agent-types";
import { formatCountdown } from "./format";

export type BadgeTone = "good" | "warn" | "bad" | "neutral";

export interface StatusBadge {
  tone: BadgeTone;
  label: string;
  /** Extra detail like "tick 12s ago · next round in 03:20". Empty when offline. */
  detail: string;
}

/** "12s ago", "3m ago", "2h ago", "1d ago". Future or tiny values read "just now". */
export function formatAgo(ms: number): string {
  const s = Math.floor(ms / 1000);
  if (s < 2) return "just now";
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  return h < 24 ? `${h}h ago` : `${Math.floor(h / 24)}d ago`;
}

/** "in 03:20" until the next round opens, "any moment" once the time has passed. */
export function formatNextOpen(nextOpenAt: string | null, nowMs: number): string {
  if (!nextOpenAt) return "not scheduled";
  const diff = Date.parse(nextOpenAt) - nowMs;
  return diff <= 0 ? "any moment" : `in ${formatCountdown(diff)}`;
}

/** A tick older than three intervals (min 60 s) means the loop is stuck even though HTTP answers. */
export function isStale(status: AgentStatus, nowMs: number): boolean {
  if (!status.last_tick_at) return true;
  return nowMs - Date.parse(status.last_tick_at) > Math.max(status.tick_secs * 3, 60) * 1000;
}

export function statusBadge(status: AgentStatus | null, nowMs: number): StatusBadge {
  if (!status) return { tone: "bad", label: "Agent offline", detail: "" };
  const tick = status.last_tick_at ? `tick ${formatAgo(nowMs - Date.parse(status.last_tick_at))}` : "no tick yet";
  const next = `next round ${formatNextOpen(status.next_open_at, nowMs)}`;
  if (isStale(status, nowMs)) return { tone: "warn", label: "Agent delayed", detail: `${tick}` };
  return { tone: "good", label: "Agent online", detail: `${tick} · ${next}` };
}

/** `0.2500` -> `0.25 NEAR`; tiny values keep more digits. Unparseable text is shown as sent. */
export function formatNear(value: string): string {
  const n = Number(value);
  if (!Number.isFinite(n)) return value;
  return `${n >= 0.01 || n === 0 ? n.toFixed(2) : n.toPrecision(2)} NEAR`;
}

export function cadenceLine(status: AgentStatus): string {
  return `every ${status.cadence.round_every_min} min`;
}
