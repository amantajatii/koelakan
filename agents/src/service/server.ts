/** Thin node:http wrapper around handleApi: CORS, JSON body, client IP. */
import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import { handleApi, type ApiDeps } from "./api.js";

const MAX_BODY_BYTES = 16 * 1024;

export function corsHeaders(origin: string | undefined, allowed: readonly string[]): Record<string, string> {
  const base = { Vary: "Origin", "Access-Control-Allow-Methods": "GET, POST, OPTIONS", "Access-Control-Allow-Headers": "Content-Type", "Access-Control-Max-Age": "600" };
  return origin !== undefined && allowed.includes(origin) ? { ...base, "Access-Control-Allow-Origin": origin } : base;
}

function clientIp(req: Pick<IncomingMessage, "headers" | "socket">, trustProxy: boolean): string {
  const fwd = req.headers["x-forwarded-for"];
  const first = (Array.isArray(fwd) ? fwd[0] : fwd)?.split(",")[0]?.trim();
  return trustProxy && first ? first : (req.socket.remoteAddress ?? "unknown");
}

function readBody(req: IncomingMessage): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let size = 0;
    req.on("data", (c: Buffer) => {
      size += c.length;
      if (size > MAX_BODY_BYTES) {
        reject(new Error("body too large"));
        req.destroy();
        return;
      }
      chunks.push(c);
    });
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

function send(res: ServerResponse, status: number, body: unknown, headers: Record<string, string>): void {
  res.writeHead(status, { "Content-Type": "application/json", ...headers });
  res.end(JSON.stringify(body));
}

export function startServer(d: ApiDeps, port: number, allowed: readonly string[], trustProxy: boolean): Server {
  const server = createServer((req, res) => {
    const cors = corsHeaders(req.headers.origin, allowed);
    if (req.method === "OPTIONS") {
      res.writeHead(204, cors);
      res.end();
      return;
    }
    void (async () => {
      let body: unknown;
      if (req.method === "POST") {
        try {
          const raw = (await readBody(req)).toString("utf8");
          body = raw === "" ? undefined : JSON.parse(raw);
        } catch {
          send(res, 400, { ok: false, error: "bad_request", detail: "body must be JSON (max 16 KB)" }, cors);
          return;
        }
      }
      const path = (req.url ?? "/").split("?")[0] ?? "/";
      const out = await handleApi(d, { method: req.method ?? "GET", path, body, ip: clientIp(req, trustProxy) });
      send(res, out.status, out.body, cors);
    })();
  });
  server.listen(port);
  return server;
}
