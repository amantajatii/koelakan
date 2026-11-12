import type { ButtonHTMLAttributes } from "react";
import { Loader } from "lucide-react";
import { cn } from "./cn";

export type ButtonVariant = "primary" | "secondary" | "soft" | "ghost" | "danger" | "onBrand";

const VARIANT: Record<ButtonVariant, string> = {
  primary: "bg-brand text-white shadow-[0_1px_2px_rgba(8,105,79,0.3)] hover:bg-brand-hover active:bg-brand-deep",
  secondary: "border border-line-strong bg-surface text-ink hover:border-brand/50 hover:bg-brand-soft active:bg-brand-soft",
  soft: "bg-brand-soft text-brand-ink hover:bg-[#d4eee4] active:bg-[#c6e8dc]",
  ghost: "text-muted hover:bg-brand-soft hover:text-ink",
  danger: "bg-danger text-white hover:bg-[#8f1c13] active:bg-[#7a170f]",
  onBrand: "bg-white text-brand-ink shadow-[0_1px_2px_rgba(0,0,0,0.12)] hover:bg-brand-soft active:bg-[#d4eee4]",
};

const BASE =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold transition-[background-color,border-color,color,box-shadow] duration-200 ease-out disabled:cursor-not-allowed disabled:opacity-50";

/** Class string for links that should look like buttons. */
export const buttonClass = (variant: ButtonVariant = "primary", className?: string): string => cn(BASE, VARIANT[variant], className);

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  busy?: boolean;
}

export function Button({ variant = "primary", busy = false, className, children, disabled, ...rest }: ButtonProps) {
  return (
    <button {...rest} disabled={disabled || busy} aria-busy={busy || undefined} className={buttonClass(variant, className)}>
      {busy && <Loader className="size-4 animate-spin" aria-hidden />}
      {children}
    </button>
  );
}
