import type { ReactNode } from "react";
import { ChevronDown } from "lucide-react";

/** Collapsed technical truth for judges and curious owners; the plain-language text stays above it. */
export function TechNote({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <details className={`group rounded-xl bg-ground/80 px-3.5 text-sm ${className}`}>
      <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-2 font-semibold text-muted transition-colors hover:text-ink">
        How this works on-chain
        <ChevronDown className="size-4 shrink-0 transition-transform duration-200 group-open:rotate-180" aria-hidden />
      </summary>
      <div className="space-y-2 pb-3.5 text-muted">{children}</div>
    </details>
  );
}

export const codeClass = "font-mono text-xs text-ink";
