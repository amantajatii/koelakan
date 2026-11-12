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
