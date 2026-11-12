# Koelakan

> Work in progress for NEAR HACKATHON 2026. Tracks: AI Swarms (`swarms`), Real-World Money (`realworld`).

**Koelakan** (from *kulakan*: what Indonesian shop owners call restocking from a wholesaler) lets warungs restock together.

Indonesian *warung* buy in small quantities at retail prices. In Koelakan, each warung's agent pools its order with nearby warungs, and *grosir* agents compete for the whole lot in a sealed-bid auction. A NEAR contract holds every rupiah in escrow and enforces each owner's limits on-chain. An agent can spend for a warung, but it cannot steal from it.

- Rules (single source of truth): [RULES.md](RULES.md)
- Reference prices (real data, with sources): [data/prices.json](data/prices.json)

## Status

| Part | State |
|---|---|
| `contracts/tidr`: NEP-141 test rupiah plus faucet | done, 3 unit tests |
| `contracts/market`: rounds, policy, commit-reveal, escrow, disputes | done, 40 unit tests |
| Simulation (20 warungs, 5 grosir, no LLM) | todo |
| Agents plus dashboard | todo |
| Testnet deploy | todo |

## Run the tests

```sh
cargo test            # 43 unit tests, including the conservation invariant
```

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

## License

MIT, see [LICENSE](LICENSE).
