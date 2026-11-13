/** `pnpm daemon`: koordinator + our grosirs + seeded warungs + delegated warungs + HTTP API. */
import { estimateBurn } from "./budget.js";
import { serviceDelegation } from "./delegation.js";
import { VERSION, RateLimiter, type ApiDeps } from "./api.js";
import type { DaemonConfig } from "./env.js";
import { Events } from "./events.js";
import { installShutdown, runLoop, Stopper } from "./loop.js";
import { buildRuntime, type Runtime } from "./runtime.js";
import { startServer } from "./server.js";
import { buildStatus } from "./status.js";
import type { TickRoles } from "./tick.js";

const DAEMON_ROLES: TickRoles = { koordinator: true, grosirs: true, seeded: true, delegated: true };

function apiDeps(rt: Runtime): ApiDeps {
  return {
    state: rt.state, events: rt.events, now: Date.now, startedAtMs: Date.now(),
    items: async () => rt.cache.items?.list ?? (await rt.views.items()),
    accessKey: (a, pk) => rt.views.accessKey(a, pk),
    delegation: (a) => serviceDelegation(rt, a),
    status: () => buildStatus(rt), limiter: new RateLimiter(),
  };
}

function announce(rt: Runtime, cfg: DaemonConfig): void {
  const est = estimateBurn(cfg);
  const c = cfg.cadence;
  rt.events.emit({
    kind: "startup",
    message: `koelakan daemon v${VERSION} on ${cfg.dep.market}: a round every ${c.round_every_min} min ` +
      `(join ${c.join_secs}s, commit ${c.commit_secs}s, reveal ${c.reveal_secs}s, delivery ${c.delivery_secs}s); ` +
      `~${est.rounds_per_day.toFixed(1)} rounds/day, est. burn ${est.near_per_round.toFixed(4)} NEAR/round = ${est.near_per_day.toFixed(3)} NEAR/day`,
  });
  const missing = rt.health.missingKeys();
  if (missing.length > 0) rt.events.emit({ kind: "missing_keys", message: `no key for ${missing.length} account(s): ${missing.join(", ")}` });
  if (rt.servicePublicKey === null) rt.events.emit({ kind: "no_service_key", message: "SERVICE_KEY not set: delegated warungs are disabled" });
}

export async function runDaemon(cfg: DaemonConfig): Promise<void> {
  const events = new Events();
  const rt = await buildRuntime(cfg, events, { roles: { koordinator: true, seeded: true } });
  announce(rt, cfg);
  const server = startServer(apiDeps(rt), cfg.port, cfg.allowedOrigins, cfg.trustProxy);
  events.emit({ kind: "listening", message: `HTTP API on :${cfg.port}` });
  const stop = new Stopper();
  const done = runLoop(rt, DAEMON_ROLES, stop);
  installShutdown(rt, stop, done, () => new Promise((resolve) => server.close(() => resolve())));
  await done;
}
