import type { ReactNode } from "react";
import { cn } from "./cn";

export type Tone = "neutral" | "good" | "bad" | "warn" | "info";

const TONE: Record<Tone, string> = {
  neutral: "bg-ground text-muted",
  good: "bg-brand-soft text-brand-ink",
  bad: "bg-danger-soft text-danger",
  warn: "bg-warn-soft text-warn",
  info: "bg-info-soft text-info",
};
const DOT: Record<Tone, string> = {
  neutral: "bg-muted",
  good: "bg-brand-ink",
  bad: "bg-danger",
  warn: "bg-warn",
  info: "bg-info",
};

/** Small status word on a soft fill. Colour always comes with text; the dot is opt-in. */
export function Chip({ tone = "neutral", children, className, dot = false }: { tone?: Tone; children: ReactNode; className?: string; dot?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1 text-xs font-semibold", TONE[tone], className)}>
      {dot && <span aria-hidden className={cn("size-1.5 rounded-full", DOT[tone])} />}
      {children}
    </span>
  );
}
