import { config } from "./config";
import type { AccessKeyView } from "./delegation";
import { parseChainJson } from "./json";

/** Minimum gap between two RPC requests. The public endpoint allows about 5 req/s. */
const MIN_GAP_MS = 220;
const MAX_ATTEMPTS = 3;

export class RpcError extends Error {
  constructor(
    message: string,
    readonly kind: "rate_limit" | "network" | "contract" | "unknown",
  ) {
    super(message);
    this.name = "RpcError";
  }
}

let lastStart = 0;
let tail: Promise<unknown> = Promise.resolve();

/** Serialise request starts so bursts never exceed the endpoint's rate limit. */
function throttled<T>(task: () => Promise<T>): Promise<T> {
  const run = tail.then(async () => {
    const wait = lastStart + MIN_GAP_MS - Date.now();
    if (wait > 0) await new Promise((r) => setTimeout(r, wait));
    lastStart = Date.now();
    return task();
  });
  tail = run.catch(() => undefined);
  return run;
}

interface RpcEnvelope {
  result?: { result?: number[]; error?: string; block_height?: number };
  error?: { message?: string; data?: unknown; cause?: { name?: string } };
}

async function post(url: string, body: unknown): Promise<RpcEnvelope> {
  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
      cache: "no-store",
    });
  } catch {
    throw new RpcError("Could not reach the NEAR node.", "network");
  }
  if (res.status === 429) throw new RpcError("The NEAR node is rate limiting requests (429).", "rate_limit");
  if (!res.ok) throw new RpcError(`The NEAR node answered ${res.status}.`, "network");
  return (await res.json()) as RpcEnvelope;
}

function decodeBytes(bytes: number[]): string {
  return new TextDecoder().decode(Uint8Array.from(bytes));
}

async function callOnce<T>(url: string, contract: string, method: string, args: unknown): Promise<T> {
  const argsBase64 = btoa(JSON.stringify(args));
  const env = await post(url, {
    jsonrpc: "2.0",
    id: "koelakan",
    method: "query",
    params: {
      request_type: "call_function",
      finality: "final",
      account_id: contract,
      method_name: method,
      args_base64: argsBase64,
    },
  });
  if (env.error) {
    throw new RpcError(env.error.message ?? "RPC error", "unknown");
  }
  const result = env.result;
  if (result?.error) throw new RpcError(result.error, "contract");
  if (!result?.result) throw new RpcError("The NEAR node returned an empty answer.", "unknown");
  return parseChainJson<T>(decodeBytes(result.result));
}

const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

/** Read-only contract call with throttling, retry with backoff, and a fallback endpoint. */
export async function viewCall<T>(contract: string, method: string, args: unknown = {}): Promise<T> {
  const urls = [config.rpcUrl, config.rpcFallbackUrl];
  let last: unknown;
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const url = urls[attempt % urls.length] ?? config.rpcUrl;
    try {
      return await throttled(() => callOnce<T>(url, contract, method, args));
    } catch (e) {
      last = e;
      if (e instanceof RpcError && e.kind === "contract") throw e;
      await sleep(400 * (attempt + 1));
    }
  }
  throw last instanceof Error ? last : new RpcError("Could not read data from the chain.", "unknown");
}

/** Latest block time (ms), used to correct for a skewed browser clock. */
export async function fetchChainTimeMs(): Promise<number> {
  const urls = [config.rpcUrl, config.rpcFallbackUrl];
  for (const url of urls) {
    try {
      const res = await throttled(() =>
        fetch(url, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ jsonrpc: "2.0", id: "koelakan", method: "block", params: { finality: "final" } }),
          cache: "no-store",
        }),
      );
      const json = (await res.json()) as { result?: { header?: { timestamp?: number | string } } };
      const ts = json.result?.header?.timestamp;
      if (ts !== undefined) return Number(BigInt(ts) / 1_000_000n);
    } catch {
      // try the next endpoint
    }
  }
  throw new RpcError("Could not read the block time.", "network");
}

interface AccessKeyEnvelope {
  result?: { permission?: unknown; error?: string };
  error?: { message?: string };
}

/**
 * Read one access key of an account, or null if that key is not on the account.
 * Uses `view_access_key`, so delegation can be detected even if the service never heard of the owner.
 */
export async function fetchAccessKey(accountId: string, publicKey: string): Promise<AccessKeyView | null> {
  const urls = [config.rpcUrl, config.rpcFallbackUrl];
  let last: unknown;
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const url = urls[attempt % urls.length] ?? config.rpcUrl;
    try {
      const env = (await throttled(async () => {
        const res = await fetch(url, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            jsonrpc: "2.0",
            id: "koelakan",
            method: "query",
            params: { request_type: "view_access_key", finality: "final", account_id: accountId, public_key: publicKey },
          }),
          cache: "no-store",
        });
        if (!res.ok) throw new RpcError(`The NEAR node answered ${res.status}.`, "network");
        return (await res.json()) as AccessKeyEnvelope;
      })) as AccessKeyEnvelope;
      const message = env.error?.message ?? env.result?.error ?? "";
      if (/does not exist|unknown.?access.?key|UNKNOWN_ACCESS_KEY|doesn't exist/i.test(message) || /UNKNOWN_ACCOUNT/i.test(JSON.stringify(env.error ?? ""))) return null;
      if (env.error || env.result?.error) throw new RpcError(message || "RPC error", "unknown");
      return env.result as unknown as AccessKeyView;
    } catch (e) {
      last = e;
      await sleep(400 * (attempt + 1));
    }
  }
  throw last instanceof Error ? last : new RpcError("Could not read the access key.", "unknown");
}
