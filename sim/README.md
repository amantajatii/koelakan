# Koelakan simulation engine

A pure, immutable TypeScript state machine that mirrors the Rust contract in
`../contracts/market` (RULES.md v0.3), plus a seeded simulation of 20 warungs and
5 grosir. No network, no LLM.

```sh
pnpm i
pnpm simulate          # 4 rounds (one per catalogue item), prints a summary
pnpm simulate --json   # also writes out/run.json for the dashboard
pnpm test              # unit tests + golden replay
pnpm test:cov          # coverage of the engine modules
pnpm typecheck
pnpm golden:gen        # regenerate `expected` in golden/scenarios.json
```

`pnpm simulate` is deterministic (seeded PRNG). `grosir-5` commits but never reveals, so
the bond-forfeit path is shown, and `warung-07` disputes in round 1 so the arbiter path is
shown. The run ends with a conservation check: total tIDR in equals total tIDR out.

**Reference prices are real** (PIHPS Nasional, 11 Nov 2026). **Grosir costs, margins and
warung quantities are invented assumptions** (see `src/config.ts`).

## Layout

- `src/engine.ts` (+ `settle.ts`, `ledger.ts`, `util.ts`, `types.ts`): the engine. Each
  operation takes `(state, ctx{caller, now, yocto?}, ...)` and returns a new state. Errors
  are `ContractPanic` with the contract's message text. Amounts, quantities and times are `bigint`.
- `src/config.ts`: populations, catalogue, PRNG. `src/runner.ts`: simulation. `src/simulate.ts`: CLI.
- `golden/scenarios.json`: 7 hand-sized scenarios (timestamped actions plus `expected`).

## What the golden test proves

`golden/scenarios.json` is replayed twice:

1. here, by `test/golden.test.ts` against the TS engine, and
2. by `contracts/market/src/golden_tests.rs` (`cargo test`) against the real contract
   code under `near-sdk` unit-test mode, reading the same file with `include_str!`.

Both must produce the same final balances (available, held, weekly spent), token total
and round state (winner, clearing price, saving, participants, bids). So the numbers the
dashboard shows from the simulation are the numbers the contract would produce. If the
contract logic changes, `pnpm golden:gen` shows the diff and the Rust test fails until
both sides agree.
