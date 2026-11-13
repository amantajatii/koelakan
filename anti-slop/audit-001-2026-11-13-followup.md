# antislop audit 001: follow-up (2026-11-13)

Approved: items 1-28. R-37 items A-E kept (owner decision). Items 29-50 not touched.

## Fixed

| # | Change |
|---|---|
| 1-3 | README.md rewritten:<br>- one-line description replaces "Work in progress"<br>- status table with an evidence column (testnet accounts, rounds #1 and #2, VPS /status)<br>- "Try it" with five do X, see Y steps<br>- "What is real and what is assumed"<br>- "Out of scope"<br>- the public dashboard link is the honest placeholder `[DASHBOARD URL, added after deploy]` |
| 4 | dashboard/README.md "Owner flow" now describes the 4 shipped steps, using the exact button labels from source. |
| 5 | agents/README.md:8,165 and warung.ts:32,39 now say the owner confirm is scripted (full-access key, 1 yocto) and that there is no WhatsApp integration. |
| 6 | 15 em dashes in Rust comments replaced (market lib.rs, tidr lib.rs). Comments only. |
| 7 | globals.css base rule: pointer on enabled controls, not-allowed on disabled. |
| 8 | `.on-brand :focus-visible` uses a white outline (6.68:1 on hero). Skip link has a white outline. |
| 9 | New `--color-control #7d9288` for field borders: 3.31:1 on white, 3.01:1 on ground. |
| 10 | Placeholder uses the muted token: 6.08:1 on white, 5.53:1 on ground. |
| 11 | Selected cue (ring-2 brand + bold) on the chat picker, FilterTabs, side rail (3px bar) and tab bar. |
| 12 | New `LoadingRegion` (role=status + sr-only label), used on every skeleton loading view. |
| 13 | Chat thread is `role="log" aria-live="polite" aria-label="Agent messages"`. |
| 14 | The "Read" check icon is `aria-hidden`. |
| 15 | /status events stack on phones and the list is capped at 15 with a "Show all N events" toggle (aria-expanded). |
| 16-17 | The hero is an art-directed `<picture>`: eager, `fetchpriority="high"`, 960x640. The source only matches at 640px and up, so phones never download it. |
| 18 | Produce discs and the hero go through next/image (WebP, sized by `sizes`). The original PNGs stay as source. |
| 19 | Home banner: "settled testnet rounds with simulated grosir costs ... in test rupiah". |
| 20 | Warung "You saved Rp X test rupiah". "Read from the testnet blockchain. The demo warung is seeded." |
| 21 | Headline, title and OG: "Warungs pool orders. Grosirs bid for them." Round title no longer doubles. |
| 22 | "created outside our seeded set". |
| 23 | "A real grosir would set its own costs in pricing.json." |
| 24 | Security note retitled "What the agent key can and cannot do", plus "testnet contract, not audited". README/RULES no longer say "cannot steal". |
| 25 | Error pages no longer claim "Nothing on-chain was changed" and no longer guess about rate limits. |
| 26 | Chat footer says the owner reply wording is generated. |
| 27 | Test counts now match `cargo test`: 41 market + 3 tidr = 44. |
| 28 | Minimarket causal claim replaced by a sourced fact: PIHPS rice and sugar are above HET (data/prices.json). |

## Verification

- `cargo test` 44 pass.
- agents `pnpm test` 121 pass.
- sim `pnpm test` 42 pass.
- dashboard `pnpm test` 179 pass. `tsc --noEmit`, `pnpm lint` and `pnpm build` are clean.
- Headless Chrome against `next dev` on :3000. Routes: /, /warung?demo=warung-20.koelakan.testnet, /rounds, /rounds/1, /chat, /grosir, /status, each at 1440px and 390px.
  - Console errors: 0.
  - Horizontal overflow: none.
  - Button cursor: pointer.
  - One h1 on every route.
  - Titles are unique: "Round #1 | Koelakan".
  - /chat has `role=log` "Agent messages".
  - hero.png is requested once on desktop and 0 times on mobile.
  - /status mobile height is 3,425px (was ~20,000px) and the event rows are stacked.

## Not verified

- Keyboard focus visibility on the hero was checked through contrast math, not by tabbing in the browser.
- The WebP byte sizes from next/image were not measured.
