#!/usr/bin/env bash
# Deploy the rosca_pool contract to Stellar testnet
# Usage: ./scripts/deploy-contract.sh [--identity <name>]
#
# Prerequisites:
#   cargo install --locked stellar-cli --features opt
#   stellar keys generate deployer --network testnet  (or use --identity flag)

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$SCRIPT_DIR/.."
IDENTITY="${1:-deployer}"

echo "==> Building contract (optimised)..."
cd "$ROOT"
stellar contract build --manifest-path contracts/rosca_pool/Cargo.toml

WASM="target/wasm32-unknown-unknown/release/rosca_pool.wasm"
if [ ! -f "$WASM" ]; then
  echo "ERROR: WASM not found at $WASM"
  exit 1
fi
echo "    WASM size: $(du -sh $WASM | cut -f1)"

echo "==> Deploying to testnet..."
CONTRACT_ID=$(stellar contract deploy \
  --wasm "$WASM" \
  --source "$IDENTITY" \
  --network testnet)

echo ""
echo "✅ Contract deployed!"
echo "   Contract ID: $CONTRACT_ID"
echo ""
echo "Add to backend/.env:"
echo "   CONTRACT_IDS=$CONTRACT_ID"
echo "   DEMO_CONTRACT_ID=$CONTRACT_ID"
echo ""

# Optionally append to backend/.env if it exists
if [ -f "$ROOT/backend/.env" ]; then
  read -rp "Append CONTRACT_IDS to backend/.env? [y/N] " CONFIRM
  if [[ "$CONFIRM" =~ ^[Yy]$ ]]; then
    echo "CONTRACT_IDS=$CONTRACT_ID" >> "$ROOT/backend/.env"
    echo "DEMO_CONTRACT_ID=$CONTRACT_ID" >> "$ROOT/backend/.env"
    echo "Written to backend/.env"
  fi
fi
