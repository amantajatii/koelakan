import { describe, expect, it, vi } from "vitest";
import { isTransientError, rpcUrls, throttleFetch, withRetry } from "../src/chain/provider.js";

describe("rpcUrls", () => {
  it("defaults to fastnear with near.org as fallback", () => {
    expect(rpcUrls({})).toEqual(["https://rpc.testnet.fastnear.com", "https://rpc.testnet.near.org"]);
  });

  it("puts NEAR_RPC_URL first and de-duplicates", () => {
    expect(rpcUrls({ NEAR_RPC_URL: "https://my.rpc" })[0]).toBe("https://my.rpc");
    expect(rpcUrls({ NEAR_RPC_URL: "https://rpc.testnet.near.org" })).toHaveLength(2);
  });
});

describe("withRetry", () => {
  const noSleep = async () => undefined;

  it("retries retryable errors with exponential backoff, then succeeds", async () => {
    const delays: number[] = [];
    let n = 0;
    const out = await withRetry(async () => { n += 1; if (n < 3) throw new Error("429"); return "ok"; }, {
      attempts: 5, baseMs: 100, isRetryable: isTransientError, sleep: async (ms) => { delays.push(ms); },
    });
    expect(out).toBe("ok");
    expect(delays).toEqual([100, 200]);
  });

  it("does not retry non-retryable errors", async () => {
    const fn = vi.fn(async () => { throw new Error("hash mismatch"); });
    await expect(withRetry(fn, { attempts: 5, baseMs: 1, isRetryable: isTransientError, sleep: noSleep })).rejects.toThrow("hash mismatch");
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("gives up after the attempt budget and rethrows the last error", async () => {
    const fn = vi.fn(async () => { throw new Error("rate limit"); });
    await expect(withRetry(fn, { attempts: 3, baseMs: 1, isRetryable: isTransientError, sleep: noSleep })).rejects.toThrow("rate limit");
    expect(fn).toHaveBeenCalledTimes(3);
  });
});

describe("isTransientError", () => {
  it("flags rate limits and provider exhaustion, not contract errors", () => {
    expect(isTransientError(new Error("Rate limits exceeded"))).toBe(true);
    expect(isTransientError(new Error("Exceeded 2 providers to execute request"))).toBe(true);
    expect(isTransientError(new Error("Account x does not exist"))).toBe(false);
  });
});

describe("throttleFetch", () => {
  it("spaces request starts by gapMs and pauses after a 429", async () => {
    let now = 0;
    const starts: number[] = [];
    const statuses = [200, 429, 200];
    const base = (async () => { starts.push(now); return { status: statuses.shift() ?? 200 } as Response; }) as unknown as typeof fetch;
    const f = throttleFetch(base, { gapMs: 200, cooldownMs: 3000, clock: () => now, sleep: async (ms) => { now += ms; } });
    await f("u");
    await f("u");
    await f("u");
    expect(starts).toEqual([0, 200, 3200]);
  });
});
