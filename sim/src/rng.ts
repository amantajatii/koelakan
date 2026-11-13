/** Seeded PRNG helpers. All simulation randomness flows through these, so runs are deterministic. */
/** mulberry32: small, fast, seeded PRNG returning floats in [0, 1). */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4_294_967_296;
  };
}

export type Rng = () => number;

/** Integer in [lo, hi] (inclusive). */
export function randInt(rng: Rng, lo: bigint, hi: bigint): bigint {
  return lo + BigInt(Math.floor(rng() * Number(hi - lo + 1n)));
}
