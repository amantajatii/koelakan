import { describe, expect, it } from "vitest";
import { buildTimeline, currentDeadlineMs, derivePhase } from "@/lib/phase";
import { makeRound, msAt } from "./fixtures";

describe("derivePhase", () => {
  const r = makeRound({ total_qty: 150 });
  it("is Join before the join deadline", () => expect(derivePhase(r, msAt(10))).toBe("Join"));
  it("switches to Commit exactly at the join deadline", () => {
    expect(derivePhase(r, msAt(119.999))).toBe("Join");
    expect(derivePhase(r, msAt(120))).toBe("Commit");
  });
  it("moves through Reveal and ReadyToSettle", () => {
    expect(derivePhase(r, msAt(180))).toBe("Reveal");
    expect(derivePhase(r, msAt(239))).toBe("Reveal");
    expect(derivePhase(r, msAt(240))).toBe("ReadyToSettle");
  });
  it("is doomed (ReadyToSettle) right after join when demand is below the minimum", () => {
    expect(derivePhase(makeRound({ total_qty: 40 }), msAt(121))).toBe("ReadyToSettle");
  });
  it("uses delivery deadline once settled", () => {
    const settled = makeRound({ state: "Settled" });
    expect(derivePhase(settled, msAt(300))).toBe("Delivery");
    expect(derivePhase(settled, msAt(360))).toBe("AwaitingFinalize");
  });
  it("keeps terminal states regardless of time", () => {
    expect(derivePhase(makeRound({ state: "Failed" }), msAt(1))).toBe("Failed");
    expect(derivePhase(makeRound({ state: "Closed" }), msAt(1))).toBe("Closed");
  });
});

describe("currentDeadlineMs", () => {
  it("returns the end of the live phase", () => {
    const r = makeRound({ total_qty: 150 });
    expect(currentDeadlineMs(r, msAt(5))).toBe(msAt(120));
    expect(currentDeadlineMs(r, msAt(130))).toBe(msAt(180));
    expect(currentDeadlineMs(r, msAt(200))).toBe(msAt(240));
  });
  it("returns null when nothing counts down", () => {
    expect(currentDeadlineMs(makeRound({ state: "Closed" }), msAt(1))).toBeNull();
  });
});

describe("buildTimeline", () => {
  it("marks earlier steps done and the live one current", () => {
    const steps = buildTimeline(makeRound({ total_qty: 150 }), msAt(130));
    expect(steps.map((s) => s.status)).toEqual(["done", "current", "upcoming", "upcoming", "upcoming"]);
  });
  it("skips delivery for a failed round", () => {
    const steps = buildTimeline(makeRound({ state: "Failed" }), msAt(500));
    expect(steps.at(-1)?.status).toBe("skipped");
    expect(steps[0]?.status).toBe("done");
  });
  it("marks everything done when closed", () => {
    expect(buildTimeline(makeRound({ state: "Closed" }), msAt(900)).every((s) => s.status === "done")).toBe(true);
  });
});
