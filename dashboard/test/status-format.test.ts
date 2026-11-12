import { describe, expect, it } from "vitest";
import { cadenceLine, formatAgo, formatNear, formatNextOpen, isStale, statusBadge } from "@/lib/status-format";
import { STATUS } from "./agent-fixtures";

const T = Date.parse("2026-11-12T08:00:12.000Z");

describe("formatAgo", () => {
  it.each([[500, "just now"], [12_000, "12s ago"], [185_000, "3m ago"], [7_300_000, "2h ago"], [90_000_000, "1d ago"]])("%i ms", (ms, text) =>
    expect(formatAgo(ms)).toBe(text));
});

describe("formatNextOpen", () => {
  it("counts down, then reads any moment", () => {
    expect(formatNextOpen("2026-11-12T08:05:00.000Z", T)).toBe("in 04:48");
    expect(formatNextOpen("2026-11-12T08:00:00.000Z", T)).toBe("any moment");
    expect(formatNextOpen(null, T)).toBe("not scheduled");
  });
});

describe("statusBadge", () => {
  it("is offline without data", () => expect(statusBadge(null, T)).toMatchObject({ tone: "bad", label: "Agent offline" }));
  it("is online with tick age and next round", () => {
    expect(statusBadge(STATUS, T)).toEqual({ tone: "good", label: "Agent online", detail: "tick 12s ago · next round in 04:48" });
  });
  it("is delayed when the last tick is stale or missing", () => {
    expect(isStale(STATUS, T + 120_000)).toBe(true);
    expect(statusBadge(STATUS, T + 120_000).label).toBe("Agent delayed");
    expect(statusBadge({ ...STATUS, last_tick_at: null }, T).tone).toBe("warn");
  });
});

describe("misc formatting", () => {
  it("formats NEAR amounts", () => {
    expect(formatNear("0.25")).toBe("0.25 NEAR");
    expect(formatNear("1.5")).toBe("1.50 NEAR");
    expect(formatNear("0.0042")).toBe("0.0042 NEAR");
    expect(formatNear("n/a")).toBe("n/a");
  });
  it("summarises cadence", () => expect(cadenceLine(STATUS)).toBe("every 10 min"));
});
