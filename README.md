# Koelakan

> A NEAR Hackathon 2026 entry (tracks `swarms` and `realworld`): warung agents pool orders, grosir agents bid in a sealed-bid auction, and a NEAR testnet contract holds the money. Live: https://koelakan.vercel.app (landing) and https://koelakan.vercel.app/overview (dashboard)

**Koelakan** (from *kulakan*: what Indonesian shop owners call restocking from a wholesaler) lets warungs restock together.

A *warung* is a small Indonesian shop. It buys in small quantities at retail prices, and in the PIHPS data of 11 Nov 2026 national average rice and sugar prices were already above the official HET retail ceiling ([data/prices.json](data/prices.json)). In Koelakan each warung's agent pools its order with other warungs, and *grosir* (wholesaler) agents compete for the whole lot in a commit-reveal sealed-bid auction. A NEAR contract escrows every tIDR (test rupiah) and enforces each owner's limits (max price per item, weekly budget). The agent key is a function-call key limited to `join_round`, so it cannot withdraw funds. The contract is unaudited testnet code.

- Rules (single source of truth): [RULES.md](RULES.md)
- Reference prices (real PIHPS data, with sources): [data/prices.json](data/prices.json)

## Status

| Part | State | Evidence |
|---|---|---|
| `contracts/tidr`: NEP-141 test rupiah plus faucet | deployed on testnet | `tidr.koelakan.testnet`, 3 unit tests |
| `contracts/market`: rounds, limits, commit-reveal, escrow, disputes | deployed on testnet | `market.koelakan.testnet`, 41 unit tests incl. conservation invariant |
| Simulation (20 warungs, 5 grosir, no LLM) | done | `sim/`, 42 tests, 7 golden scenarios replayed by the contract tests |
| Agents (20 warung, 5 grosir, koordinator, arbiter) | live on testnet | accounts `warung-01..20`, `grosir-1..5`, `koordinator`, `arbiter` under `.koelakan.testnet` |
| Live rounds | 2 closed | #1 beras: clearing Rp11,924, saving Rp1,422,526. #2 gula: Rp15,683, saving Rp1,514,785. Both matched the sim engine |
| Agent service | running, one round every 60 min | https://agent.43-157-202-28.sslip.io/status |
| Dashboard | deployed on Vercel | landing https://koelakan.vercel.app, app https://koelakan.vercel.app/overview (`dashboard/`) |

## Try it

1. **Dashboard, owner view.** Open https://koelakan.vercel.app/warung?demo=warung-20.koelakan.testnet (or run it locally: `cd dashboard && pnpm i && pnpm dev`, then the same path on http://localhost:3000). You see a seeded warung's limits, standing order and round activity, read-only, no wallet needed. Sign in at `/warung` with a NEAR testnet wallet to set up your own warung.
2. **Live agent service.** Open https://agent.43-157-202-28.sslip.io/status. You see the round cadence, the next round and recent on-chain events with links.
3. **A full live round.** `cd agents && pnpm i && pnpm round` (needs the one-off `pnpm run setup` and testnet keys; see [agents/README.md](agents/README.md)). You see a timeline with tx links, ending in `cross-check vs sim engine: MATCH`.
4. **Simulation.** `cd sim && pnpm i && pnpm simulate`. You see the 20-warung, 5-grosir run with total saving vs PIHPS and a conservation check. `pnpm test` runs its 42 tests.
5. **Contract tests.** `cargo test` from the repo root. You see 44 tests pass (41 market, 3 tidr).

## What is real and what is assumed

Real: the PIHPS reference prices and HET in `data/prices.json` (with source URLs), and on-chain rounds and escrow on NEAR testnet. Assumed: grosir costs are seeded (0.85 to 0.97 x HET), warung and owner names are fictional, and tIDR is test money, so every saving shown is measured against PIHPS in testnet rounds with simulated grosir costs. The owner confirm in live rounds is scripted, and the dashboard shows agent updates as a WhatsApp-style chat; nothing is sent to WhatsApp.

Koelakan is asset-light: it never holds inventory. KitaBeli, Ula and GudangAda held stock, and they failed. Grosirs and Koperasi Desa Merah Putih stay the sellers.

## Out of scope

- Rupiah on-ramp (tIDR is test money).
- Intents settlement (no testnet).
- Proof of delivery (the owner confirms or disputes; an arbiter rules).
- A security audit of the contracts.

## Build the contracts

One-time setup on macOS:

```sh
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh   # Rust (skip if installed)
rustup target add wasm32-unknown-unknown
cargo install cargo-near --locked
```

Then build:

```sh
./scripts/build.sh    # writes res/tidr.wasm and res/market.wasm
```

## Built with

- **Hackathon window.** Every line was written during NEAR Hackathon 2026; the first commit is 2026-11-12. There is no pre-hackathon baseline.
- **Contracts:** near-sdk 5 and near-contract-standards (NEP-141 for tIDR), built with cargo-near.
- **Agents and sim:** TypeScript, near-api-js, vitest.
- **Dashboard:** Next.js 16, React 19, Tailwind CSS 4, NEAR Wallet Selector, lucide-react icons, and Plus Jakarta Sans.
- **Data:** PIHPS Nasional reference prices and HET, with sources in [data/prices.json](data/prices.json).
- **AI assistance:** most code and docs were written with Claude Code, with the author directing and reviewing. The produce images and the first logo concepts were generated with Codex image generation; the logo was then redrawn by hand as SVG.

## License

MIT, see [LICENSE](LICENSE).
