"use client";

import { cn } from "./cn";

export interface TabOption<T extends string> {
  id: T;
  label: string;
  count?: number;
}

/** Segmented filter. Buttons with aria-pressed: the panel below changes in place, so this is a filter, not navigation. */
export function FilterTabs<T extends string>({ options, value, onChange, label }: { options: TabOption<T>[]; value: T; onChange: (id: T) => void; label: string }) {
  return (
    <div role="group" aria-label={label} className="inline-flex max-w-full gap-1 overflow-x-auto rounded-full bg-ground p-1">
      {options.map((o) => {
        const active = o.id === value;
        return (
          <button
            key={o.id}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(o.id)}
            className={cn(
              "inline-flex min-h-10 items-center gap-1.5 whitespace-nowrap rounded-full px-4 text-sm font-semibold transition-[background-color,color,box-shadow] duration-200 ease-out",
              active ? "bg-night font-bold text-white" : "text-muted hover:text-ink",
            )}
          >
            {o.label}
            {o.count !== undefined && <span className={cn("num rounded-full px-1.5 text-xs", active ? "bg-brand text-ink" : "bg-line")}>{o.count}</span>}
          </button>
        );
      })}
    </div>
  );
}
