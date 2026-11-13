import { rupiah, shortAccount } from "./format";
import { itemPlainName } from "./items";
import { percentBelow } from "./item-summary";
import { nsToMs } from "./json";
import { isSettled } from "./stats";
import type { Item, Participant, RoundView } from "./types";

/** One beat of the landing-page chat. Every value is read from a real on-chain round. */
export type LandingBeat =
  | { kind: "agent"; text: string }
  | { kind: "owner"; text: string }
  | { kind: "result"; paid: string; refPrice: string; unit: string; percentBelow: number; winner: string };

export interface LandingChat {
  roundId: number;
  /** Epoch ms when the round opened, for the chat's date chip. */
  openedAt: number;
  warung: string;
  itemName: string;
  beats: LandingBeat[];
}

/** How many recent settled rounds the showcase picks from. */
const SHOWCASE_WINDOW = 6;

const showable = (r: RoundView): boolean =>
  isSettled(r) && r.clearing_price !== null && r.winner !== null && r.participants.length > 0;

/**
 * The round the landing chat replays: among the latest settled rounds, the one with the most competing
 * grosirs, newest on ties. It is always a real round, and the page names its number.
 */
export function latestShowcaseRound(rounds: readonly RoundView[]): RoundView | null {
  const recent = rounds.filter(showable).slice(-SHOWCASE_WINDOW);
  return recent.reduce<RoundView | null>((best, r) => (best === null || r.bids.length >= best.bids.length ? r : best), null);
}

/** Prefer the demo warung when it took part, so the chat matches the demo a visitor can open next. */
function pickParticipant(round: RoundView, preferred: string): Participant {
  return round.participants.find((p) => p.account_id === preferred) ?? (round.participants[0] as Participant);
}

/** Compact, owner-facing beats for one participant of a settled round. */
export function buildLandingChat(round: RoundView, item: Item, preferredAccount: string): LandingChat | null {
  if (!isSettled(round) || round.clearing_price === null || round.winner === null || round.participants.length === 0) return null;
  const p = pickParticipant(round, preferredAccount);
  const winner = round.bids[round.winner];
  const below = percentBelow(round.ref_price, round.clearing_price);
  if (!winner || below === null) return null;

  const name = itemPlainName(item, round.item).toLowerCase();
  const unit = item.unit;
  const refund = (BigInt(round.ceiling_price) - BigInt(round.clearing_price)) * BigInt(p.qty);
  const beats: LandingBeat[] = [
    { kind: "agent", text: `Round #${round.id} is open: ${name}. Max ${rupiah(round.ceiling_price)}/${unit}, PIHPS ${rupiah(round.ref_price)}/${unit}.` },
    { kind: "agent", text: `I joined with ${p.qty} ${unit} for you. That is within your limits.` },
    { kind: "agent", text: round.bids.length === 1 ? "Bids are sealed. 1 grosir is bidding." : `Bids are sealed. ${round.bids.length} grosirs are competing.` },
    { kind: "result", paid: round.clearing_price, refPrice: round.ref_price, unit, percentBelow: below, winner: shortAccount(winner.seller_id) },
  ];
  if (refund > 0n) beats.push({ kind: "agent", text: `${rupiah(refund)} went back to your balance. The goods are on the way.` });
  if (p.delivery === "Confirmed") beats.push({ kind: "owner", text: "The goods arrived, thank you." });
  return { roundId: round.id, openedAt: nsToMs(round.opened_at), warung: shortAccount(p.account_id), itemName: name, beats };
}
