/** Single import point for the shared sim strategy, so live agents and sim use one source of truth. */
export {
  CATALOGUE, FORGETFUL_GROSIR, MIN_TOTAL_QTY, SEED, buildPopulation, grosirIds, quote, warungIds,
  type GrosirProfile, type WarungProfile,
} from "../../sim/src/config.js";
export { mulberry32 } from "../../sim/src/rng.js";
export { proRataShares } from "../../sim/src/util.js";
