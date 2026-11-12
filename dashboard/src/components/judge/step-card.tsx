import type { ReactNode } from "react";
import { cn } from "@/components/ui/cn";
import { Stamp, type Tone } from "@/components/ui/stamp";
import type { CallResult } from "@/lib/wallet";
import { txUrl } from "@/lib/config";

export type StepState = "done" | "ready" | "locked" | "optional";

const BADGE: Record<StepState, { text: string; tone: Tone }> = {
  done: { text: "Done", tone: "good" },
  ready: { text: "Ready", tone: "warn" },
  locked: { text: "Locked", tone: "neutral" },
  optional: { text: "Optional", tone: "info" },
};

interface StepCardProps {
  index: string;
  title: string;
  state: StepState;
  intro: ReactNode;
  children?: ReactNode;
}

export function StepCard({ index, title, state, intro, children }: StepCardProps) {
  const badge = BADGE[state];
  return (
    <section
      aria-labelledby={`step-${index}`}
      className={cn(
        "rounded-lg border-2 border-ink/80 bg-cream p-4 sm:p-5",
        state === "locked" && "border-dashed border-rule bg-cream/60",
        state === "ready" && "shadow-[3px_3px_0_0_rgba(42,33,24,0.85)]",
      )}
    >
      <header className="flex items-start gap-3">
        <span aria-hidden className={cn("flex size-9 shrink-0 items-center justify-center rounded-full border-2 border-ink font-display text-lg font-bold", state === "done" ? "bg-pandan text-cream" : "bg-kunyit-soft")}>
          {state === "done" ? "✓" : index}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 id={`step-${index}`} className="font-display text-xl font-semibold">{title}</h3>
            <Stamp tone={badge.tone}>{badge.text}</Stamp>
          </div>
          <div className="mt-1 text-sm text-ink-soft">{intro}</div>
        </div>
      </header>
      {children && <div className="mt-4 space-y-3 sm:pl-12">{children}</div>}
    </section>
  );
}

/** Success or failure line under a step's action, with a link to the transaction when known. */
export function TxResult({ result }: { result: CallResult | null }) {
  if (!result) return null;
  return (
    <p role="status" className={cn("rounded-md border-2 px-3 py-2 text-sm", result.ok ? "border-pandan bg-pandan-soft/60" : "border-chili bg-chili-soft/60")}>
      {result.ok ? "Transaction succeeded." : result.error ?? "Transaction failed."}{" "}
      {result.hash && (
        <a className="num underline underline-offset-4" target="_blank" rel="noreferrer" href={txUrl(result.hash)}>
          view on nearblocks
        </a>
      )}
    </p>
  );
}

export function Field({ id, label, hint, children }: { id: string; label: string; hint?: string; children: ReactNode }) {
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-sm font-semibold">{label}</label>
      {children}
      {hint && <p id={`${id}-hint`} className="mt-1 text-xs text-ink-soft">{hint}</p>}
    </div>
  );
}

export const inputClass =
  "num min-h-11 w-full rounded-md border-2 border-ink bg-white/70 px-3 text-base focus-visible:outline-offset-0";
