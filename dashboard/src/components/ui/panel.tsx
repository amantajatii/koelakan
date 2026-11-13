import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "./cn";

/** White card on the off-white canvas: 20px radius, no border, a barely-there shadow. Never nest one inside another. */
export function Panel({ className, ...rest }: HTMLAttributes<HTMLElement>) {
  return <section {...rest} className={cn("rounded-card bg-surface p-5 shadow-card sm:p-6", className)} />;
}

export function SectionTitle({ children, aside, className }: { children: ReactNode; aside?: ReactNode; className?: string }) {
  return (
    <div className={cn("mb-4 flex flex-wrap items-center justify-between gap-x-4 gap-y-1", className)}>
      <h2 className="text-lg font-bold tracking-[-0.01em]">{children}</h2>
      {aside}
    </div>
  );
}

/** Inline text link with the dashboard's quiet emphasis. */
export const linkClass = "font-semibold text-ink underline decoration-ink/25 underline-offset-4 transition-colors duration-150 hover:text-brand-ink hover:decoration-brand-ink";

export function Muted({ children, className }: { children: ReactNode; className?: string }) {
  return <p className={cn("text-sm text-muted", className)}>{children}</p>;
}
