import type { ReactNode } from "react";
import { cn } from "./cn";

export type Tone = "neutral" | "good" | "bad" | "warn" | "info";

const TONE: Record<Tone, string> = {
  neutral: "border-ink-soft text-ink-soft",
  good: "border-pandan text-pandan bg-pandan-soft/50",
  bad: "border-chili text-chili bg-chili-soft/60",
  warn: "border-kunyit text-kunyit bg-kunyit-soft/60",
  info: "border-ledger text-ledger bg-cream",
};

/** Rubber-stamp style status label. */
export function Stamp({ tone = "neutral", children, className }: { tone?: Tone; children: ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center whitespace-nowrap rounded-sm border-2 px-2 py-0.5 text-[0.7rem] font-bold uppercase tracking-wider",
        TONE[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
