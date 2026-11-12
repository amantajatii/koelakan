import { formatCountdown } from "@/lib/format";

/** `deadlineMs - nowMs` as a ticking mm:ss label with an accessible description. */
export function Countdown({ deadlineMs, nowMs }: { deadlineMs: number; nowMs: number }) {
  const left = deadlineMs - nowMs;
  return (
    <span className="num" title="Time left in this phase">
      <span className="sr-only">Time left </span>
      {formatCountdown(left)}
    </span>
  );
}
