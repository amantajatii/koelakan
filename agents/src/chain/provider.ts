/** RPC provider with failover plus retry/backoff helpers. */
import { JsonRpcProvider, type Provider } from "near-api-js";
import { DEFAULT_RPC_URLS } from "../config.js";

const RPC_RETRIES = 6;
const RPC_WAIT_MS = 700;
const RPC_BACKOFF = 1.6;
/** Public RPCs rate-limit hard: ~5 requests/s, then a pause after any 429. */
export const THROTTLE_GAP_MS = 200;
export const THROTTLE_COOLDOWN_MS = 3_000;

/** `NEAR_RPC_URL` (if set) goes first; the defaults follow as fallbacks. */
export function rpcUrls(env: Record<string, string | undefined> = process.env): string[] {
  const custom = env.NEAR_RPC_URL?.trim();
  const all = custom ? [custom, ...DEFAULT_RPC_URLS] : [...DEFAULT_RPC_URLS];
  return [...new Set(all)];
}

const TRANSIENT = /429|too many requests|rate limit|timeout|timed out|ECONNRESET|ETIMEDOUT|fetch failed|502|503|504|socket hang up|Exceeded \d+ providers/i;

export function isTransientError(e: unknown): boolean {
  return TRANSIENT.test(e instanceof Error ? `${e.name} ${e.message}` : String(e));
}

export interface RetryOptions {
  readonly attempts: number;
  readonly baseMs: number;
  readonly isRetryable: (e: unknown) => boolean;
  readonly sleep?: (ms: number) => Promise<void>;
}

export const sleepMs = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

/** Exponential backoff: baseMs, 2x, 4x ... Rethrows the last error. */
export async function withRetry<T>(fn: () => Promise<T>, opts: RetryOptions): Promise<T> {
  const sleep = opts.sleep ?? sleepMs;
  let lastError: unknown;
  for (let i = 0; i < opts.attempts; i += 1) {
    try {
      return await fn();
    } catch (e) {
      lastError = e;
      if (i === opts.attempts - 1 || !opts.isRetryable(e)) break;
      await sleep(opts.baseMs * 2 ** i);
    }
  }
  throw lastError;
}

export const VIEW_RETRY: Omit<RetryOptions, "sleep"> = { attempts: 6, baseMs: 800, isRetryable: isTransientError };

export interface ThrottleOptions {
  readonly gapMs?: number;
  readonly cooldownMs?: number;
  readonly clock?: () => number;
  readonly sleep?: (ms: number) => Promise<void>;
}

/**
 * Wraps fetch so request starts are spaced `gapMs` apart and a 429 pauses everyone for `cooldownMs`.
 * Slots are reserved synchronously, so concurrent callers queue in order.
 */
export function throttleFetch(base: typeof fetch, o: ThrottleOptions = {}): typeof fetch {
  const gap = o.gapMs ?? THROTTLE_GAP_MS;
  const cooldown = o.cooldownMs ?? THROTTLE_COOLDOWN_MS;
  const clock = o.clock ?? Date.now;
  const sleep = o.sleep ?? sleepMs;
  let nextAt = 0;
  return async (input, init) => {
    const slot = Math.max(clock(), nextAt);
    nextAt = slot + gap;
    const wait = slot - clock();
    if (wait > 0) await sleep(wait);
    const res = await base(input, init);
    if (res.status === 429) nextAt = Math.max(nextAt, clock() + cooldown);
    return res;
  };
}

let throttleInstalled = false;

/** Installs the throttle on the global fetch used by near-api-js (idempotent). */
export function installThrottle(): void {
  if (throttleInstalled) return;
  throttleInstalled = true;
  globalThis.fetch = throttleFetch(globalThis.fetch.bind(globalThis));
}

function jsonRpc(url: string): JsonRpcProvider {
  return new JsonRpcProvider({ url }, { retries: RPC_RETRIES, wait: RPC_WAIT_MS, backoff: RPC_BACKOFF });
}

/**
 * Provider that tries each endpoint in order, but ONLY moves on for transient errors (429, timeouts).
 * Real answers such as "account does not exist" are returned at once. Silent, unlike FailoverRpcProvider.
 */
export function createProvider(urls: readonly string[] = rpcUrls()): Provider {
  installThrottle();
  const providers = urls.map(jsonRpc);
  const primary = providers[0];
  if (primary === undefined) throw new Error("no RPC url configured");
  return new Proxy(primary, {
    get(target, prop) {
      const value = Reflect.get(target, prop) as unknown;
      if (typeof value !== "function") return value;
      return async (...args: unknown[]) => {
        let last: unknown;
        for (const p of providers) {
          try {
            return await (Reflect.get(p, prop) as (...a: unknown[]) => unknown).apply(p, args);
          } catch (e) {
            last = e;
            if (!isTransientError(e)) throw e;
          }
        }
        throw last;
      };
    },
  }) as Provider;
}

/** Single-endpoint provider, kept for callers that must not fail over. */
export function createProbeProvider(urls: readonly string[] = rpcUrls()): Provider {
  installThrottle();
  const first = urls[0];
  if (first === undefined) throw new Error("no RPC url configured");
  return jsonRpc(first);
}
