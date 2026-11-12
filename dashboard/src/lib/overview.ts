import { getItems, getRound, listAllRounds } from "./market";
import type { Item, RoundView } from "./types";

export interface Overview {
  items: Item[];
  rounds: RoundView[];
  /** Epoch ms when the data was read. */
  fetchedAt: number;
}

export async function fetchOverview(): Promise<Overview> {
  const [items, rounds] = await Promise.all([getItems(), listAllRounds()]);
  return { items, rounds, fetchedAt: Date.now() };
}

export interface Loaded<T> {
  /** Null when the RPC was unreachable; the client then fetches on its own. */
  data: T | null;
  renderedAt: number;
}

/** Server-side loader: never throws, so a flaky RPC cannot break a build or a render. */
export async function loadOverview(): Promise<Loaded<Overview>> {
  try {
    return { data: await fetchOverview(), renderedAt: Date.now() };
  } catch {
    return { data: null, renderedAt: Date.now() };
  }
}

export interface RoundBundle {
  items: Item[];
  round: RoundView | null;
  fetchedAt: number;
}

export async function fetchRoundBundle(id: number): Promise<RoundBundle> {
  const [items, round] = await Promise.all([getItems(), getRound(id)]);
  return { items, round, fetchedAt: Date.now() };
}

export async function loadRoundBundle(id: number): Promise<Loaded<RoundBundle>> {
  try {
    return { data: await fetchRoundBundle(id), renderedAt: Date.now() };
  } catch {
    return { data: null, renderedAt: Date.now() };
  }
}
