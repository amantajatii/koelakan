import { cn } from "@/components/ui/cn";

/** Path data for the mark, shared with app/icon.svg and the OG image: a lime price tag with a navy arrow pointing down (prices below the market). */
export const MARK_TAG_PATH = "M32 9.5 L43 20.5 V47 Q43 50.5 39.5 50.5 H24.5 Q21 50.5 21 47 V20.5 Z";
export const MARK_ARROW_PATH = "M25.9 26 H31.1 V34.2 H35.8 L28.5 42.8 L21.2 34.2 H25.9 Z";

/**
 * Koelakan mark on a navy tile. `onDark` lifts the tile one step so it still reads on the navy sidebar.
 */
export function LogoMark({ className = "size-10", onDark = false }: { className?: string; onDark?: boolean }) {
  return (
    <svg viewBox="0 0 64 64" aria-hidden className={cn("shrink-0", className)}>
      <rect width="64" height="64" rx="16" className={onDark ? "fill-night-raised" : "fill-night"} />
      <g transform="rotate(45 32 32)">
        <path d={MARK_TAG_PATH} className="fill-brand stroke-brand" strokeWidth="2.5" strokeLinejoin="round" />
        <circle cx="32" cy="19.5" r="3" className={onDark ? "fill-night-raised" : "fill-night"} />
      </g>
      <path d={MARK_ARROW_PATH} className={onDark ? "fill-night-raised stroke-night-raised" : "fill-night stroke-night"} strokeWidth="1" strokeLinejoin="round" />
    </svg>
  );
}
