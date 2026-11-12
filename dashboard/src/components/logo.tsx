import { ShoppingBasket } from "lucide-react";

export function LogoMark({ className = "size-10" }: { className?: string }) {
  return (
    <span aria-hidden className={`inline-flex shrink-0 items-center justify-center rounded-xl bg-brand text-white shadow-[0_2px_6px_rgba(8,105,79,0.35)] ${className}`}>
      <ShoppingBasket className="size-[55%]" strokeWidth={2} />
    </span>
  );
}
