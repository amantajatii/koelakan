import type { ReactNode } from "react";
import { cn } from "./cn";

export type Tone = "neutral" | "good" | "bad" | "warn" | "info";

const TONE: Record<Tone, string> = {
  neutral: "bg-ground text-muted ring-line-strong",
  good: "bg-brand-soft text-brand-ink ring-brand/20",
  bad: "bg-danger-soft text-danger ring-danger/20",
  warn: "bg-warn-soft text-warn ring-warn/20",
  info: "bg-info-soft text-info ring-info/20",
};
const DOT: Record<Tone, string> = {
  neutral: "bg-muted",
  good: "bg-brand",
  bad: "bg-danger",
  warn: "bg-warn",
  info: "bg-info",
};

/** Small status word with a state dot. Colour always comes with text. */
export function Chip({ tone = "neutral", children, className, dot = true }: { tone?: Tone; children: ReactNode; className?: string; dot?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset", TONE[tone], className)}>
      {dot && <span aria-hidden className={cn("size-1.5 rounded-full", DOT[tone])} />}
      {children}
    </span>
  );
}
