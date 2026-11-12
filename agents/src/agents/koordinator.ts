/** Koordinator agent: opens, settles and finalizes rounds. All three are permissionless on-chain. */
import { GAS } from "../config.js";
import type { ActionRecord } from "../chain/recorder.js";
import { openRoundArgs, roundIdArgs, type OpenRoundParams } from "../protocol.js";
import type { Actor } from "../chain/actor.js";
import type { Deployment } from "../config.js";

/** The slice of a runtime the koordinator needs (satisfied by `World` and by the daemon runtime). */
export interface KoordCtx {
  readonly dep: Pick<Deployment, "market">;
  readonly koordinator: Actor;
}

const ROLE = "koordinator";

export function openRound(w: KoordCtx, p: OpenRoundParams): Promise<ActionRecord> {
  return w.koordinator.call({
    contract: w.dep.market, method: "open_round", args: openRoundArgs(p), gas: GAS.open, role: ROLE,
    note: `open ${p.item} @ ceiling ${p.ceilingPrice}`,
  });
}

export const settleRound = (w: KoordCtx, roundId: number): Promise<ActionRecord> =>
  w.koordinator.call({ contract: w.dep.market, method: "settle", args: roundIdArgs(roundId), gas: GAS.settle, role: ROLE });

export const finalizeRound = (w: KoordCtx, roundId: number): Promise<ActionRecord> =>
  w.koordinator.call({ contract: w.dep.market, method: "finalize", args: roundIdArgs(roundId), gas: GAS.finalize, role: ROLE });
