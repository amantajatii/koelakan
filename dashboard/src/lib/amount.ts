/** Parse a user-typed integer amount ("500.000", "500000", "500,000") into a bigint, or null if invalid. */
export function parseAmount(input: string): bigint | null {
  const cleaned = input.replace(/[.,\s]/g, "");
  if (!/^\d+$/.test(cleaned)) return null;
  return BigInt(cleaned);
}

export function parseQty(input: string): number {
  const n = Number(input.replace(/[.,\s]/g, ""));
  return Number.isSafeInteger(n) ? n : 0;
}
