/** Single import point for the shared sim strategy, so live agents and sim use one source of truth. */
export {
  CATALOGUE, FORGETFUL_GROSIR, MIN_TOTAL_QTY, SEED, buildPopulation, quote,
  type GrosirProfile, type WarungProfile,
} from "../../sim/src/config.js";
export { proRataShares } from "../../sim/src/util.js";
