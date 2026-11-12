// Tiny local stand-in for the agent service, serving the fixed contract shapes.
// Usage: node scripts/mock-agent-api.mjs [port]   then NEXT_PUBLIC_AGENT_API_URL=http://localhost:8799
import { createServer } from "node:http";

const port = Number(process.argv[2] ?? 8799);
const started = Date.now();
const iso = (offsetMs) => new Date(Date.now() + offsetMs).toISOString();
const warungs = new Map();
// Seed one owner so a design-review session with NEXT_PUBLIC_DEV_FIXTURE_ACCOUNT=warung-01.koelakan.testnet shows a filled screen.
warungs.set("warung-01.koelakan.testnet", {
  account_id: "warung-01.koelakan.testnet", demand: { "beras-medium": 20, "gula-pasir": 10, "telur-ayam": 0, "minyak-curah": 0 },
  registered_at: new Date().toISOString(), updated_at: new Date().toISOString(), delegated: true, auto_join: true,
  last_actions: [{ at: new Date(Date.now() - 90_000).toISOString(), round_id: 1, action: "joined", qty: 20, reason: null, tx: null }],
});

const status = () => ({
  ok: true, network: "testnet", market: "market.koelakan.testnet",
  service_public_key: "ed25519:6E8sCci9badyRkXb3JoRpBj5p8C6Tw41ELDZoiihKEtp",
  service_fc_allowance_near: "0.25", tick_secs: 15, last_tick_at: iso(-12_000),
  cadence: { round_every_min: 10, join_secs: 120, commit_secs: 60, reveal_secs: 60, delivery_secs: 120 },
  next_open_at: iso(200_000),
  active_rounds: [{ id: 1, item: "beras-medium", phase: "Closed" }],
  agents: {
    grosir: [
      { account_id: "grosir-1.koelakan.testnet", near: "1.4210", tidr_wallet: "9500000", market_available: "320000", paused: false },
      { account_id: "grosir-2.koelakan.testnet", near: "0.0042", tidr_wallet: "4100000", market_available: "0", paused: true },
    ],
    seeded_warungs: 20, delegated_warungs: 3,
  },
  budget: { est_near_per_day: "0.4", low_accounts: ["grosir-2.koelakan.testnet"] },
  recent_events: [
    { at: iso(-60_000), kind: "round_opened", round_id: 1, account: null, message: "Opened round for medium rice", tx: "5d8e9dAbCdEf0123456789abcdef0123456789abcd" },
    { at: iso(-30_000), kind: "bid_revealed", round_id: 1, account: "grosir-1.koelakan.testnet", message: "Revealed bid Rp11,924", tx: null },
  ],
});

const send = (res, code, body) => {
  res.writeHead(code, { "content-type": "application/json", "access-control-allow-origin": "*", "access-control-allow-headers": "content-type" });
  res.end(JSON.stringify(body));
};

createServer((req, res) => {
  if (req.method === "OPTIONS") return send(res, 204, {});
  const url = new URL(req.url, "http://x");
  if (url.pathname === "/health") return send(res, 200, { ok: true, version: "mock", uptime_s: Math.floor((Date.now() - started) / 1000) });
  if (url.pathname === "/status") return send(res, 200, status());
  const m = /^\/warungs\/(.+)$/.exec(url.pathname);
  if (m && req.method === "GET") {
    const w = warungs.get(decodeURIComponent(m[1]));
    return w ? send(res, 200, w) : send(res, 404, { ok: false, error: "not_registered" });
  }
  if (url.pathname === "/warungs" && req.method === "POST") {
    let raw = "";
    req.on("data", (c) => (raw += c));
    req.on("end", () => {
      try {
        const b = JSON.parse(raw);
        const msg = JSON.parse(b.message);
        if (b.recipient !== "koelakan-agent") return send(res, 400, { ok: false, error: "bad_request", detail: "recipient" });
        warungs.set(b.account_id, {
          account_id: b.account_id, demand: msg.demand, registered_at: iso(0), updated_at: iso(0), delegated: false, auto_join: true,
          last_actions: [{ at: iso(-5000), round_id: 1, action: "skipped", qty: null, reason: "round already closed", tx: null }],
        });
        send(res, 200, { ok: true });
      } catch {
        send(res, 400, { ok: false, error: "bad_request", detail: "invalid JSON" });
      }
    });
    return;
  }
  send(res, 404, { ok: false, error: "not_found" });
}).listen(port, () => console.log(`mock agent API on http://localhost:${port}`));
