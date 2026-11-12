/** Grosir (seller) agent: sealed-bid commit with salt persisted first, then reveal. */
import type { ActionRecord } from "../chain/recorder.js";
import { skipRecord } from "../chain/recorder.js";
import { bidHash, commitMsg, ftTransferCallArgs, revealArgs } from "../protocol.js";
import type { SaltEntry } from "../salts.js";
import { decideBid, neverReveals } from "../strategy.js";

export interface GrosirDeps {
  readonly market: string;
  readonly tidr: string;
  readonly account: string;
  readonly short: string;
  loadSalt(roundId: number): SaltEntry | null;
  /** Must be durable (fsync) before it returns. */
  saveSalt(entry: SaltEntry): void;
  newSalt(): string;
  nowIso(): string;
  walletBalance(): Promise<bigint>;
  requiredBond(roundId: number): Promise<bigint>;
  quote(item: string): bigint;
  /** Service mode: per-round "forget to reveal" roll. Default is the scripted `neverReveals(short)`. */
  forgets?(roundId: number): boolean;
  /** External grosir limits: never bid below `minBid`, never bond more than `maxBond`. */
  readonly minBid?: bigint;
  readonly maxBond?: bigint;
  sendCommit(args: ReturnType<typeof ftTransferCallArgs>, note: string): Promise<ActionRecord>;
  sendReveal(args: ReturnType<typeof revealArgs>, note: string): Promise<ActionRecord>;
}

export interface RoundInfo {
  readonly id: number;
  readonly item: string;
  readonly ceiling: bigint;
}

const ROLE = "grosir";

/** Decide, persist {round_id, price, salt}, THEN send the commit. */
export async function runCommit(d: GrosirDeps, round: RoundInfo): Promise<ActionRecord> {
  const [wallet, bond] = await Promise.all([d.walletBalance(), d.requiredBond(round.id)]);
  const decision = decideBid({
    short: d.short, price: d.quote(round.item), ceiling: round.ceiling, bond, wallet, forgetful: d.forgets?.(round.id),
  });
  if (decision.action === "skip") return skipRecord(d.account, ROLE, "commit", decision.reason);
  if (d.minBid !== undefined && decision.price < d.minBid) {
    return skipRecord(d.account, ROLE, "commit", `quote ${decision.price} below MIN_BID ${d.minBid}`);
  }
  if (d.maxBond !== undefined && bond > d.maxBond) {
    return skipRecord(d.account, ROLE, "commit", `bond ${bond} above MAX_BOND ${d.maxBond}`);
  }
  const prior = d.loadSalt(round.id);
  const salt = prior?.salt ?? d.newSalt();
  const price = prior !== null ? BigInt(prior.price) : decision.price;
  d.saveSalt({
    market: d.market, round_id: round.id, seller: d.account, price: price.toString(), salt, saved_at: d.nowIso(),
  });
  const hash = bidHash(round.id, d.account, price, salt);
  const args = ftTransferCallArgs(d.market, bond, commitMsg(round.id, hash));
  return d.sendCommit(args, `sealed bid committed, bond ${bond}`);
}

/** Reveal from the persisted salt (never from memory). Grosir-5 is scripted to skip. */
export async function runReveal(d: GrosirDeps, roundId: number): Promise<ActionRecord> {
  if (d.forgets ? d.forgets(roundId) : neverReveals(d.short)) return skipRecord(d.account, ROLE, "reveal_bid", "scripted: never reveals (forfeit path)");
  const saved = d.loadSalt(roundId);
  if (saved === null) return skipRecord(d.account, ROLE, "reveal_bid", "no saved salt: did not commit");
  return d.sendReveal(revealArgs(roundId, BigInt(saved.price), saved.salt), "bid revealed");
}
