import { Check, Minus } from "lucide-react";
import { Countdown } from "@/components/countdown";
import { cn } from "@/components/ui/cn";
import { formatDateTime } from "@/lib/format";
import { buildTimeline, PHASE_HINT, derivePhase, type StepStatus } from "@/lib/phase";
import type { RoundView } from "@/lib/types";

const STATUS_SR: Record<StepStatus, string> = { done: "done", current: "in progress", upcoming: "not started", skipped: "skipped" };

function Node({ status }: { status: StepStatus }) {
  return (
    <span
      aria-hidden
      className={cn(
        "relative z-10 flex size-8 shrink-0 items-center justify-center rounded-full ring-4 ring-surface transition-colors duration-200",
        status === "done" && "bg-night text-white",
        status === "current" && "bg-brand text-ink outline outline-2 outline-offset-0 outline-night",
        status === "upcoming" && "bg-ground text-muted outline outline-1 outline-line-strong",
        status === "skipped" && "bg-ground text-muted",
      )}
    >
      {status === "done" && <Check className="size-4" strokeWidth={3} />}
      {status === "current" && <span className="live-dot size-2.5 rounded-full bg-night" />}
      {status === "skipped" && <Minus className="size-4" />}
    </span>
  );
}

/** Horizontal stepper from md up, vertical below. */
export function Timeline({ round, nowMs }: { round: RoundView; nowMs: number }) {
  const steps = buildTimeline(round, nowMs);
  const phase = derivePhase(round, nowMs);
  return (
    <div>
      <ol className="grid gap-5 md:grid-flow-col md:auto-cols-fr md:gap-3">
        {steps.map((s, i) => (
          <li key={s.key} className="relative flex gap-3 md:block">
            {i < steps.length - 1 && (
              <>
                <span aria-hidden className={cn("absolute left-4 top-8 h-[calc(100%-0.5rem)] w-0.5 md:hidden", s.status === "done" ? "bg-night" : "bg-line-strong")} />
                <span aria-hidden className={cn("absolute left-8 top-4 hidden h-0.5 w-[calc(100%-1rem)] md:block", s.status === "done" ? "bg-night" : "bg-line-strong")} />
              </>
            )}
            <Node status={s.status} />
            <div className="min-w-0 md:mt-3">
              <p className={cn("text-sm font-bold", s.status === "upcoming" && "text-muted", s.status === "skipped" && "text-muted line-through")}>
                {s.label} <span className="sr-only">({STATUS_SR[s.status]})</span>
              </p>
              <p className="num mt-0.5 text-xs text-muted">
                {s.key === "settle" ? "after " : "until "}
                {formatDateTime(s.deadlineMs)}
                {s.status === "current" && s.key !== "settle" && (
                  <> · <span className="font-semibold text-brand-ink"><Countdown deadlineMs={s.deadlineMs} nowMs={nowMs} /></span></>
                )}
              </p>
            </div>
          </li>
        ))}
      </ol>
      <p className="mt-6 rounded-2xl bg-ground px-4 py-3 text-sm text-muted">{PHASE_HINT[phase]}</p>
    </div>
  );
}
