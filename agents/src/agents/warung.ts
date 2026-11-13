/** Warung agent. Joins with its function-call key ONLY; owner actions use the full key. */
import { GAS, ONE_YOCTO } from "../config.js";
import type { ActionRecord } from "../chain/recorder.js";
import { skipRecord } from "../chain/recorder.js";
import type { RoundView } from "../chain/views.js";
import { joinRoundArgs, roundIdArgs } from "../protocol.js";
import { decideJoin, warungQty } from "../strategy.js";
import type { World } from "../world.js";

export const MAX_PARTICIPANTS = 50;
const ROLE = "warung-agent";

export async function warungJoin(w: World, short: string, round: RoundView): Promise<ActionRecord> {
  const actor = w.warungs.get(short);
  if (actor === undefined) throw new Error(`unknown warung ${short}`);
  const [policy, bal, spent] = await Promise.all([
    w.views.policy(actor.id), w.views.balance(actor.id), w.views.spent(actor.id),
  ]);
  const current = round; // phase was read this poll; the contract re-checks on join anyway
  const decision = decideJoin({
    account: actor.id, phase: current.phase, item: current.item, ceiling: BigInt(current.ceiling_price),
    participants: current.participants.map((p) => p.account_id), maxParticipants: MAX_PARTICIPANTS,
    wantedQty: warungQty(w.pop, short, current.item), policy, available: BigInt(bal.available), spent,
  });
  if (decision.action === "skip") return skipRecord(actor.id, ROLE, "join_round", decision.reason);
  return actor.call({
    contract: w.dep.market, method: "join_round", args: joinRoundArgs(round.id, decision.qty),
    gas: GAS.join, key: "function-call", role: ROLE, note: `joined with ${decision.qty} units (function-call key)`,
  });
}

/** Owner action (full key, 1 yocto): the owner confirms goods arrived. Scripted here; the dashboard renders it as a WhatsApp-style chat message. */
export function warungConfirm(w: World, short: string, roundId: number): Promise<ActionRecord> {
  const actor = w.warungs.get(short);
  if (actor === undefined) throw new Error(`unknown warung ${short}`);
  return actor.call({
    contract: w.dep.market, method: "confirm_delivery", args: roundIdArgs(roundId), deposit: ONE_YOCTO,
    gas: GAS.confirm, key: "full", role: "owner",
    note: "owner confirm, scripted (full-access key, 1 yocto)",
  });
}
