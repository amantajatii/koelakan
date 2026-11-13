import type { ReactNode } from "react";

export function PageHeader({ title, children, actions }: { title: string; children?: ReactNode; actions?: ReactNode }) {
  return (
    <header className="mb-6 mt-2 flex flex-wrap items-end justify-between gap-x-6 gap-y-3 sm:mb-8">
      <div className="min-w-0 max-w-2xl">
        <h1 className="text-3xl font-bold tracking-[-0.025em] sm:text-4xl">{title}</h1>
        {children && <p className="mt-2 text-base text-muted">{children}</p>}
      </div>
      {actions}
    </header>
  );
}
