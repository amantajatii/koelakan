import { cn } from "@/components/ui/cn";
import { Countdown } from "@/components/countdown";
import { formatDateTime } from "@/lib/format";
import { buildTimeline, PHASE_HINT, derivePhase, type StepStatus } from "@/lib/phase";
import type { RoundView } from "@/lib/types";

const MARK: Record<StepStatus, string> = {
  done: "bg-pandan border-pandan text-cream",
  current: "bg-kunyit border-ink text-ink",
  upcoming: "bg-cream border-rule text-ink-soft",
  skipped: "bg-cream border-rule text-rule line-through",
};
const MARK_TEXT: Record<StepStatus, string> = { done: "✓", current: "●", upcoming: "", skipped: "–" };
const STATUS_SR: Record<StepStatus, string> = { done: "selesai", current: "sedang berjalan", upcoming: "belum mulai", skipped: "dilewati" };

export function Timeline({ round, nowMs }: { round: RoundView; nowMs: number }) {
  const steps = buildTimeline(round, nowMs);
  const phase = derivePhase(round, nowMs);
  return (
    <div>
      <ol className="space-y-0">
        {steps.map((s, i) => (
          <li key={s.key} className="relative flex gap-3 pb-5 last:pb-0">
            {i < steps.length - 1 && <span aria-hidden className="absolute left-[0.8rem] top-7 h-[calc(100%-1.5rem)] w-0.5 bg-rule" />}
            <span aria-hidden className={cn("z-10 flex size-7 shrink-0 items-center justify-center rounded-full border-2 text-xs font-bold", MARK[s.status])}>
              {MARK_TEXT[s.status]}
            </span>
            <div className="min-w-0 flex-1">
              <p className={cn("font-semibold", s.status === "upcoming" && "text-ink-soft")}>
                {s.label} <span className="sr-only">({STATUS_SR[s.status]})</span>
              </p>
              <p className="num text-xs text-ink-soft">
                {s.key === "settle" ? "setelah " : "sampai "}
                {formatDateTime(s.deadlineMs)}
                {s.status === "current" && s.key !== "settle" && (
                  <> · sisa <Countdown deadlineMs={s.deadlineMs} nowMs={nowMs} /></>
                )}
              </p>
            </div>
          </li>
        ))}
      </ol>
      <p className="mt-4 rounded border-l-4 border-kunyit bg-kunyit-soft/50 px-3 py-2 text-sm">{PHASE_HINT[phase]}</p>
    </div>
  );
}
