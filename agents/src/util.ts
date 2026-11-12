/** Small shared helpers. */

/** Runs `fn` over items with at most `limit` in flight; results keep input order. */
export async function mapLimit<T, R>(items: readonly T[], limit: number, fn: (item: T, index: number) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array<R>(items.length);
  let next = 0;
  const worker = async (): Promise<void> => {
    while (next < items.length) {
      const i = next;
      next += 1;
      out[i] = await fn(items[i] as T, i);
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return out;
}

/** Rupiah with Indonesian thousands separators: 16650 -> "Rp16.650". */
export function rupiah(n: bigint | number | string): string {
  const s = BigInt(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `Rp${s}`;
}

export const formatNear = (yocto: bigint): string => {
  const whole = yocto / 10n ** 24n;
  const frac = (yocto % 10n ** 24n).toString().padStart(24, "0").slice(0, 4);
  return `${whole}.${frac} NEAR`;
};

/** JSON.stringify that renders bigint as a decimal string. */
export const toJson = (v: unknown, indent = 2): string =>
  JSON.stringify(v, (_k, x) => (typeof x === "bigint" ? x.toString() : x), indent);
