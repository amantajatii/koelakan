import type { ReactNode } from "react";
import { cn } from "./cn";

/** Horizontal-scroll wrapper so wide tables never push the page sideways. */
export function TableWrap({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("-mx-5 overflow-x-auto px-5 sm:-mx-6 sm:px-6", className)}>{children}</div>;
}

export const tableClass = "w-full text-left text-sm";
export const theadClass = "text-xs font-semibold text-muted";
export const th = "whitespace-nowrap border-b border-line py-2.5 pr-4 font-semibold last:pr-0";
export const thRight = `${th} text-right`;
export const trClass = "border-b border-line last:border-0 transition-colors duration-150 hover:bg-ground/70";
export const td = "py-3 pr-4 align-middle last:pr-0";
export const tdRight = `${td} text-right num`;

/** Label and value pairs for one stacked phone row, so no column is ever cut off. */
export function Facts({ items }: { items: readonly (readonly [label: string, value: ReactNode])[] }) {
  return (
    <dl className="num grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
      {items.map(([label, value]) => (
        <div key={label} className="flex flex-col gap-0.5">
          <dt className="text-xs text-muted">{label}</dt>
          <dd className="font-semibold">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

/** Stacked rows for phones, paired with a `hidden sm:block` TableWrap. */
export const stackedList = "divide-y divide-line sm:hidden";
export const stackedRow = "space-y-1.5 py-3 first:pt-0 last:pb-0";
