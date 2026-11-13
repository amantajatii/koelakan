/** Idempotent testnet setup: accounts, tIDR, market deposit, owner policy and function-call keys. */
import type { Provider } from "near-api-js";
import { Actor } from "./chain/actor.js";
import { fcKeyPath, generateKey, loadFcKey, loadFullAccessKey, saveFcKey, saveFullAccessKey, type StoredKey } from "./chain/keys.js";
import { createProbeProvider, createProvider, isNotFoundError, isTransientError, withRetry } from "./chain/provider.js";
import { Recorder, type ActionRecord } from "./chain/recorder.js";
import { Views } from "./chain/views.js";
import {
  ACCOUNT_FUNDING, FC_KEY_ALLOWANCE, GAS, GROSIR_MIN_WALLET, ONE_YOCTO, ROOT_MIN_BALANCE,
  WARUNG_DEPOSIT, WARUNG_WEEKLY_BUDGET, deployment, fullId, grosirShortIds, warungShortIds, type Deployment,
} from "./config.js";
import type { Logger } from "./log.js";
import { DEPOSIT_MSG, ftTransferCallArgs, policyArgs, policyMatches } from "./protocol.js";
import { formatNear, mapLimit, sleep } from "./util.js";

export interface SetupSummary {
  readonly created: readonly string[];
  readonly existing: readonly string[];
  readonly rootBefore: bigint;
  readonly rootAfter: bigint;
}

const COOLDOWN = /wait one hour/i;
const WAIT_KEY_ATTEMPTS = 15;
const WAIT_KEY_MS = 1_500;
const SETUP_CONCURRENCY = 2;
const SETUP_RETRY = { attempts: 5, baseMs: 4_000, isRetryable: isTransientError } as const;


async function accountExists(p: Provider, id: string): Promise<boolean> {
  try {
    await p.viewAccount({ accountId: id });
    return true;
  } catch (e) {
    if (isNotFoundError(e)) return false;
    throw e;
  }
}

async function keyOnChain(p: Provider, account: string, publicKey: string) {
  try {
    return await p.viewAccessKey({ accountId: account, publicKey });
  } catch (e) {
    if (isNotFoundError(e)) return null;
    throw e;
  }
}

/** Aborts BEFORE creating anything if root would end up below the safety floor. */
export function assertRootCanFund(rootBalance: bigint, toCreate: number): void {
  const left = rootBalance - ACCOUNT_FUNDING * BigInt(toCreate);
  if (left < ROOT_MIN_BALANCE) {
    throw new Error(
      `abort: creating ${toCreate} accounts leaves root at ${formatNear(left)} (< ${formatNear(ROOT_MIN_BALANCE)}); nothing was created`,
    );
  }
}

async function ensureKey(id: string): Promise<StoredKey> {
  const existing = await loadFullAccessKey(id);
  if (existing !== null) return existing;
  const key = generateKey();
  await saveFullAccessKey(id, key); // saved BEFORE the account exists so the key is never lost
  return key;
}

async function requireKey(id: string): Promise<StoredKey> {
  const k = await loadFullAccessKey(id);
  if (k === null) throw new Error(`${id} exists on chain but has no key in ~/.near-credentials/testnet`);
  return k;
}

interface Ctx {
  readonly dep: Deployment;
  readonly provider: Provider;
  readonly probe: Provider;
  readonly views: Views;
  readonly recorder: Recorder;
  readonly log: Logger;
}

async function waitForKey(c: Ctx, id: string, pk: string): Promise<void> {
  for (let i = 0; i < WAIT_KEY_ATTEMPTS; i += 1) {
    if ((await keyOnChain(c.probe, id, pk)) !== null) return;
    await sleep(WAIT_KEY_MS);
  }
  throw new Error(`${id}: full-access key not visible on chain after creation`);
}

const logTx = (c: Ctx, r: ActionRecord): void => {
  c.log.info(`    ${r.status === "ok" ? "ok  " : "FAIL"} ${r.method} ${r.explorer_url ?? ""} ${r.error ?? ""}`.trimEnd());
};

async function tryFaucet(c: Ctx, a: Actor): Promise<void> {
  const r = await a.call({ contract: c.dep.tidr, method: "faucet", args: {}, gas: GAS.faucet, role: "setup" });
  if (r.status === "ok") return logTx(c, r);
  if (r.error !== null && COOLDOWN.test(r.error)) return c.log.info("    faucet cooldown active: skipped");
  logTx(c, r);
  throw new Error(`${a.id}: faucet failed: ${r.error}`);
}

async function depositWarung(c: Ctx, a: Actor): Promise<void> {
  const avail = BigInt((await c.views.balance(a.id)).available);
  const need = avail >= WARUNG_DEPOSIT ? 0n : WARUNG_DEPOSIT - avail;
  if (need === 0n) return c.log.info(`    market balance ${avail} ok`);
  if ((await c.views.tokenBalance(a.id)) < need) await tryFaucet(c, a);
  const wallet = await c.views.tokenBalance(a.id);
  const amount = wallet < need ? wallet : need;
  if (amount === 0n) return c.log.info("    no tIDR in wallet to deposit (faucet cooling down)");
  const r = await a.call({
    contract: c.dep.tidr, method: "ft_transfer_call", args: ftTransferCallArgs(c.dep.market, amount, DEPOSIT_MSG),
    deposit: ONE_YOCTO, gas: GAS.ftTransferCall, role: "setup", expectEvent: "deposit",
  });
  logTx(c, r);
  if (r.status !== "ok") throw new Error(`${a.id}: deposit failed: ${r.error}`);
}

async function ensurePolicy(c: Ctx, a: Actor): Promise<void> {
  const items = await c.views.items();
  const refs = Object.fromEntries(items.map((i) => [i.id, BigInt(i.ref_price)]));
  const wanted = policyArgs(refs, WARUNG_WEEKLY_BUDGET);
  if (policyMatches(await c.views.policy(a.id), wanted.policy)) return c.log.info("    policy ok");
  const r = await a.call({
    contract: c.dep.market, method: "set_policy", args: wanted, deposit: ONE_YOCTO, gas: GAS.setPolicy, role: "setup",
  });
  logTx(c, r);
  if (r.status !== "ok") throw new Error(`${a.id}: set_policy failed: ${r.error}`);
}

function fcPermissionOk(view: { permission: unknown } | null, receiver: string): boolean {
  const perm = view?.permission as { FunctionCall?: { receiver_id: string; method_names: string[] } } | undefined;
  const fc = perm?.FunctionCall;
  return fc !== undefined && fc.receiver_id === receiver && fc.method_names.length === 1 && fc.method_names[0] === "join_round";
}

async function ensureFcKey(c: Ctx, a: Actor): Promise<void> {
  const saved = await loadFcKey(a.id);
  if (saved !== null && fcPermissionOk(await keyOnChain(c.probe, a.id, saved.public_key), c.dep.market)) {
    return c.log.info("    function-call key ok");
  }
  // Reuse a saved-but-not-yet-added key so a retry never orphans an earlier add.
  const key: StoredKey = saved !== null ? { publicKey: saved.public_key, privateKey: saved.private_key } : generateKey();
  if (saved === null) {
    await saveFcKey({
      account_id: a.id, public_key: key.publicKey, private_key: key.privateKey, receiver_id: c.dep.market,
      method_names: ["join_round"], allowance_yocto: FC_KEY_ALLOWANCE.toString(),
    }); // saved before the on-chain add, so a crash cannot lose it
  }
  const out = await a.enqueue(() =>
    a.account("full").addFunctionCallAccessKey({
      publicKey: key.publicKey, contractId: c.dep.market, methodNames: ["join_round"], allowance: FC_KEY_ALLOWANCE,
    }),
  );
  c.log.info(`    added function-call key (join_round only) -> ${fcKeyPath(a.id)} tx ${out.transaction.hash}`);
}

async function setupOne(c: Ctx, id: string, isWarung: boolean, key: StoredKey): Promise<void> {
  const actor = new Actor(id, c.provider, c.recorder, { full: key.privateKey });
  c.log.info(`  ${id}`);
  await waitForKey(c, id, key.publicKey);
  if (isWarung) {
    await depositWarung(c, actor);
    await ensurePolicy(c, actor);
    await ensureFcKey(c, actor);
    return;
  }
  const wallet = await c.views.tokenBalance(id);
  if (wallet < GROSIR_MIN_WALLET) await tryFaucet(c, actor);
  else c.log.info(`    wallet ${wallet} tIDR ok (bonds are paid from the wallet)`);
}

async function createMissing(c: Ctx, root: Actor, missing: readonly string[]): Promise<void> {
  for (const id of missing) {
    const key = await ensureKey(id);
    const out = await root.enqueue(() =>
      root.account("full").createAccount({ newAccountId: id, publicKey: key.publicKey, nearToTransfer: ACCOUNT_FUNDING }),
    );
    c.log.info(`  created ${id} (${formatNear(ACCOUNT_FUNDING)}) tx ${out.transaction.hash}`);
  }
}

export async function runSetup(opts: { root?: string; log: Logger }): Promise<SetupSummary> {
  const dep = deployment(opts.root);
  const provider = createProvider();
  const recorder = new Recorder();
  const probe = createProbeProvider();
  const c: Ctx = { dep, provider, probe, views: new Views(provider, dep.market, dep.tidr), recorder, log: opts.log };
  const rootKey = await loadFullAccessKey(dep.root);
  if (rootKey === null) throw new Error(`no key for ${dep.root} in ~/.near-credentials/testnet`);
  const root = new Actor(dep.root, provider, recorder, { full: rootKey.privateKey });

  const wanted = [
    ...warungShortIds().map((s) => ({ id: fullId(s, dep.root), warung: true })),
    ...grosirShortIds().map((s) => ({ id: fullId(s, dep.root), warung: false })),
  ];
  const flags = await mapLimit(wanted, 5, (w) => accountExists(probe, w.id));
  const missing = wanted.filter((_, i) => !flags[i]).map((w) => w.id);
  const rootBefore = (await provider.viewAccount({ accountId: dep.root })).amount as bigint;
  c.log.info(`root ${dep.root}: ${formatNear(rootBefore)}; ${missing.length} account(s) to create`);
  assertRootCanFund(rootBefore, missing.length);

  await createMissing(c, root, missing);
  const keys = await Promise.all(wanted.map((w) => requireKey(w.id)));
  await mapLimit(wanted, SETUP_CONCURRENCY, (w, i) =>
    withRetry(() => setupOne(c, w.id, w.warung, keys[i] as StoredKey), SETUP_RETRY),
  );

  const rootAfter = (await provider.viewAccount({ accountId: dep.root })).amount as bigint;
  const existing = wanted.map((w) => w.id).filter((id) => !missing.includes(id));
  return { created: missing, existing, rootBefore, rootAfter };
}
