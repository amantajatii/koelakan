import type { ReactNode } from "react";
import { HeroArt } from "@/components/produce-art";
import { Skeleton } from "@/components/ui/states";
import { cn } from "@/components/ui/cn";

interface Props {
  title: string;
  children?: ReactNode;
  actions?: ReactNode;
  className?: string;
}

/** Navy banner card: white text and lime actions on the left, produce illustration on the right. The page's h1. */
export function HeroBanner({ title, children, actions, className }: Props) {
  return (
    <section
      className={cn(
        "on-dark relative isolate overflow-hidden rounded-card bg-night p-6 text-white sm:min-h-[16rem] sm:p-8",
        className,
      )}
    >
      <div className="relative z-10 max-w-xl lg:max-w-[50%]">
        <h1 className="text-3xl font-bold leading-[1.1] tracking-[-0.025em] sm:text-4xl">{title}</h1>
        {children && <div className="mt-3 text-base text-[#d4d4de]">{children}</div>}
        {actions && <div className="mt-6 flex flex-wrap gap-3">{actions}</div>}
      </div>
      <HeroArt className="pointer-events-none absolute inset-y-0 right-0 hidden w-[44%] sm:block" />
    </section>
  );
}

export function BannerLine({ loading, children }: { loading: boolean; children: ReactNode }) {
  return loading ? <Skeleton className="h-12 max-w-md bg-white/15" /> : <p>{children}</p>;
}
