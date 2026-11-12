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
4. Grosirs: keep their tIDR in the wallet, because a commit bond is paid by `ft_transfer_call` from the wallet. Returned bonds and sale proceeds are credited to the market balance and can be pulled out with `withdraw` (not automated).

## Security model

| Key | Lives in | Can do | Cannot do |
|---|---|---|---|
| Warung **function-call key** | `agents/.keys/<account>.fck.json` | `join_round` on `market` only, gas allowance 0.05 NEAR | Attach a deposit, so no `withdraw`, `confirm_delivery`, `dispute` or `set_policy`; call any other contract; transfer funds |
| Warung **full-access key** | `~/.near-credentials/testnet/` | Owner actions: `confirm_delivery` (1 yocto) | Used by the runtime only for the owner action, and for setup |
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
- A grosir pays its bond from its wallet; funds returned by the market stay in the market balance until a `withdraw` (owner action, not automated). After about four rounds a grosir wallet runs low and the faucet (1M per hour) must be used again (`pnpm run setup` does it).
- Warung deposits (900k) and the 2M weekly budget allow several rounds, after which `pnpm run setup` tops the deposit back up.
- Delivery is simulated: confirmations are scripted owner actions, and there is no dispute path in the live run (the contract supports it).
