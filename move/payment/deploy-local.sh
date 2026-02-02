#!/bin/bash
# Deploy Move contract to localnet
# Auto-run by pay402-tmux.sh on startup

set -e

echo "🔨 Building Move contract..."
cd "$(dirname "$0")"

# Remove old publication file (chain ID might have changed)
rm -f Pub.local.toml

# Request gas if needed
echo "💰 Checking gas..."
sui client gas --json | jq -e '.[0]' > /dev/null 2>&1 || {
  echo "💰 Requesting gas from faucet..."
  sui client faucet
  sleep 3
}

# Test-publish (works without Move.toml env config)
echo "📦 Publishing contract..."
sui client test-publish --build-env local --json > /tmp/deploy-result.json 2>&1

# Extract package ID from JSON (handle spaces)
PACKAGE_ID=$(grep "packageId" /tmp/deploy-result.json | grep -o '0x[a-f0-9]\{64\}' | head -1)

if [ -n "$PACKAGE_ID" ]; then
  echo "✅ Contract deployed!"
  echo "📦 Package ID: $PACKAGE_ID"
  
  # Update .env files
  echo ""
  echo "📝 Updating .env files..."
  sed -i "s/^PACKAGE_ID=.*/PACKAGE_ID=$PACKAGE_ID/" ../../facilitator/.env
  echo "✅ Updated facilitator/.env"
  
  echo ""
  echo "🎉 Deployment complete!"
  echo "Package ID: $PACKAGE_ID"
  exit 0
else
  echo "❌ Deployment failed"
  cat /tmp/deploy-result.json
  exit 1
fi
