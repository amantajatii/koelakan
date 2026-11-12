# Koelakan dashboard

Public web dashboard for Koelakan. It reads live state from the NEAR testnet contracts (no backend, no database) and lets a judge log in with a restricted function-call key and join a round.

Stack: Next.js 16 (App Router, TypeScript strict), Tailwind 4, `@near-wallet-selector` 10 (MyNearWallet, Meteor, HOT, Intear), vitest.

## Run locally

```sh
cd dashboard
pnpm install
pnpm dev            # http://localhost:3000
```

Checks:

```sh
pnpm test           # vitest: phase, rupiah, savings math, chat messages, join pre-check, tx builders
pnpm typecheck      # tsc --noEmit
pnpm lint           # eslint (next core-web-vitals + typescript)
pnpm build && pnpm start
```

## Environment variables

All optional; defaults point to the live deployment (see `.env.example`).

| Variable | Default |
|---|---|
| `NEXT_PUBLIC_NETWORK` | `testnet` |
| `NEXT_PUBLIC_RPC_URL` | `https://rpc.testnet.fastnear.com` |
| `NEXT_PUBLIC_RPC_FALLBACK_URL` | `https://rpc.testnet.near.org` |
| `NEXT_PUBLIC_ROOT_ACCOUNT` | `koelakan.testnet` |
| `NEXT_PUBLIC_MARKET_ID` | `market.<root>` |
| `NEXT_PUBLIC_TIDR_ID` | `tidr.<root>` |
| `NEXT_PUBLIC_EXPLORER_URL` | `https://testnet.nearblocks.io` |

## How data is read

- `src/lib/rpc.ts`: JSON-RPC `call_function` views, serialised to about 4.5 req/s, retried with backoff, alternating primary and fallback endpoint. Nanosecond timestamps (above 2^53) are kept as strings.
- `src/lib/market.ts`: typed views (`get_items`, `list_rounds`, `get_round`, `get_balance`, `get_policy`, `get_spent`, `ft_balance_of`) with a TTL cache that also de-duplicates concurrent calls.
- Pages are server-rendered with `revalidate = 15` (so `curl` shows real numbers) and then polled in the browser every 10 to 15 s. If the RPC is down at render time the page ships empty and the client retries.
- Live phases are derived from deadlines versus the clock (`src/lib/phase.ts`, a port of `phase_of` in the contract).

## Pages

| Route | What |
|---|---|
| `/` | Overview, aggregate savings vs PIHPS, catalogue with source and date |
| `/rounds` | All rounds with phase, countdown, participants, clearing price, saving |
| `/rounds/[id]` | Timeline, result, price bars, participants, bids, forfeit split, delivery status |
| `/chat?round=1` | "Agent chat": chat-style log per round, filter by warung |
| `/try` | Judge flow ("Try it yourself"; `/coba` redirects here) |

## Judge flow: do X, see Y

Open `/try`.

1. **Sign in**: click "Sign in with a NEAR wallet", pick a wallet (MyNearWallet is the one tested for popup-free signing). You see your account id and a green "Done". The wallet created a key limited to `join_round` on the market.
2. **Get tIDR**: see `Rp1,000,000` in "tIDR in wallet". Claiming twice within an hour shows the cooldown message.
3. **Deposit to market** (default 500,000): "Available balance" in the side panel becomes `Rp500,000`.
4. **Set your policy**: max price per item (default = PIHPS reference) and weekly budget. The side panel shows the policy.
5. **Join a round**: pick an open round and a quantity. A pre-check lists every reason the contract would refuse (no policy, ceiling above max price, budget, balance, window closed). Joining signs with the restricted key, with no wallet popup on MyNearWallet. Afterwards "Locked in rounds" grows by `qty x ceiling`.
6. **Open a round** (optional): anyone may call `open_round` (demo durations 120/60/60/120 s, ceiling = PIHPS price).

For a full round with bids, run the agents from the repo (`cd agents && pnpm round`, see `agents/README.md`). That command opens its own round (default join window 90 s); join it from step 5 while it is open. A round opened from step 6 is not served by that command, so without grosir bids it settles as Failed and refunds everything.

## Security model (shown on the judge page)

The key the wallet creates can only call `join_round` on the market and cannot attach a deposit. `withdraw`, `set_policy`, `confirm_delivery` and `dispute` require 1 yocto, so they need the full-access key. The contract, not the agent, enforces max price, weekly budget and balance.

## Deploy to Vercel

Import the repo, set **Root Directory** to `dashboard`, framework Next.js, default build command. No env vars are required for testnet. Use the env vars above to point to other endpoints or deployments.

## Notes

- Chat message times are estimates inside the real phase windows, because the contract stores no per-event timestamps. Real transaction hashes are only in the logs.
- The UI is in English; local terms (warung, grosir, kulakan, PIHPS, HET) are kept as proper nouns with a short gloss on first use. Item names come from chain data in Indonesian, so `src/lib/items.ts` maps item ids to English display names. Amounts are formatted `Rp16,650` and times as `12 Nov, 15:23 WIB` (Asia/Jakarta). Owner names are fictional (same list as `agents/src/wa.ts`).
- Wallet selector needs `near-api-js` v6 because `@meteorwallet/sdk` imports `utils` from it; do not bump to v7 until Meteor updates.
