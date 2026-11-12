# Koelakan agents

TypeScript agents that run a **real Koelakan round on NEAR testnet**, end to end:

- 20 **warung agents** join rounds with a function-call key that can only call `join_round`.
- 5 **grosir agents** commit and reveal sealed bids (commit-reveal, bond in tIDR). `grosir-5` is scripted to never reveal, so the bond-forfeit path runs.
- A **koordinator** opens the round, then settles and finalizes it.
- After settle, most warung owners confirm delivery ("owner confirms via WhatsApp"). One stays silent, so the silence-means-acceptance path runs at finalize.
- Afterwards the same actions are replayed through the sim's TypeScript engine and compared with the chain (`MATCH` / `MISMATCH`).

Agents share their strategy with the simulation: warung demand and grosir cost/margin are imported from `sim/src/config.ts` (seeded; grosir costs are labelled ASSUMPTIONS there). Reference prices are the real PIHPS numbers stored on-chain.

## Requirements

- Node 22+ and pnpm.
- The testnet deployment from `scripts/deploy-testnet.sh`, and the root account's full-access key in `~/.near-credentials/testnet/koelakan.testnet.json` (legacy near-cli format).
- `NEAR_RPC_URL` (optional) overrides the primary RPC. Default is `https://rpc.testnet.fastnear.com`, with `https://rpc.testnet.near.org` as fallback.
- `KOELAKAN_ROOT` (optional) overrides the parent account (default `koelakan.testnet`).

## Do X, see Y

```sh
cd agents
pnpm install

# 1. Unit tests and types (no network)
pnpm test            # see: all tests pass
pnpm tsc --noEmit    # see: no output

# 2. One-time on-chain setup (idempotent, safe to re-run)
pnpm run setup       # see: 25 accounts, tIDR deposits, policies and function-call keys
                     # (note: plain `pnpm setup` is a pnpm built-in; use `pnpm run setup`)

# 3. A full live round
pnpm round           # see: a timeline with tx links, then "cross-check vs sim engine: MATCH"
pnpm round --item gula-pasir --join 120 --commit 60 --reveal 60 --delivery 60
```

`pnpm round` flags: `--item` (default `beras-medium`), `--join/--commit/--reveal/--delivery` seconds (defaults 90/60/60/60, each 30 s .. 30 days), `--min-qty` (default 100). A round takes about five minutes with the defaults.

Expected end of a run:

```
=== round #1: Closed ===
winner: grosir-1.koelakan.testnet  clearing: Rp11,924  ref (PIHPS): Rp16,650
participants: 20  total qty: 301  saving vs PIHPS: Rp1,422,526
forfeited bond: Rp250,583 (grosir-5.koelakan.testnet)  silent warung: warung-18.koelakan.testnet
cross-check vs sim engine: MATCH (56/56 checks)
report: agents/out/round-1.json
```

Each line of the timeline links to `https://testnet.nearblocks.io/txns/<hash>`. The process exits with code 2 if the cross-check reports `MISMATCH`.

### What `pnpm run setup` does

1. Creates `warung-01..20.<root>` and `grosir-1..5.<root>`, 0.09 NEAR each, from root. Existing accounts are skipped. It **aborts before creating anything** if root would end below 0.5 NEAR. Full-access keys are saved to `~/.near-credentials/testnet/<account>.json` (mode 600, saved before the account is created so a key is never lost).
2. Calls `tidr.faucet()` where tIDR is needed (a 1-hour cooldown is skipped, not an error).
3. Warungs: deposits up to 900,000 tIDR into the market (`ft_transfer_call`, `msg = "deposit"`), calls `set_policy` (owner method, 1 yocto) with `max_price[item] = ref_price` and a weekly budget of 2,000,000, then adds a function-call key (`receiver = market`, `methods = ["join_round"]`, allowance 0.05 NEAR) and stores its private key in `agents/.keys/<account>.fck.json` (mode 600).
4. Grosirs: keep their tIDR in the wallet, because a commit bond is paid by `ft_transfer_call` from the wallet. Returned bonds and sale proceeds are credited to the market balance and can be pulled out with `withdraw` (automated by the daemon).

## Security model

| Key | Lives in | Can do | Cannot do |
|---|---|---|---|
| Warung **function-call key** | `agents/.keys/<account>.fck.json` | `join_round` on `market` only, gas allowance 0.05 NEAR | Attach a deposit, so no `withdraw`, `confirm_delivery`, `dispute` or `set_policy`; call any other contract; transfer funds |
| Warung **full-access key** | `~/.near-credentials/testnet/` | Owner actions: `confirm_delivery` (1 yocto) | Used by the runtime only for the owner action, and for setup |
| **Service key** (delegated real warungs) | `SERVICE_KEY` env on the VPS (never in git or the image) | `join_round` on `market` only, as an FC key the OWNER adds to their own account | Anything that needs a deposit, so no `withdraw`, `confirm_delivery`, `dispute`, `set_policy`; it is bounded by the owner's on-chain policy; the owner revokes it by deleting the key |
| Grosir / koordinator keys | `~/.near-credentials/testnet/` | Their own commits, reveals, open/settle/finalize | n/a |

At runtime the warung agent joins **only** through its function-call key (`key: "function-call"` in every `join_round` action). The contract still enforces the owner's policy: ceiling at most `max_price`, weekly budget, and available balance. The worst a stolen function-call key can do is join rounds the policy already allows.

Salts: before a grosir sends a commit, `{market, round_id, seller, price, salt}` is written to `agents/.state/salts.json` (temp file, `fsync`, rename, directory `fsync`). Reveals read the salt back from that file, never from memory. A saved salt is never overwritten.

`agents/.keys/`, `agents/.state/` and `agents/out/` are in the root `.gitignore`. `git status` must never list them.

## Gas and RPC notes

- The runtime requires the signer to afford roughly 10x the prepaid gas at the current price. That is why budgets are modest (30 Tgas for joins, 60 Tgas for `ft_transfer_call`, 150 Tgas for settle/finalize): a fresh 0.09 NEAR account cannot sign a 100 Tgas call.
- Public RPCs rate-limit hard. All requests go through a throttle (about 5 requests/s, a 3 s pause after any 429) and a provider that only falls back to the next endpoint on transient errors. `rpc.testnet.near.org` currently answers 429 most of the time, so the fastnear endpoint does the real work. Set `NEAR_RPC_URL` if you have a paid endpoint.
- Transactions are sent one at a time per account (a per-account queue), so nonces never clash. Across accounts at most 3 run in parallel.

## Output: `agents/out/round-<id>.json`

Written by `pnpm round`. Schema version 1. All amounts are decimal strings (tIDR, or yoctoNEAR where named so); timestamps are ISO 8601 UTC, except chain deadlines inside `round_*`, which are nanoseconds since the epoch, as on-chain.

```jsonc
{
  "schema_version": 1,
  "network": "testnet",
  "contracts": { "market": "...", "tidr": "...", "koordinator": "...", "arbiter": "..." },
  "round_id": 1,
  "item": { "id": "beras-medium", "name": "...", "unit": "kg", "ref_price": "16650", "het": "13500", "source": "PIHPS Nasional", "as_of": "2026-11-11" },
  "params": { "item": "...", "joinSecs": 90, "commitSecs": 60, "revealSecs": 60, "deliverySecs": 60, "minTotalQty": 100 },
  "started_at": "...", "finished_at": "...",
  "summary": {
    "state": "Closed",                  // or "Failed"
    "winner": "grosir-1.<root>",        // null if failed
    "clearing_price": "11924",
    "ceiling_price": "16650", "ref_price": "16650",
    "total_qty": 301, "participants": 20,
    "saving_vs_pihps": "1422526",       // (ref_price - clearing) x total_qty
    "forfeited_bond": "250583", "forfeited_sellers": ["grosir-5.<root>"],
    "silent_warung": "warung-18.<root>" // owner who never confirmed (default-accept path)
  },
  "round_before": { /* get_round right after open_round */ },
  "round_after":  { /* get_round after finalize: participants, bids, winner, phase, saving ... */ },
  "balances_before": { "<account>": { "available": "900000", "held": "0" } },
  "balances_after":  { "<account>": { "available": "...", "held": "0" } },
  "actions": [
    {
      "actor": "warung-03.<root>",
      "role": "warung-agent | grosir | koordinator | owner",
      "contract": "market.<root>", "method": "join_round",
      "args": { "round_id": 1, "qty": 19 },
      "deposit_yocto": "0",
      "key": "function-call | full | none",
      "status": "ok | failed | skipped",   // skipped = agent decided not to act; no tx
      "tx_hash": "...", "explorer_url": "https://testnet.nearblocks.io/txns/...",
      "timestamp": "...",
      "result": null,                        // decoded return value of the call
      "events": [ { "event": "joined", "data": { } } ],  // NEP-297 events + ft_transfer
      "error": null,
      "note": "joined with 19 units (function-call key)"
    }
  ],
  "wa": [
    {
      "t": "...",
      "direction": "agent_to_owner | owner_to_agent",
      "account": "warung-01.<root>", "owner": "Pak Budi",
      "kind": "joined | skipped | settled | failed | bond_forfeited | owner_confirm | delivery_confirmed | auto_accepted",
      "text": "Pak Budi, you're in round #1 with 16 kg of Medium rice (type II), max price Rp16,650/kg.",
      "tx_hash": "..."
    }
  ],
  "crosscheck": {
    "status": "MATCH | MISMATCH",
    "checks": [ { "name": "clearing_price", "chain": "11924", "sim": "11924", "ok": true } ],
    "mismatches": [],
    "error": null
  }
}
```

The `wa` array is sorted by time and written in English, addressed to the fictional owners (names are fixed per warung number in `src/wa.ts`).

### Cross-check

`src/crosscheck.ts` builds a fresh `sim/src/engine.ts` market from the balances before the round, opens a round with the same parameters, then replays the same joins (qty), commits (bonds), reveals (price and salt), settle, confirms and finalize. It compares: state, winner, clearing price, saving vs PIHPS, total qty, forfeited bonds, and for **every** account the available-balance delta and held amount. Any difference is printed as `MISMATCH <check>: chain=... sim=...` and stored in the report.

## Layout

```
src/
  config.ts          constants, gas budgets, deployment layout
  protocol.ts        bid hash, ft msgs, salts, call-argument builders (pure)
  strategy.ts        join / bid decisions on top of the shared sim strategy (pure)
  sim-bridge.ts      the single import point of sim/src
  salts.ts           fsync'd salt store
  chain/             provider (throttle + failover), keys, actor (per-account tx queue), views, recorder
  agents/            warung, grosir (+ live wiring), koordinator
  round.ts           orchestrates one round from on-chain phases
  setup.ts           idempotent testnet setup
  crosscheck.ts      replay through the sim engine
  wa.ts, report.ts   WhatsApp messages and the JSON report
  cli/               pnpm run setup, pnpm round
test/                vitest unit tests (no network)
```

## Limitations

- Rounds are driven by polling `get_round` (every 2 s); there is no event stream yet.
- A grosir pays its bond from its wallet; funds returned by the market stay in the market balance until a `withdraw` (owner action, automated by the daemon). After about four rounds a grosir wallet runs low and the faucet (1M per hour) must be used again (`pnpm run setup` does it).
- Warung deposits (900k) and the 2M weekly budget allow several rounds, after which `pnpm run setup` tops the deposit back up.
- Delivery is simulated: confirmations are scripted owner actions, and there is no dispute path in the live run (the contract supports it).


## Run the 24/7 service

`pnpm daemon` is one Node process with a tick loop (default every 10 s). Every tick derives what to do from chain state plus a few small JSON files in `DATA_DIR`, so a restart never leaves a round stuck.

```sh
pnpm keygen:service                       # once: prints SERVICE_KEY=... (secret shown once) and the public key
export SERVICE_KEY=ed25519:...            # from the line above
pnpm daemon                               # see: JSON log lines, HTTP API on :8787
curl localhost:8787/health                # see: {"ok":true,...}
curl localhost:8787/status                # see: cadence, active rounds, grosir balances, last 50 events
```

What it does each tick:

- **Koordinator**: opens a round every `ROUND_EVERY_MIN` (rotating items, at most one active round per item, ceiling = the item's `ref_price`). It settles and finalizes ANY round that is due, including rounds opened from the dashboard, and fails doomed rounds early (join closed under `MIN_TOTAL_QTY`). This is also the crash recovery.
- **Our grosirs (grosir-1..5)**: `GROSIR_BIDDERS` of them (a seeded rotation) bid in any round in COMMIT. The salt is fsynced before the commit tx (`DATA_DIR/salts.json`). They reveal in REVEAL. grosir-5 forgets to reveal only with probability `FORGET_PROB`. Housekeeping auto-withdraws a grosir's market balance above `WITHDRAW_THRESHOLD` and calls the faucet when its wallet is low and the 1 h cooldown passed.
- **Seeded warungs (warung-01..20)**: a seeded-random subset of `SEEDED_JOIN_MIN..MAX` joins each round with the sim strategy quantity, using the function-call key; when its allowance runs low (under 0.005 NEAR) the join falls back to the full key. Their owners (full key) keep them solvent (faucet + deposit) and confirm delivery after settle ("owner confirmed in chat"); the last participant stays silent so default-accept runs. An account that a real owner registers through the API stops being simulated.
- **Delegated real warungs**: for every OPEN round whose item has demand for the warung, the service pre-checks with views (service key present, policy, `auto_join`, `max_price`, weekly budget, balance, caps, phase) and signs `join_round` as that account with the service key. A failed check is recorded as a skip with the reason. A failed join is retried at most once.
- **Budget guard**: NEAR balances of every account we sign for are tracked and shown in `/status`. Below 0.02 NEAR (0.01 for sim warungs) the daemon stops signing for that account and lists it in `budget.low_accounts` instead of failing.

Persistence (atomic temp + fsync + rename): `salts.json`, `registry.json` (delegated warungs and their last actions), `nonces.json` (used NEP-413 nonces), `scheduler.json` (scan window, last open time, attempt counters). No database.

Shutdown: SIGTERM/SIGINT finish the current transaction, flush state and exit 0.

### Environment variables

All of them are documented in [`deploy/.env.example`](deploy/.env.example). Keys: `KEYS_DIR` (full-access key JSONs, default `~/.near-credentials/testnet`), `FCK_DIR` (warung function-call keys, default `agents/.keys`), `DATA_DIR` (default `./.data`), `SERVICE_KEY`. The ROOT/admin key `koelakan.testnet` is never needed by the daemon. `pnpm pack:secrets` copies exactly the 46 files the daemon needs (koordinator, grosir-1..5, warung-01..20 full keys plus the 20 FC keys; never root) into `agents/deploy/secrets/` (gitignored).

## Deploy to a VPS

Ubuntu with Docker and compose. The image (`koelakan-agent`) contains no keys. Build context is the repository root (the agents import `sim/src`).

```sh
cd agents
pnpm keygen:service                          # copy the SERVICE_KEY line
pnpm pack:secrets                            # -> deploy/secrets/{keys,fck}
cp deploy/.env.example deploy/.env           # set SERVICE_KEY, AGENT_DOMAIN, ALLOWED_ORIGINS
deploy/deploy.sh vps                         # rsync + docker compose up -d --build (ssh alias "vps")
curl https://agent.43-157-202-28.sslip.io/health
```

`compose.yaml` runs `agent` (restart unless-stopped, 384 MB, healthcheck on `/health`, volume `agent-data` at `/data`, secrets mounted read-only) and `caddy` (80/443, automatic Let's Encrypt for `AGENT_DOMAIN`, default `agent.43-157-202-28.sslip.io`, which resolves to the VPS IP without owning a domain). Docker logs rotate at 10 MB x 3. The key files must be readable by uid 1000 (the `node` user, the same as the default `ubuntu` user).

Manual build: `docker build -f agents/deploy/Dockerfile -t koelakan-agent .` from the repo root.

## API

JSON over HTTP, CORS for `ALLOWED_ORIGINS` plus `http://localhost:3000`.

| Method and path | Result |
|---|---|
| `GET /health` | `{"ok":true,"version","uptime_s"}` |
| `GET /status` | network, market, `service_public_key`, cadence, `next_open_at`, `active_rounds`, grosir `near`/`tidr_wallet`/`market_available`/`paused`, `budget`, last 50 `recent_events`. Extra field `missing_keys` lists key files the process could not load (it keeps running without them) |
| `GET /warungs/:accountId` | `{"account_id","demand","registered_at","updated_at","delegated","auto_join","last_actions"}` or 404 `{"ok":false,"error":"not_registered"}`. `delegated` = the service key currently exists on that account as a `join_round` FC key for the market (cached 30 s) |
| `POST /warungs` | register, update or unregister (all-zero demand) a delegated warung |

`POST /warungs` body: `{account_id, public_key, signature, nonce, recipient: "koelakan-agent", message}`. `message` is the JSON string `{"action":"set_demand","account_id":...,"demand":{"<item>":0..1000},"issued_at":ISO}`. It is a NEP-413 signed message: borsh `{message, nonce[32], recipient, callbackUrl: None}` prefixed by the u32 tag 2147484061, sha256, ed25519. `signature` is base64 (an `ed25519:` base58 string is also accepted), `nonce` is base64 of 32 bytes. The server checks the signature, `issued_at` within 10 minutes, a nonce never used before (persisted), that `public_key` is a FULL-ACCESS key of `account_id` on chain, and that the item ids exist. Errors: 400/401 `{"ok":false,"error","detail"}` with codes `bad_request`, `bad_signature`, `not_full_access_key`, `expired`, `nonce_reused`, `unknown_item`. POST is limited to 10 per minute per IP (429 `rate_limited`).

To let the service act for an owner, the owner (1) calls `set_policy` with `auto_join: true`, (2) deposits tIDR, (3) signs the `set_demand` message, and (4) adds the service public key as a function-call key (`receiver = market`, `methods = ["join_round"]`, allowance `SERVICE_FC_ALLOWANCE_NEAR`, 0.25 by default). The dashboard does steps 3 and 4 with Wallet Selector.

## Run your own grosir agent

A real wholesaler can run the bidding agent on their own machine, with their own key. It only plays the grosir role for ONE account: it commits a sealed bid in every eligible round (COMMIT phase), persists the salt first, reveals in REVEAL, and auto-withdraws proceeds. You need a testnet account holding tIDR (call `tidr.faucet()`, it also registers you on the token).

1. Write a pricing file, `{"<itemId>": {"cost": int, "margin_bps": int}}`; the bid is `round(cost x (1 + margin_bps / 10000))`. See [`deploy/grosir.example.json`](deploy/grosir.example.json). The bid is only placed if it is at most the round's ceiling and your wallet covers the 5% bond.
2. Run it with Docker (build once from the repo root: `docker build -f agents/deploy/Dockerfile -t koelakan-agent .`):

```sh
docker run -d --name my-grosir --restart unless-stopped \
  -e ACCOUNT_ID=my-grosir.testnet \
  -e PRIVATE_KEY=ed25519:YOUR_SECRET_KEY \
  -e PRICING_FILE=/pricing/pricing.json \
  -e MIN_BID=10000 -e MAX_BOND=500000 \
  -v "$PWD/pricing.json:/pricing/pricing.json:ro" \
  -v my-grosir-data:/data \
  koelakan-agent:latest node dist/agents/src/cli/grosir.js
```

   Instead of `PRIVATE_KEY` you can mount a near-cli credentials file: `-v "$HOME/.near-credentials/testnet:/secrets/keys:ro"` (the file must be `my-grosir.testnet.json`). Or without Docker: `ACCOUNT_ID=... PRIVATE_KEY=... PRICING_FILE=... pnpm grosir`.
3. Watch the JSON log lines: `ft_transfer_call` with "sealed bid committed", then `reveal_bid`. Back up the `/data` volume: `salts.json` holds the salts of your open bids; losing it before the reveal forfeits the bond.

Env: `ACCOUNT_ID` (required), `PRIVATE_KEY` or `KEYS_DIR`, `PRICING_FILE` (required), `DATA_DIR`, `MIN_BID` (never bid below this unit price), `MAX_BOND` (skip rounds whose bond is higher), `WITHDRAW_THRESHOLD`, `HOUSEKEEP_SECS`, `TICK_SECS`, `NEAR_RPC_URL`, `KOELAKAN_ROOT`. Keep about 0.1 NEAR on the account for gas.

## Security model: service key and delegation

- The **service key** is a function-call key that each owner adds to their own account: `receiver = market`, `methods = ["join_round"]`, small gas allowance. It cannot attach a deposit, so it cannot `withdraw`, `confirm_delivery`, `dispute` or `set_policy`, and it cannot transfer funds. What it can do is bounded by the owner's on-chain policy (`max_price`, `weekly_budget`, `auto_join`, balance). The owner can revoke it at any time by deleting the key (`DeleteKey`).
- The `POST /warungs` registration proves control of a FULL-ACCESS key with a NEP-413 signature bound to the recipient `koelakan-agent`, a nonce stored forever (10 min freshness window) and `issued_at`. Registering only tells the service how many units the owner wants; money still needs the policy and the key.
- Our own accounts: full keys are mounted read-only from `/secrets` and are never in the image or git. The root/admin key is not needed.
- If a key file is missing, the daemon runs without that account and reports it in `/status.missing_keys`.

## NEAR budget math

Gas price on testnet is 1e8 yocto/gas, so 1 Tgas = 0.0001 NEAR and only gas actually burnt is paid (prepaid gas is refunded). Measured: a live run of 142 transactions (4 rounds, 20 policy refreshes, top-ups, withdrawals) across the 26 accounts burnt 0.049 NEAR, about 3.5 Tgas per transaction. The estimator (`src/service/budget.ts`, printed at startup and in `/status.budget.est_near_per_day`) uses per-method averages: open 3, join 4, commit 8, reveal 3, confirm 3, settle 8, finalize 8, withdraw 5, top-up pair 6 Tgas, plus a 15% margin.

At the defaults (a round every 60 min, 6..9 joins, 3 bidders) that is about 0.0146 NEAR per round and 0.35 NEAR per day over all accounts. Halving the cadence doubles it (every 30 min is about 0.70 NEAR/day). Who pays: the koordinator about 0.002 NEAR per round (open, settle, finalize, it is the first to run dry: roughly 1.5 days from 0.09 NEAR), each bidding grosir about 0.0015, each joining sim warung about 0.0007. Top the koordinator up from the root account before a multi-day run. Below 0.02 NEAR an account is paused and listed in `/status`.
