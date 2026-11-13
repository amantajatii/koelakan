/** Wires keys, actors, views and state into one runtime. Missing keys are reported, never fatal. */
import { KeyPair, type KeyPairString, type Provider } from "near-api-js";
import { Actor } from "../chain/actor.js";
import { loadFcKey, loadFullAccessKey } from "../chain/keys.js";
import { createProvider } from "../chain/provider.js";
import { Recorder, type ActionRecord } from "../chain/recorder.js";
import { Views, type ItemView } from "../chain/views.js";
import { fullId, grosirShortIds, warungShortIds } from "../config.js";
import { SEED } from "../sim-bridge.js";
import { population, type Population } from "../strategy.js";
import { Health } from "./budget.js";
import type { DaemonConfig } from "./env.js";
import { Events, type EventInput } from "./events.js";
import { StateStore } from "./state.js";

export interface GrosirAgent {
  readonly id: string;
  readonly short: string;
  readonly actor: Actor | null;
}

export interface SeededAgent {
  readonly id: string;
  readonly short: string;
  readonly actor: Actor | null;
  readonly hasFcKey: boolean;
  readonly fcPublicKey: string | null;
}

export interface GrosirStat {
  readonly near: bigint | null;
  readonly tidrWallet: bigint | null;
  readonly marketAvailable: bigint | null;
}

export interface Runtime {
  readonly cfg: DaemonConfig;
  readonly provider: Provider;
  readonly views: Views;
  readonly events: Events;
  readonly state: StateStore;
  readonly health: Health;
  readonly recorder: Recorder;
  readonly pop: Population;
  readonly seed: number;
  readonly koord: Actor | null;
  readonly koordId: string;
  readonly grosirs: readonly GrosirAgent[];
  readonly seeded: readonly SeededAgent[];
  readonly servicePublicKey: string | null;
  readonly serviceSecret: KeyPairString | null;
  /** Mutable caches owned by the loop (single writer). */
  readonly cache: RuntimeCache;
}

export interface RuntimeCache {
  items: { at: number; list: readonly ItemView[] } | null;
  policySignature: string | null;
  lastTickAt: string | null;
  lastOpenTryMs: number;
  lastTry: Map<string, number>;
  grosirStats: Map<string, GrosirStat>;
  delegatedActors: Map<string, Actor>;
  delegation: Map<string, { at: number; value: DelegationInfo }>;
  housekeptAt: number;
  warungHousekeptAt: number;
  nextOpenAtMs: number | null;
  activeRounds: { id: number; item: string; phase: string }[];
  fcExhausted: Set<string>;
  background: Promise<void> | null;
}

export interface DelegationInfo {
  readonly delegated: boolean;
  readonly autoJoin: boolean | null;
}

const newCache = (): RuntimeCache => ({
  items: null, policySignature: null, lastTickAt: null, lastOpenTryMs: 0, lastTry: new Map(), grosirStats: new Map(),
  delegatedActors: new Map(), delegation: new Map(), housekeptAt: 0, warungHousekeptAt: 0, nextOpenAtMs: null,
  activeRounds: [], fcExhausted: new Set(), background: null,
});

function roundIdOf(r: ActionRecord): number | null {
  const a = r.args as { round_id?: unknown; msg?: unknown } | null;
  if (typeof a?.round_id === "number") return a.round_id;
  if (r.method === "open_round" && typeof r.result === "number") return r.result;
  if (typeof a?.msg === "string") {
    try {
      const id = (JSON.parse(a.msg) as { commit?: { round_id?: unknown } }).commit?.round_id;
      return typeof id === "number" ? id : null;
    } catch {
      return null; // msg is not a commit payload: no round id to extract
    }
  }
  return null;
}

function recordToEvent(r: ActionRecord): EventInput {
  const who = r.actor.split(".")[0] ?? r.actor;
  const ok = r.status === "ok";
  const detail = ok ? (r.note ?? "") : (r.error ?? r.note ?? "");
  return {
    kind: ok ? r.method : r.status === "skipped" ? "skipped" : "tx_failed",
    round_id: roundIdOf(r), account: r.actor, tx: r.tx_hash,
    message: `${who} ${r.method}${ok ? "" : ` ${r.status}`}${detail === "" ? "" : `: ${detail}`}`,
  };
}

async function fullKey(cfg: DaemonConfig, id: string, missing: string[], override?: KeyOverride): Promise<KeyPairString | null> {
  if (override?.id === id) return override.key;
  const k = await loadFullAccessKey(id, cfg.credentialsDir);
  if (k === null) missing.push(id);
  return k?.privateKey ?? null;
}

const toActor = (id: string, provider: Provider, rec: Recorder, full: KeyPairString | null, fc?: KeyPairString): Actor | null =>
  full === null && fc === undefined ? null : new Actor(id, provider, rec, { ...(full ? { full } : {}), ...(fc ? { functionCall: fc } : {}) });

export interface KeyOverride {
  readonly id: string;
  readonly key: KeyPairString;
}

export interface BuildOptions {
  /** External grosir: a private key given directly instead of a key file. */
  readonly keyOverride?: KeyOverride;
  readonly roles: { readonly koordinator: boolean; readonly seeded: boolean };
  readonly grosirIds?: readonly string[];
}

export async function buildRuntime(cfg: DaemonConfig, events: Events, opts: BuildOptions): Promise<Runtime> {
  const provider = createProvider();
  const missing: string[] = [];
  const recorder = new Recorder((r) => events.emit(recordToEvent(r)));
  const root = cfg.dep.root;
  const koordKey = opts.roles.koordinator ? await fullKey(cfg, cfg.dep.koordinator, missing) : null;
  const grosirIds = opts.grosirIds ?? grosirShortIds().map((s) => fullId(s, root));
  const grosirs: GrosirAgent[] = [];
  for (const id of grosirIds) {
    grosirs.push({ id, short: id.split(".")[0] ?? id, actor: toActor(id, provider, recorder, await fullKey(cfg, id, missing, opts.keyOverride)) });
  }
  const seeded: SeededAgent[] = [];
  for (const short of opts.roles.seeded ? warungShortIds() : []) {
    const id = fullId(short, root);
    const full = await fullKey(cfg, id, missing);
    const fc = await loadFcKey(id, cfg.fckDir);
    seeded.push({
      id, short, hasFcKey: fc !== null, fcPublicKey: fc?.public_key ?? null,
      actor: toActor(id, provider, recorder, full, fc?.private_key),
    });
  }
  const health = new Health();
  health.setMissing(missing);
  return {
    cfg, provider, views: new Views(provider, cfg.dep.market, cfg.dep.tidr), events, state: new StateStore(cfg.dataDir), health,
    recorder, pop: population(), seed: SEED, koord: toActor(cfg.dep.koordinator, provider, recorder, koordKey),
    koordId: cfg.dep.koordinator, grosirs, seeded,
    servicePublicKey: cfg.serviceKey === null ? null : KeyPair.fromString(cfg.serviceKey as KeyPairString).getPublicKey().toString(),
    serviceSecret: cfg.serviceKey as KeyPairString | null, cache: newCache(),
  };
}
