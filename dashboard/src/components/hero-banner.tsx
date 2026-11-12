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

/** Full-width emerald banner: white text on the left, produce illustration on the right. The page's h1. */
export function HeroBanner({ title, children, actions, className }: Props) {
  return (
    <section
      className={cn(
        "relative isolate overflow-hidden rounded-card bg-brand-deep p-6 text-white shadow-card sm:min-h-[17rem] sm:p-9",
        "bg-[radial-gradient(34rem_20rem_at_85%_-10%,rgba(255,255,255,0.16),transparent_65%),radial-gradient(26rem_18rem_at_0%_120%,rgba(0,0,0,0.22),transparent_70%)]",
        className,
      )}
    >
      <div className="relative z-10 max-w-xl lg:max-w-[50%]">
        <h1 className="text-3xl font-extrabold leading-[1.08] tracking-[-0.02em] sm:text-4xl">{title}</h1>
        {children && <div className="mt-3 text-base text-[#eaf8f2]">{children}</div>}
        {actions && <div className="mt-6 flex flex-wrap gap-3">{actions}</div>}
      </div>
      <HeroArt className="pointer-events-none absolute inset-y-0 right-0 hidden w-[44%] sm:block" />
    </section>
  );
}

export function BannerLine({ loading, children }: { loading: boolean; children: ReactNode }) {
  return loading ? <Skeleton className="h-12 max-w-md bg-white/20" /> : <p>{children}</p>;
}
