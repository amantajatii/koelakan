import type { Item } from "./types";

/**
 * English display names keyed by on-chain item id. The catalogue on chain keeps the
 * Indonesian `name`; this map only changes what the UI shows, falling back to the chain name.
 */
const DISPLAY_NAMES: Readonly<Record<string, string>> = {
  "beras-medium": "Medium rice (type II)",
  "gula-pasir": "Local granulated sugar",
  "telur-ayam": "Chicken eggs",
  "minyak-curah": "Bulk cooking oil",
};

/** Display name for an item; `fallbackId` is shown when the catalogue has no such item. */
export function itemLabel(item: Pick<Item, "id" | "name"> | undefined, fallbackId = ""): string {
  if (!item) return DISPLAY_NAMES[fallbackId] ?? fallbackId;
  return DISPLAY_NAMES[item.id] ?? item.name;
}
