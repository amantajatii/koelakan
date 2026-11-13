import { percent, rupiah } from "@/lib/format";
import { cn } from "@/components/ui/cn";

interface Props {
  refPrice: bigint | string;
  /** Price actually paid or cleared; null while nothing has settled. */
  paid: bigint | string | null;
  unit: string;
  /** Text colour for the struck-through reference price (item ink on pastel, muted on white). */
  refClass?: string;
  size?: "md" | "lg";
  /** Track colour behind the bar. */
  trackClass?: string;
}

/** Percentage the paid price sits below the reference price (0-100); null when not computable. */
export function percentBelow(refPrice: bigint | string, paid: bigint | string | null): number | null {
  if (paid === null) return null;
  const ref = Number(refPrice);
  return ref === 0 ? null : ((ref - Number(paid)) / ref) * 100;
}

/** Signature of the dashboard: PIHPS struck through, price paid in emerald, thin bar of the % below PIHPS. */
export function SavingsStrip({ refPrice, paid, unit, refClass = "text-muted", size = "md", trackClass = "bg-white/70" }: Props) {
  const below = percentBelow(refPrice, paid);
  const large = size === "lg";
  if (paid === null || below === null) {
    return (
      <div>
        <p className="flex flex-col gap-0.5">
          <span className={cn("text-xs font-medium", refClass)}>PIHPS price</span>
          <span className={cn("num font-bold", large ? "text-2xl" : "text-lg", refClass)}>{rupiah(refPrice)}<span className="text-xs font-medium">/{unit}</span></span>
        </p>
        <div className={cn("mt-2 h-1.5 rounded-full", trackClass)} aria-hidden />
        <p className="mt-1.5 text-xs text-muted">Nothing cleared yet. The first settled round shows the saving here.</p>
      </div>
    );
  }
  const width = Math.min(100, Math.max(2, below));
  return (
    <div>
      <p className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
        <span className={cn("num line-through decoration-1", large ? "text-base" : "text-sm", refClass)}>
          <span className="sr-only">PIHPS price </span>{rupiah(refPrice)}
        </span>
        <span className={cn("num font-extrabold text-brand-ink", large ? "text-4xl" : "text-xl")}>
          <span className="sr-only">Paid </span>{rupiah(paid)}<span className="text-xs font-semibold">/{unit}</span>
        </span>
      </p>
      <div
        role="img"
        aria-label={`${percent(below)} below the PIHPS price`}
        className={cn("mt-2 overflow-hidden rounded-full", large ? "h-2.5" : "h-1.5", trackClass)}
      >
        <div className="h-full rounded-full bg-ink transition-[width] duration-500 ease-out" style={{ width: `${width}%` }} />
      </div>
      <p className="num mt-1.5 text-xs font-semibold text-brand-ink">{percent(below)} below PIHPS</p>
    </div>
  );
}
