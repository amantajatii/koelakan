# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users
Primary: owners of Indonesian warungs (small neighbourhood grocery shops). They use a phone more than a laptop, have little or no crypto knowledge, and are busy running the shop. Their job: set up once (wallet, price limits, weekly budget, standing order), delegate buying to an agent, then check results and confirm when goods arrive.
Secondary: international hackathon judges (NEAR Hackathon 2026, tracks `swarms` and `realworld`) who evaluate the product through the owner's eyes, mostly on a laptop, and must grasp the mechanism within minutes and be able to try it.

## Product Purpose
Koelakan (from *kulakan*, restocking from a wholesaler) lets many warungs buy together. Each warung's agent pools its order into a round; grosir (wholesaler) agents compete in a commit-reveal sealed-bid auction; a NEAR smart contract escrows the money and enforces each owner's policy. Success: an owner pays less than the market reference price without giving up control of their money.

## Positioning
Reference prices are real (PIHPS Nasional, Indonesia's national food price monitor, 11 Nov 2026) and stored on-chain; a round's ceiling can never exceed them, so every saving is measured against a real public number. The owner's limits are enforced by the contract, not by the agent: the agent's key can only call `join_round` and can never move funds. Asset-light: Koelakan holds no inventory (unlike KitaBeli, Ula, GudangAda, which failed holding stock); it complements grosirs and Koperasi Desa Merah Putih.

## Operating Context
Runs on NEAR testnet with tIDR (test rupiah, 0 decimals, faucet 1,000,000 per hour). A 24/7 agent service on a VPS opens a round every 60 minutes (join 5 min, commit 90 s, reveal 90 s, delivery 10 min), bids with seeded grosir agents, joins for delegated warungs, settles and finalizes. Owners sign in with NEAR Wallet Selector (MyNearWallet, Meteor, HOT, Intear). Owner actions (set policy, withdraw, confirm delivery, dispute) need a full-access wallet signature; joins can run on a restricted function-call key.

## Capabilities and Constraints
- Dashboard (Next.js, no backend) reads chain views and the agent service API (`/health`, `/status`, `/warungs`).
- Routes: overview, run your warung (onboarding + owner actions), rounds list and detail, agent chat (agent-to-owner messages generated from chain data), for wholesalers, service status.
- Catalogue: medium rice, local granulated sugar, chicken eggs, bulk cooking oil (per kg).
- All UI copy in English (international judges). Rupiah amounts formatted `Rp16,650`; times in WIB.
- Out of scope, stated honestly: rupiah on-ramp, mainnet/real stablecoin, proof of delivery, NEAR Intents settlement.

## Brand Commitments
- Name: "Koelakan" (old spelling with "oe"), always kept.
- Other current visual assets (basket icon, kraft-paper look) are not binding.

## Evidence on Hand
- Real: PIHPS reference prices and HET in `data/prices.json` with source URLs; on-chain rounds with real outcomes (e.g. round #1 medium rice cleared Rp11,924 vs PIHPS Rp16,650, saving Rp1,422,526).
- Assumed: seeded grosir costs and margins (0.85–0.97 × HET), seeded warung and owner names (fictional, testnet). Must always be labelled as such.
- Absent, never fabricate: customers, testimonials, real warung partners, mainnet volume.

## Product Principles
1. The owner stays in control: every limit is visible and enforced on-chain, and the UI says so plainly.
2. Prove savings against a real public price, never a made-up one.
3. Set up once, then glance: daily use is checking results and confirming deliveries, on a phone.
4. Explain without jargon first; reveal the chain detail (tx links, hashes) on demand.
5. Honest about what is test data and what is out of scope.

## Accessibility & Inclusion
Mobile-first, readable for non-technical and older shop owners: large tap targets, plain English, high contrast, works on modest phones and slow connections.
