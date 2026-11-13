import type { ButtonHTMLAttributes } from "react";
import { Loader } from "lucide-react";
import { cn } from "./cn";

export type ButtonVariant = "primary" | "secondary" | "soft" | "ghost" | "danger" | "onBrand";

const VARIANT: Record<ButtonVariant, string> = {
  primary: "bg-brand text-ink hover:bg-brand-hover active:translate-y-px",
  secondary: "border border-line-strong bg-surface text-ink hover:border-ink/30 hover:bg-ground active:translate-y-px",
  soft: "bg-brand-soft text-brand-ink hover:bg-brand/50 active:translate-y-px",
  ghost: "text-muted hover:bg-ground hover:text-ink",
  danger: "bg-danger text-white hover:bg-danger/90 active:translate-y-px",
  onBrand: "bg-white/10 text-white ring-1 ring-inset ring-white/25 hover:bg-white/15 active:translate-y-px",
};

const BASE =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-full px-5 text-sm font-semibold transition-[background-color,border-color,color,box-shadow,transform] duration-200 ease-out disabled:cursor-not-allowed disabled:opacity-50";

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
