import type { ReactNode } from "react";

export function Field({ id, label, hint, children }: { id: string; label: string; hint?: string; children: ReactNode }) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-semibold">{label}</label>
      {children}
      {hint && <p id={`${id}-hint`} className="mt-1.5 text-xs text-muted">{hint}</p>}
    </div>
  );
}

export const inputBase =
  "num min-h-11 rounded-xl border border-line-strong bg-surface px-3.5 text-base text-ink transition-[border-color,box-shadow] duration-150 hover:border-brand/50 focus-visible:border-brand focus-visible:outline-offset-0 aria-[invalid=true]:border-danger disabled:cursor-not-allowed disabled:bg-ground disabled:opacity-60";

export const inputClass = `${inputBase} w-full`;
