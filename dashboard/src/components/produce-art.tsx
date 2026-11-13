"use client";

import Image, { getImageProps } from "next/image";
import { useCallback, useState, type ReactNode } from "react";
import { cn } from "@/components/ui/cn";
import { itemTheme } from "@/lib/item-theme";

/**
 * Shows the image when the file exists and `fallback` otherwise, so dropping a PNG into
 * `public/produce/` needs no code change. The image is visible from the start; the fallback
 * icon replaces it only if the file fails to load. next/image serves it as WebP at the right size.
 */
/** The image may fail before hydration attaches onError, so also check once it mounts. */
function useMissingCheck(setMissing: (v: boolean) => void) {
  return useCallback((img: HTMLImageElement | null) => {
    if (img?.complete && img.naturalWidth === 0 && !img.currentSrc.startsWith("data:")) setMissing(true);
  }, [setMissing]);
}

function ProduceImage({ src, fallback, className, sizes }: {
  src: string | null;
  fallback: ReactNode;
  className?: string;
  sizes: string;
}) {
  const [missing, setMissing] = useState(src === null);
  const ref = useMissingCheck(setMissing);
  if (src === null || missing) return <>{fallback}</>;
  return (
    <Image
      ref={ref}
      src={src}
      alt=""
      sizes={sizes}
      fill
      onError={() => setMissing(true)}
      className={cn("absolute inset-0 size-full object-contain", className)}
    />
  );
}

const HERO_MIN_WIDTH = "(min-width: 640px)"; // matches the banner's `sm:block`
const BLANK_GIF = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";

/**
 * Hero is the LCP image on wider screens: eager with fetchpriority=high. On phones the banner
 * hides it, so the <source> only matches from `sm` up and the <img> itself points at a blank GIF;
 * the 960px file is never downloaded there.
 */
function HeroImage({ fallback }: { fallback: ReactNode }) {
  const [missing, setMissing] = useState(false);
  const ref = useMissingCheck(setMissing);
  if (missing) return <>{fallback}</>;
  const { props } = getImageProps({
    src: "/produce/hero.png",
    alt: "",
    width: 960,
    height: 640,
    sizes: "(min-width: 1280px) 550px, 44vw",
    fetchPriority: "high",
    loading: "eager",
  });
  const { srcSet, sizes, ...img } = props;
  return (
    <picture>
      <source media={HERO_MIN_WIDTH} srcSet={srcSet} sizes={sizes} />
      <img
        {...img}
        ref={ref}
        src={BLANK_GIF}
        alt=""
        onError={() => setMissing(true)}
        className="absolute inset-0 size-full object-contain object-right-bottom"
      />
    </picture>
  );
}

/** `px` is the largest rendered width (callers may widen a disc with sm:size-*), used for the image `sizes`. */
const SIZE = {
  xs: { box: "size-9", icon: "size-4", px: 44 },
  sm: { box: "size-11", icon: "size-5", px: 80 },
  md: { box: "size-14", icon: "size-6", px: 56 },
  lg: { box: "size-20", icon: "size-9", px: 80 },
  xl: { box: "size-28", icon: "size-12", px: 112 },
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
        sizes={`${s.px}px`}
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
      <HeroImage
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
