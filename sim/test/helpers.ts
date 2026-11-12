import {
  commitBid, bidHash, deposit, joinRound, newMarket, openRound, requiredBond, revealBid, setItem,
  setPolicy, NS, type MarketState,
} from "../src/engine.js";

export const T0 = 1_000n * NS;
export const REF = 20_800n;
export const ITEM = "minyak-curah";
export const SALT = "00112233445566778899aabbccddeeff";

export const at = (secs: number): bigint => T0 + BigInt(secs) * NS;
export const c = (caller: string, secs: number, yocto?: bigint) =>
  yocto === undefined ? { caller, now: at(secs) } : { caller, now: at(secs), yocto };

export function market(): MarketState {
  return setItem(newMarket("admin", "arbiter", "tidr"), c("admin", 0, 1n), {
    id: ITEM, name: "Minyak", unit: "kg", refPrice: REF, het: null, source: "PIHPS", asOf: "2026-11-11",
  });
}

export function warung(s: MarketState, id: string, opts: { max?: bigint; budget?: bigint; auto?: boolean; funds?: bigint } = {}): MarketState {
  const funded = deposit(s, at(0), id, opts.funds ?? 2_000_000n);
  return setPolicy(funded, c(id, 0, 1n), {
    maxPrice: { [ITEM]: opts.max ?? 21_000n }, weeklyBudget: opts.budget ?? 1_500_000n, autoJoin: opts.auto ?? true,
  });
}

export function open(s: MarketState, ceiling = REF, min = 50n): MarketState {
  return openRound(s, c("koordinator", 0), {
    item: ITEM, ceilingPrice: ceiling, minTotalQty: min, joinSecs: 120n, commitSecs: 60n, revealSecs: 60n, deliverySecs: 300n,
  });
}

/** 3 warungs (10 + 40 + 5 kg), min 50. */
export function joined(): MarketState {
  let s = market();
  for (const i of [1, 2, 3]) s = warung(s, `w${i}`);
  s = open(s);
  for (const [i, q] of [[1, 10n], [2, 40n], [3, 5n]] as const) s = joinRound(s, c(`w${i}`, 10), 0, q);
  return s;
}

export function commit(s: MarketState, seller: string, price: bigint): MarketState {
  const r = s.rounds[0]!;
  return commitBid(s, at(130), seller, requiredBond(r.ceilingPrice, r.totalQty), 0, bidHash(0, seller, price, SALT));
}

export const reveal = (s: MarketState, seller: string, price: bigint): MarketState =>
  revealBid(s, c(seller, 190), 0, price, SALT);
