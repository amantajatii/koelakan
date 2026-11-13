/** Orchestrates one live round: koordinator + warung + grosir agents driven by on-chain phases. */
import type { ActionRecord } from "./chain/recorder.js";
import type { BalanceView, ItemView, RoundView } from "./chain/views.js";
import { MAX_WAIT_MS, POLL_INTERVAL_MS, TX_CONCURRENCY, grosirShortIds, warungShortIds, shortId } from "./config.js";
import { finalizeRound, openRound, settleRound } from "./agents/koordinator.js";
import { runCommit, runReveal } from "./agents/grosir.js";
import { grosirDeps } from "./agents/grosir-live.js";
import { warungConfirm, warungJoin } from "./agents/warung.js";
import { pickSilent } from "./strategy.js";
import { mapLimit, sleep } from "./util.js";
import type { World } from "./world.js";

export interface RoundParams {
  readonly item: string;
  readonly joinSecs: number;
  readonly commitSecs: number;
  readonly revealSecs: number;
  readonly deliverySecs: number;
  readonly minTotalQty: number;
}

export type BalanceSnapshot = Readonly<Record<string, BalanceView>>;

export interface RoundRun {
  readonly roundId: number;
  readonly params: RoundParams;
  readonly item: ItemView;
  readonly startedAt: string;
  readonly finishedAt: string;
  readonly roundBefore: RoundView;
  readonly roundAfter: RoundView;
  readonly balancesBefore: BalanceSnapshot;
  readonly balancesAfter: BalanceSnapshot;
  readonly silentWarung: string | null;
  readonly actions: readonly ActionRecord[];
}


const allAccounts = (w: World): string[] => [
  ...warungShortIds().map((s) => w.warungs.get(s)?.id ?? s),
  ...grosirShortIds().map((s) => w.grosirs.get(s)?.id ?? s),
];

async function snapshotBalances(w: World): Promise<BalanceSnapshot> {
  const ids = allAccounts(w);
  const views = await mapLimit(ids, TX_CONCURRENCY, (id) => w.views.balance(id));
  return Object.fromEntries(ids.map((id, i) => [id, views[i] as BalanceView]));
}

function requireOk(rec: ActionRecord): ActionRecord {
  if (rec.status !== "ok") throw new Error(`${rec.actor} ${rec.method} failed: ${rec.error ?? "unknown error"}`);
  return rec;
}

async function open(w: World, p: RoundParams, item: ItemView): Promise<number> {
  const rec = requireOk(
    await openRound(w, {
      item: item.id, ceilingPrice: BigInt(item.ref_price), minTotalQty: p.minTotalQty,
      joinSecs: p.joinSecs, commitSecs: p.commitSecs, revealSecs: p.revealSecs, deliverySecs: p.deliverySecs,
    }),
  );
  if (typeof rec.result !== "number") throw new Error(`open_round returned unexpected value ${JSON.stringify(rec.result)}`);
  return rec.result;
}

async function joinAll(w: World, round: RoundView): Promise<void> {
  await mapLimit(warungShortIds(), TX_CONCURRENCY, (s) => warungJoin(w, s, round));
}

async function commitAll(w: World, round: RoundView): Promise<void> {
  const info = { id: round.id, item: round.item, ceiling: BigInt(round.ceiling_price) };
  await mapLimit(grosirShortIds(), TX_CONCURRENCY, (s) => runCommit(grosirDeps(w, s), info));
}

async function revealAll(w: World, round: RoundView): Promise<void> {
  await mapLimit(grosirShortIds(), TX_CONCURRENCY, (s) => runReveal(grosirDeps(w, s), round.id));
}

async function confirmAll(w: World, round: RoundView, silent: string | null): Promise<void> {
  const owners = round.participants.map((p) => shortId(p.account_id)).filter((s) => `${s}.${w.dep.root}` !== silent);
  await mapLimit(owners, TX_CONCURRENCY, (s) => warungConfirm(w, s, round.id));
}

interface Stages {
  joined: boolean; committed: boolean; revealed: boolean; settled: boolean; confirmed: boolean;
}

/** One poll step: acts once per stage. Returns true when the round reached its end. */
async function step(w: World, id: number, st: Stages, silentRef: { v: string | null }): Promise<boolean> {
  const r = await w.views.round(id);
  if (r === null) throw new Error(`round ${id} disappeared`);
  w.log.info(`  .. phase ${r.phase} (total_qty ${r.total_qty}, bids ${r.bids.length})`);
  if (r.phase === "Join" && !st.joined) { st.joined = true; await joinAll(w, r); }
  else if (r.phase === "Commit" && !st.committed) { st.committed = true; await commitAll(w, r); }
  else if (r.phase === "Reveal" && !st.revealed) { st.revealed = true; await revealAll(w, r); }
  else if (r.phase === "ReadyToSettle" && !st.settled) { st.settled = true; requireOk(await settleRound(w, id)); }
  else if (r.phase === "Delivery" && !st.confirmed) {
    st.confirmed = true;
    silentRef.v = pickSilent(r.participants.map((p) => p.account_id));
    await confirmAll(w, r, silentRef.v);
  } else if (r.phase === "AwaitingFinalize") { requireOk(await finalizeRound(w, id)); return true; }
  return r.phase === "Failed" || r.phase === "Closed";
}

export async function runLiveRound(w: World, p: RoundParams): Promise<RoundRun> {
  const item = (await w.views.items()).find((i) => i.id === p.item);
  if (item === undefined) throw new Error(`unknown item '${p.item}' (catalogue has none by that id)`);
  const startedAt = new Date().toISOString();
  const balancesBefore = await snapshotBalances(w);
  const roundId = await open(w, p, item);
  const roundBefore = (await w.views.round(roundId)) as RoundView;
  const firstActionIndex = w.recorder.list().length - 1; // the open_round record
  const stages: Stages = { joined: false, committed: false, revealed: false, settled: false, confirmed: false };
  const silentRef: { v: string | null } = { v: null };
  const deadline = Date.now() + MAX_WAIT_MS;
  while (Date.now() < deadline) {
    if (await step(w, roundId, stages, silentRef)) break;
    await sleep(POLL_INTERVAL_MS);
  }
  const roundAfter = (await w.views.round(roundId)) as RoundView;
  if (roundAfter.state !== "Closed" && roundAfter.state !== "Failed") {
    throw new Error(`round ${roundId} did not finish in time (state ${roundAfter.state}, phase ${roundAfter.phase})`);
  }
  const balancesAfter = await snapshotBalances(w);
  return {
    roundId, params: p, item, startedAt, finishedAt: new Date().toISOString(), roundBefore, roundAfter,
    balancesBefore, balancesAfter, silentWarung: silentRef.v, actions: w.recorder.list().slice(firstActionIndex),
  };
}
