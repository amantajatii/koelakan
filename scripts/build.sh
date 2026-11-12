#!/usr/bin/env bash
# Build both contracts to wasm with cargo-near. Output: res/*.wasm
set -euo pipefail
cd "$(dirname "$0")/.."
mkdir -p res
for c in tidr market; do
  (cd "contracts/$c" && cargo near build non-reproducible-wasm --no-abi)
  cp "target/near/$c/$c.wasm" "res/$c.wasm"
done
ls -lh res/
