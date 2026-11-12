import { config } from "./config";
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
    throw new RpcError("Tidak bisa menghubungi node NEAR.", "network");
  }
  if (res.status === 429) throw new RpcError("Node NEAR membatasi permintaan (429).", "rate_limit");
  if (!res.ok) throw new RpcError(`Node NEAR membalas ${res.status}.`, "network");
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
  if (!result?.result) throw new RpcError("Balasan node kosong.", "unknown");
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
  throw last instanceof Error ? last : new RpcError("Gagal membaca data dari chain.", "unknown");
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
  throw new RpcError("Tidak bisa membaca waktu blok.", "network");
}
