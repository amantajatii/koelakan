import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "./cn";

/** White card: 20px radius, hairline border, soft shadow. Never nest one inside another. */
export function Panel({ className, ...rest }: HTMLAttributes<HTMLElement>) {
  return <section {...rest} className={cn("rounded-card border border-line bg-surface p-5 shadow-card sm:p-6", className)} />;
}

export function SectionTitle({ children, aside, className }: { children: ReactNode; aside?: ReactNode; className?: string }) {
  return (
    <div className={cn("mb-4 flex flex-wrap items-center justify-between gap-x-4 gap-y-1", className)}>
      <h2 className="text-lg font-bold tracking-tight">{children}</h2>
      {aside}
    </div>
  );
}

/** Inline text link with the dashboard's quiet emphasis. */
export const linkClass = "font-semibold text-brand-ink underline decoration-brand/30 underline-offset-4 transition-colors duration-150 hover:text-brand hover:decoration-brand";

export function Muted({ children, className }: { children: ReactNode; className?: string }) {
  return <p className={cn("text-sm text-muted", className)}>{children}</p>;
}
