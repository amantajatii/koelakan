import type { ReactNode } from "react";
import { CircleAlert, type LucideIcon, Inbox } from "lucide-react";
import { Button } from "./button";
import { cn } from "./cn";

export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cn("animate-pulse rounded-xl bg-line-strong/70", className)} />;
}

/** Placeholder block with an announced label, for a loading region built from skeletons. */
export function LoadingRegion({ label, className, children }: { label: string; className?: string; children: ReactNode }) {
  return (
    <div role="status" className={className}>
      <span className="sr-only">{label}</span>
      {children}
    </div>
  );
}

/** Empty states teach: say what belongs here and what to do next. */
export function EmptyState({ title, children, icon: Icon = Inbox, className }: { title: string; children?: ReactNode; icon?: LucideIcon; className?: string }) {
  return (
    <div className={cn("flex flex-col items-center px-6 py-10 text-center", className)}>
      <span aria-hidden className="mb-3 flex size-11 items-center justify-center rounded-full bg-brand-soft text-brand-ink"><Icon className="size-5" /></span>
      <p className="font-semibold">{title}</p>
      {children && <div className="mx-auto mt-1.5 max-w-md text-sm text-muted">{children}</div>}
    </div>
  );
}

export function ErrorNote({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-danger-soft p-4 text-sm text-ink ring-1 ring-inset ring-danger/20">
      <p className="flex max-w-xl items-start gap-2.5">
        <CircleAlert className="mt-0.5 size-4 shrink-0 text-danger" aria-hidden />
        <span>
          <strong className="font-semibold">Chain data could not be loaded.</strong> {message} Public nodes rate-limit requests, so try again in a moment.
        </span>
      </p>
      {onRetry && <Button variant="secondary" onClick={onRetry}>Try again</Button>}
    </div>
  );
}
