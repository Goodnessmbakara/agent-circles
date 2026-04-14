#!/usr/bin/env bash
# Generate agent keypair, fund via Friendbot, write to backend/.env
# Usage: ./scripts/setup-testnet.sh

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$SCRIPT_DIR/.."
ENV_FILE="$ROOT/backend/.env"

echo "==> Generating agent identity..."
stellar keys generate agent --network testnet 2>/dev/null || echo "    (identity 'agent' already exists)"

AGENT_PUBLIC=$(stellar keys address agent)
AGENT_SECRET=$(stellar keys show agent --expose-secret 2>/dev/null | grep -v "^$" | tail -1)

echo "    Public key: $AGENT_PUBLIC"

echo "==> Funding via Friendbot..."
curl -sf "https://friendbot.stellar.org?addr=$AGENT_PUBLIC" > /dev/null
echo "    Funded ✅"

# Create or update .env
if [ ! -f "$ENV_FILE" ]; then
  cp "$ROOT/backend/.env.example" "$ENV_FILE"
  echo "    Created backend/.env from .env.example"
fi

# Write agent key
if grep -q "AGENT_SECRET_KEY=" "$ENV_FILE"; then
  sed -i.bak "s|AGENT_SECRET_KEY=.*|AGENT_SECRET_KEY=$AGENT_SECRET|" "$ENV_FILE" && rm -f "$ENV_FILE.bak"
else
  echo "AGENT_SECRET_KEY=$AGENT_SECRET" >> "$ENV_FILE"
fi

echo ""
echo "✅ Agent setup complete!"
echo "   Public key: $AGENT_PUBLIC"
echo "   Secret key written to: $ENV_FILE"
echo ""
echo "Next steps:"
echo "  1. Run ./scripts/deploy-contract.sh to deploy the ROSCA contract"
echo "  2. Add your CLAUDE_API_KEY to backend/.env"
echo "  3. Start the backend: cd backend && npm run dev"
