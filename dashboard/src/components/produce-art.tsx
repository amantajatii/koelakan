"use client";

import { useCallback, useState, type ReactNode } from "react";
import { cn } from "@/components/ui/cn";
import { itemTheme } from "@/lib/item-theme";

/**
 * Shows the image when the file exists and `fallback` otherwise, so dropping a PNG into
 * `public/produce/` needs no code change. The image sits on top and fades in only after it decoded.
 */
function ProduceImage({ src, fallback, className }: { src: string | null; fallback: ReactNode; className?: string }) {
  const [state, setState] = useState<"loading" | "ok" | "missing">(src ? "loading" : "missing");
  // The image may finish (or fail) before hydration attaches onLoad/onError.
  const ref = useCallback((img: HTMLImageElement | null) => {
    if (img?.complete) setState(img.naturalWidth > 0 ? "ok" : "missing");
  }, []);
  return (
    <>
      {state !== "ok" && fallback}
      {src && state !== "missing" && (
        // eslint-disable-next-line @next/next/no-img-element -- optional asset, plain img lets a missing file degrade silently
        <img
          ref={ref}
          src={src}
          alt=""
          onLoad={() => setState("ok")}
          onError={() => setState("missing")}
          className={cn("absolute inset-0 size-full object-contain transition-opacity duration-300", state === "ok" ? "opacity-100" : "opacity-0", className)}
        />
      )}
    </>
  );
}

const SIZE = {
  xs: { box: "size-9", icon: "size-4" },
  sm: { box: "size-11", icon: "size-5" },
  md: { box: "size-14", icon: "size-6" },
  lg: { box: "size-20", icon: "size-9" },
  xl: { box: "size-28", icon: "size-12" },
} as const;

export type ArtSize = keyof typeof SIZE;

/** Round product image on a pastel disc; a drawn icon stands in until the PNG exists. */
export function ItemImage({ itemId, size = "md", plain = false, className }: { itemId: string; size?: ArtSize; plain?: boolean; className?: string }) {
  const theme = itemTheme(itemId);
  const Icon = theme.icon;
  const s = SIZE[size];
  return (
    <span aria-hidden className={cn("relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full", plain ? theme.tint : "bg-white/70", s.box, className)}>
      <ProduceImage
        src={theme.src}
        fallback={<span className={cn("flex items-center justify-center", theme.ink)}><Icon className={s.icon} strokeWidth={1.75} /></span>}
        className="p-[8%]"
      />
    </span>
  );
}

const HERO_IDS = ["beras-medium", "gula-pasir", "telur-ayam", "minyak-curah"] as const;
const HERO_SPOTS = [
  { spot: "left-[6%] top-[14%]", size: "xl" },
  { spot: "right-[10%] top-[8%]", size: "lg" },
  { spot: "left-[34%] bottom-[10%]", size: "lg" },
  { spot: "right-[6%] bottom-[12%]", size: "xl" },
] as const;

/** Banner illustration: the hero cut-out, or a composition of the four item discs. */
export function HeroArt({ className }: { className?: string }) {
  return (
    <div aria-hidden className={className}>
      <ProduceImage
        src="/produce/hero.png"
        className="object-right-bottom"
        fallback={
          <>
            {HERO_IDS.map((id, i) => (
              <span key={id} className={cn("absolute rounded-full shadow-[0_6px_18px_rgba(0,0,0,0.14)] ring-4 ring-white/35", HERO_SPOTS[i]?.spot)}>
                <ItemImage itemId={id} size={HERO_SPOTS[i]?.size ?? "lg"} plain />
              </span>
            ))}
          </>
        }
      />
    </div>
  );
}
