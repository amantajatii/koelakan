/** Wires keys, providers and actors into one runtime for the live agents. */
import type { KeyPairString, Provider } from "near-api-js";
import { Actor } from "./chain/actor.js";
import { loadFcKey, loadFullAccessKey } from "./chain/keys.js";
import { createProvider } from "./chain/provider.js";
import { Recorder, type ActionRecord } from "./chain/recorder.js";
import { Views } from "./chain/views.js";
import { SALTS_FILE, deployment, fullId, grosirShortIds, warungShortIds, type Deployment } from "./config.js";
import { silentLogger, type Logger } from "./log.js";
import { population, type Population } from "./strategy.js";

export interface World {
  readonly dep: Deployment;
  readonly provider: Provider;
  readonly views: Views;
  readonly recorder: Recorder;
  readonly log: Logger;
  readonly pop: Population;
  readonly saltsFile: string;
  readonly koordinator: Actor;
  readonly warungs: ReadonlyMap<string, Actor>;
  readonly grosirs: ReadonlyMap<string, Actor>;
}

export interface WorldOptions {
  readonly root?: string;
  readonly log?: Logger;
  readonly onRecord?: (r: ActionRecord) => void;
  readonly saltsFile?: string;
}

async function requireFull(account: string): Promise<KeyPairString> {
  const k = await loadFullAccessKey(account);
  if (k === null) throw new Error(`no full-access key for ${account} in ~/.near-credentials/testnet (run pnpm setup)`);
  return k.privateKey;
}

async function makeWarung(id: string, provider: Provider, recorder: Recorder): Promise<Actor> {
  const fc = await loadFcKey(id);
  if (fc === null) throw new Error(`no function-call key for ${id} in agents/.keys (run pnpm setup)`);
  return new Actor(id, provider, recorder, {
    full: (await requireFull(id)),
    functionCall: fc.private_key,
  });
}

export async function createWorld(opts: WorldOptions = {}): Promise<World> {
  const dep = deployment(opts.root);
  const provider = createProvider();
  const recorder = new Recorder(opts.onRecord);
  const koordinator = new Actor(dep.koordinator, provider, recorder, { full: (await requireFull(dep.koordinator)) });
  const warungs = new Map<string, Actor>();
  for (const s of warungShortIds()) warungs.set(s, await makeWarung(fullId(s, dep.root), provider, recorder));
  const grosirs = new Map<string, Actor>();
  for (const s of grosirShortIds()) {
    const id = fullId(s, dep.root);
    grosirs.set(s, new Actor(id, provider, recorder, { full: (await requireFull(id)) }));
  }
  return {
    dep, provider, views: new Views(provider, dep.market, dep.tidr), recorder, log: opts.log ?? silentLogger,
    pop: population(), saltsFile: opts.saltsFile ?? SALTS_FILE, koordinator, warungs, grosirs,
  };
}
