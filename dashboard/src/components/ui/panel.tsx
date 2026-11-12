import type { HTMLAttributes } from "react";
import { cn } from "./cn";

export function Panel({ className, ...rest }: HTMLAttributes<HTMLElement>) {
  return <section {...rest} className={cn("rounded-lg border-2 border-ink/80 bg-cream p-4 shadow-[3px_3px_0_0_rgba(42,33,24,0.85)] sm:p-6", className)} />;
}

export function SectionTitle({ children, aside }: { children: React.ReactNode; aside?: React.ReactNode }) {
  return (
    <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
      <h2 className="font-display text-2xl font-semibold tracking-tight">{children}</h2>
      {aside}
    </div>
  );
}
