import { Droplet, Package, Egg, Wheat, Candy, type LucideIcon } from "lucide-react";

export interface ItemTheme {
  /** Pastel surface for cards and discs. */
  tint: string;
  /** Darker text tint of the same hue. */
  ink: string;
  icon: LucideIcon;
  /** Cut-out image; the component falls back to the icon when the file is missing. */
  src: string | null;
  short: string;
}

const THEMES: Readonly<Record<string, ItemTheme>> = {
  "beras-medium": { tint: "bg-rice", ink: "text-rice-ink", icon: Wheat, src: "/produce/rice.png", short: "Rice" },
  "gula-pasir": { tint: "bg-sugar", ink: "text-sugar-ink", icon: Candy, src: "/produce/sugar.png", short: "Sugar" },
  "telur-ayam": { tint: "bg-eggs", ink: "text-eggs-ink", icon: Egg, src: "/produce/eggs.png", short: "Eggs" },
  "minyak-curah": { tint: "bg-oil", ink: "text-oil-ink", icon: Droplet, src: "/produce/oil.png", short: "Oil" },
};

const FALLBACK: ItemTheme = { tint: "bg-brand-soft", ink: "text-brand-ink", icon: Package, src: null, short: "Item" };

export const itemTheme = (itemId: string): ItemTheme => THEMES[itemId] ?? FALLBACK;
