/** Binds the pure grosir logic to the live chain, salt file and RPC views. */
import { GAS, ONE_YOCTO } from "../config.js";
import { newSalt } from "../protocol.js";
import { findSalt, persistSalt } from "../salts.js";
import { grosirQuote } from "../strategy.js";
import type { World } from "../world.js";
import type { GrosirDeps } from "./grosir.js";

const ROLE = "grosir";

export function grosirDeps(w: World, short: string): GrosirDeps {
  const actor = w.grosirs.get(short);
  if (actor === undefined) throw new Error(`unknown grosir ${short}`);
  return {
    market: w.dep.market, tidr: w.dep.tidr, account: actor.id, short,
    loadSalt: (roundId) => findSalt(w.saltsFile, w.dep.market, roundId, actor.id),
    saveSalt: (entry) => persistSalt(w.saltsFile, entry),
    newSalt: () => newSalt(),
    nowIso: () => new Date().toISOString(),
    walletBalance: () => w.views.tokenBalance(actor.id),
    requiredBond: (roundId) => w.views.requiredBond(roundId),
    quote: (item) => grosirQuote(w.pop, short, item),
    sendCommit: (args, note) =>
      actor.call({
        contract: w.dep.tidr, method: "ft_transfer_call", args, deposit: ONE_YOCTO, gas: GAS.ftTransferCall,
        key: "full", role: ROLE, note, expectEvent: "bid_committed",
      }),
    sendReveal: (args, note) =>
      actor.call({
        contract: w.dep.market, method: "reveal_bid", args, gas: GAS.reveal, key: "full", role: ROLE, note,
        expectEvent: "bid_revealed",
      }),
  };
}
