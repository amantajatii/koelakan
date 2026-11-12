#!/usr/bin/env bash
# Deploy the core Koelakan accounts to NEAR testnet.
#   ROOT=koelakan.testnet ./scripts/deploy-testnet.sh
# Creates tidr./market./koordinator./arbiter. sub-accounts, deploys both
# contracts, loads the catalogue from data/prices.json and registers the
# market on the token. Agent accounts (warung-*, grosir-*) are created later
# by the agents setup. Requires: near-cli-rs, jq, res/*.wasm (./scripts/build.sh).
set -euo pipefail
cd "$(dirname "$0")/.."

ROOT="${ROOT:-koelakan.testnet}"
NET="network-config testnet"
SIGN="sign-with-legacy-keychain send"
TIDR="tidr.$ROOT"
MARKET="market.$ROOT"
KOORD="koordinator.$ROOT"
ARBITER="arbiter.$ROOT"

exists() { near account view-account-summary "$1" $NET now >/dev/null 2>&1; }

create() { # account, amount
  if exists "$1"; then echo "skip: $1 exists"; return; fi
  near account create-account fund-myself "$1" "$2" autogenerate-new-keypair \
    save-to-legacy-keychain sign-as "$ROOT" $NET $SIGN
}

[[ -f res/tidr.wasm && -f res/market.wasm ]] || { echo "run ./scripts/build.sh first"; exit 1; }

create "$TIDR" '2 NEAR'
create "$MARKET" '3.2 NEAR'
create "$KOORD" '0.3 NEAR'
create "$ARBITER" '0.2 NEAR'

near contract deploy "$TIDR" use-file res/tidr.wasm \
  with-init-call new json-args '{}' prepaid-gas '100.0 Tgas' attached-deposit '0 NEAR' $NET $SIGN

near contract deploy "$MARKET" use-file res/market.wasm \
  with-init-call new json-args "{\"admin\":\"$ROOT\",\"arbiter\":\"$ARBITER\",\"token\":\"$TIDR\"}" \
  prepaid-gas '100.0 Tgas' attached-deposit '0 NEAR' $NET $SIGN

# Register the market on tidr so it can hold escrow (NEP-145).
near contract call-function as-transaction "$TIDR" storage_deposit \
  json-args "{\"account_id\":\"$MARKET\",\"registration_only\":true}" \
  prepaid-gas '30.0 Tgas' attached-deposit '0.01 NEAR' sign-as "$ROOT" $NET $SIGN

# Catalogue: real PIHPS reference prices.
jq -c '.items[] | {item: {id, name, unit, ref_price, het, source, as_of}}' data/prices.json |
while read -r args; do
  near contract call-function as-transaction "$MARKET" set_item json-args "$args" \
    prepaid-gas '30.0 Tgas' attached-deposit '1 yoctoNEAR' sign-as "$ROOT" $NET $SIGN
done

near contract call-function as-read-only "$MARKET" get_items json-args '{}' $NET now
