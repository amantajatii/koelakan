/** Is the SERVICE public key currently a join_round-only function-call key on an account? (cached 30 s) */
import type { DelegationInfo, Runtime } from "./runtime.js";

const DELEGATION_TTL_MS = 30_000;
const JOIN_METHOD = "join_round";

export async function serviceDelegation(rt: Runtime, account: string, now: number = Date.now()): Promise<DelegationInfo> {
  const hit = rt.cache.delegation.get(account);
  if (hit !== undefined && now - hit.at < DELEGATION_TTL_MS) return hit.value;
  const pk = rt.servicePublicKey;
  const [key, policy] = await Promise.all([pk === null ? null : rt.views.accessKey(account, pk), rt.views.policy(account)]);
  const delegated =
    key !== null && key.kind === "function-call" && key.receiver === rt.cfg.dep.market && key.methods.includes(JOIN_METHOD);
  const value: DelegationInfo = { delegated, autoJoin: policy === null ? null : policy.auto_join };
  rt.cache.delegation.set(account, { at: now, value });
  return value;
}
