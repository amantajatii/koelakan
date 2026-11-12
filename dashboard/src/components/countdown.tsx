import { formatCountdown } from "@/lib/format";

/** `deadlineMs - nowMs` as a ticking mm:ss label with an accessible description. */
export function Countdown({ deadlineMs, nowMs }: { deadlineMs: number; nowMs: number }) {
  const left = deadlineMs - nowMs;
  return (
    <span className="num" title="Sisa waktu fase ini">
      <span className="sr-only">Sisa waktu </span>
      {formatCountdown(left)}
    </span>
  );
}
