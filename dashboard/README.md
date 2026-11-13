# Koelakan dashboard

Public web dashboard for Koelakan. It reads live state from the NEAR testnet contracts (no backend, no database) and lets warung owners onboard, delegate to the 24/7 agent service, manage a standing order and confirm deliveries, and shows live agent-service status.

Stack: Next.js 16 (App Router, TypeScript strict), Tailwind 4, `@near-wallet-selector` 10 (MyNearWallet, Meteor, HOT, Intear), vitest.

## Run locally

```sh
cd dashboard
pnpm install
pnpm dev            # http://localhost:3000
```

Checks:

```sh
pnpm test           # vitest: phase, rupiah, savings math, chat messages, join pre-check, tx builders, agent API client, NEP-413, delegation, owner actions, step state, status formatting
pnpm typecheck      # tsc --noEmit
pnpm lint           # eslint (next core-web-vitals + typescript)
pnpm build && pnpm start
```

## Environment variables

All optional; defaults point to the live deployment (see `.env.example`). Values are validated in `src/lib/config.ts`: a malformed URL or account id silently falls back to the default instead of pointing somewhere unexpected. `NEXT_PUBLIC_*` values are inlined at build time, so rebuild after changing them.

| Variable | Default |
|---|---|
| `NEXT_PUBLIC_NETWORK` | `testnet` |
| `NEXT_PUBLIC_RPC_URL` | `https://rpc.testnet.fastnear.com` |
| `NEXT_PUBLIC_RPC_FALLBACK_URL` | `https://rpc.testnet.near.org` |
| `NEXT_PUBLIC_ROOT_ACCOUNT` | `koelakan.testnet` |
| `NEXT_PUBLIC_MARKET_ID` | `market.<root>` |
| `NEXT_PUBLIC_TIDR_ID` | `tidr.<root>` |
| `NEXT_PUBLIC_EXPLORER_URL` | `https://testnet.nearblocks.io` |
| `NEXT_PUBLIC_AGENT_API_URL` | `https://agent.43-157-202-28.sslip.io` |
| `NEXT_PUBLIC_SITE_URL` | `http://localhost:3000` (set to the public domain for OG tags) |

## How data is read

- Chain: `src/lib/rpc.ts` (throttled JSON-RPC views, retry with backoff, primary and fallback endpoint, plus `view_access_key` to detect delegation) and `src/lib/market.ts` (typed views with a TTL cache). Nanosecond timestamps (above 2^53) are kept as strings. Live phases are derived from deadlines versus the clock (`src/lib/phase.ts`).
- Agent service: `src/lib/agent-api.ts` is a typed client with handwritten runtime validation and error-code mapping (`bad_signature`, `expired`, ...). One shared 15 s poll of `GET /status` (`src/hooks/use-agent-status.tsx`) feeds the header badge, home, `/status`, `/grosir` and `/warung`. If the service is down, every consumer shows "Agent service offline. On-chain data is still live." and the rest of the app keeps working.
- Pages are server-rendered with `revalidate = 15` and then polled in the browser.

## Pages

| Route | What |
|---|---|
| `/` | Live framing from `/status` cadence, aggregate savings vs PIHPS, catalogue, what is real vs assumed |
| `/warung` | **Run your warung**: owner onboarding and self-service (`/try` and `/coba` redirect here) |
| `/grosir` | For wholesalers: role, live grosir agents table, "Run your own grosir agent" |
| `/status` | Agent service status: cadence, next round, active rounds, budget, recent events with nearblocks links |
| `/rounds`, `/rounds/[id]` | All rounds; timeline, result, bids, participants, delivery |
| `/chat?round=1` | Chat-style log per round |

## Owner flow: do X, see Y

Open `/warung`. The setup panel has four steps. Each shows Done, Next up, To do or Locked. Progress is read from the chain and the agent API, so reloading resumes where you left off. The demo view `/warung?demo=warung-20.koelakan.testnet` shows a seeded warung read-only, with no wallet.

1. **Sign in with a wallet.** Click "Sign in with a NEAR wallet" and approve in the wallet. You see "Signed in as <account>" and a "Sign out" button. Sign-in creates a restricted browser key (`join_round` on the market only); owner actions still need your full-access key.
2. **Add test money.** Enter an amount in "Test money to add (Rp)" and click "Add test money". The hint reads "Adds Rp... to your market balance." and the step turns Done.
3. **Set your limits and let the agent shop.** Fill "Most you want to spend each week (Rp)" and a max price per item (default is the PIHPS reference price). Keep "Let the agent shop for me" ticked (off means the agent does nothing). Click "Allow the agent to shop for me" (or "Save limits and allow the agent" if limits are already set; "Update limits" later). One wallet approval saves the limits and adds the agent's function-call key. The page calls these settings "limits"; on-chain they are the owner policy in RULES section 3.
4. **Your standing order.** Tick the staples you want and enter kg per round, then click "Save my order" ("Stop buying (clear my order)" if all are unticked). The wallet signs a NEP-413 message, which is not a transaction and costs no fee. You see "Order saved. Your agent uses it from the next round." and the chip changes from "Not set" to "Saved".

After setup, the page shows:

- **Needs you**: for settled rounds in the delivery window, "Confirm now" and "Report a problem". Both ask for confirmation first (RULES section 6). If you do nothing, the delivery counts as received when the window ends.
- **Stop the agent**: removes the agent's key. Your limits and balance stay.
- **Withdraw to wallet**: enter an amount (or "All") and click "Withdraw to wallet".
- **Edit standing order** (header link): jumps back to step 4.

Wallets without `signMessage` get a message suggesting MyNearWallet or Meteor. Redirect-style wallets return the signature in the URL hash; the pending request is kept in `sessionStorage` and completed on return.

## Local testing without the real service

```sh
node scripts/mock-agent-api.mjs 8799        # serves the fixed /health, /status, /warungs shapes
NEXT_PUBLIC_AGENT_API_URL=http://localhost:8799 pnpm build && pnpm start
```

## Security model (shown on the owner page)

The key delegated to the agent can only call `join_round` on the market and cannot attach a deposit. `withdraw`, `set_policy`, `confirm_delivery` and `dispute` require 1 yocto, so they need your full-access key. The contract, not the agent, enforces max price, weekly budget and balance. Grosirs must run their own agent because a bond is paid from their own wallet, which needs a full-access key (RULES section 4).

## Deploy to Vercel

Import the repo, set **Root Directory** to `dashboard`, framework Next.js, default build command. No env vars are required for testnet. Recommended: set `NEXT_PUBLIC_SITE_URL` to the production domain (OG/Twitter tags) and, if the agent service moves, `NEXT_PUBLIC_AGENT_API_URL`. The agent service must allow the dashboard origin in CORS. Env changes need a redeploy because `NEXT_PUBLIC_*` is inlined at build.

## Notes

- Chat message times are estimates inside the real phase windows, because the contract stores no per-event timestamps. Real transaction hashes are only in the logs.
- The UI is in English; local terms (warung, grosir, kulakan, PIHPS, HET) are kept as proper nouns with a short gloss on first use. Item names come from chain data in Indonesian, so `src/lib/items.ts` maps item ids to English display names. Amounts are formatted `Rp16,650` and times as `12 Nov, 15:23 WIB` (Asia/Jakarta). Owner names for `warung-NN` are fictional (same list as `agents/src/wa.ts`).
- Wallet selector needs `near-api-js` v6 because `@meteorwallet/sdk` imports `utils` from it; do not bump to v7 until Meteor updates. `buffer` is a direct dependency because some wallet modules call the global `Buffer`, which `wallet.tsx` installs in the browser.
