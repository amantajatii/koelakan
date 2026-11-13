/** The tick loop with graceful stop: a tick never overlaps another, errors never end the loop. */
import type { Runtime } from "./runtime.js";
import { tick, type TickRoles } from "./tick.js";

export class Stopper {
  private requestedFlag = false;
  private wake: (() => void) | null = null;

  get requested(): boolean {
    return this.requestedFlag;
  }

  request(): void {
    this.requestedFlag = true;
    this.wake?.();
  }

  /** Resolves after `ms`, or immediately when stop is requested. */
  sleep(ms: number): Promise<void> {
    if (this.requestedFlag) return Promise.resolve();
    return new Promise((resolve) => {
      const timer = setTimeout(() => {
        this.wake = null;
        resolve();
      }, ms);
      this.wake = () => {
        clearTimeout(timer);
        this.wake = null;
        resolve();
      };
    });
  }
}

export async function runLoop(rt: Runtime, roles: TickRoles, stop: Stopper): Promise<void> {
  while (!stop.requested) {
    try {
      await tick(rt, roles, Date.now(), () => stop.requested);
    } catch (e) {
      rt.events.emit({ kind: "error", message: `tick failed: ${e instanceof Error ? e.message : String(e)}` });
    }
    await stop.sleep(rt.cfg.tickSecs * 1000);
  }
  await rt.cache.background; // let in-flight housekeeping txs finish
}

const SHUTDOWN_GRACE_MS = 30_000;

/** SIGTERM/SIGINT: ask the loop to finish its current tx, then run `onDone` (close server). */
export function installShutdown(rt: Runtime, stop: Stopper, loopDone: Promise<void>, onDone: () => Promise<void>): void {
  let started = false;
  const handler = (signal: string): void => {
    if (started) return;
    started = true;
    rt.events.emit({ kind: "shutdown", message: `${signal} received: finishing the current action` });
    stop.request();
    const hard = setTimeout(() => process.exit(1), SHUTDOWN_GRACE_MS);
    hard.unref();
    void loopDone.then(onDone).then(() => {
      rt.events.emit({ kind: "stopped", message: "state flushed, bye" });
      process.exit(0);
    });
  };
  process.on("SIGTERM", () => handler("SIGTERM"));
  process.on("SIGINT", () => handler("SIGINT"));
}
