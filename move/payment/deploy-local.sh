#!/bin/bash
# Deploy Move contract using Suibase active chain (or fallback to sui client)
# Works on: localnet, testnet, devnet, mainnet
# Auto-run by pay402-tmux.sh on startup
#
# Usage:
#   ./deploy-local.sh           - Deploy (or skip if already deployed)
#   ./deploy-local.sh --force   - Force re-deploy even if exists

set -e

FORCE_DEPLOY=false
if [ "$1" = "--force" ]; then
  FORCE_DEPLOY=true
fi

echo "🔨 Checking Move contract deployment..."
cd "$(dirname "$0")"

# Try Suibase first (if installed)
if command -v suibase &> /dev/null; then
  echo "🔍 Using Suibase for network detection..."
  ACTIVE_WORKDIR=$(suibase get-active-workdir 2>/dev/null || echo "")
  if [ -n "$ACTIVE_WORKDIR" ]; then
    CHAIN_NAME=$(basename "$ACTIVE_WORKDIR")
    echo "📍 Active Suibase workdir: $CHAIN_NAME"
  fi
fi

# Fallback: Use sui client active-env
if [ -z "$CHAIN_NAME" ]; then
  echo "🔍 Using sui client for network detection..."
  CHAIN_NAME=$(sui client active-env 2>/dev/null || echo "localnet")
  echo "📍 Active environment: $CHAIN_NAME"
fi

echo "🌐 Deploying to: $CHAIN_NAME"

# Normalize chain name (sui uses "local", Move.toml uses "localnet")
BUILD_ENV="$CHAIN_NAME"
if [ "$CHAIN_NAME" = "local" ]; then
  BUILD_ENV="localnet"
fi

# Check if already deployed (unless --force)
# Priority: Read from network-specific .env file first, fallback to .env
ENV_FILE="../../facilitator/.env"
if [ -f "../../facilitator/.env.$CHAIN_NAME" ]; then
  ENV_FILE="../../facilitator/.env.$CHAIN_NAME"
  echo "📋 Using network-specific config: .env.$CHAIN_NAME"
elif [ -f "../../facilitator/.env.$CHAIN_NAME.example" ]; then
  ENV_FILE="../../facilitator/.env.$CHAIN_NAME.example"
  echo "📋 Using network-specific config: .env.$CHAIN_NAME.example"
fi

EXISTING_PACKAGE_ID=$(grep "^PACKAGE_ID=" "$ENV_FILE" 2>/dev/null | cut -d= -f2 || echo "")

if [ -n "$EXISTING_PACKAGE_ID" ] && [ "$EXISTING_PACKAGE_ID" != "0x0" ] && [ "$FORCE_DEPLOY" = false ]; then
  # Verify package exists on current network
  echo "🔍 Verifying package exists on $CHAIN_NAME..."
  if sui client object "$EXISTING_PACKAGE_ID" --json >/dev/null 2>&1; then
    echo "✅ Contract already deployed!"
    echo "📦 Package ID: $EXISTING_PACKAGE_ID"
    echo "🌐 Network: $CHAIN_NAME"
    echo ""
    echo "💡 To re-deploy: ./deploy-local.sh --force"
    exit 0
  else
    echo "⚠️  Package ID $EXISTING_PACKAGE_ID not found on $CHAIN_NAME"
    echo "    Proceeding with fresh deployment..."
  fi
fi

if [ "$FORCE_DEPLOY" = true ]; then
  echo "⚠️  Force re-deploying..."
fi

# Remove old publication files (both variants to be safe)
rm -f "Pub.${CHAIN_NAME}.toml" "Pub.${BUILD_ENV}.toml"

# Request gas if needed (skip for mainnet)
if [ "$CHAIN_NAME" != "mainnet" ]; then
  echo "💰 Checking gas..."
  sui client gas --json | jq -e '.[0]' > /dev/null 2>&1 || {
    echo "💰 Requesting gas from faucet..."
    sui client faucet
    sleep 3
  }
fi

# Test-publish (works across all networks)
echo "📦 Publishing contract..."
sui client test-publish --build-env "$BUILD_ENV" --json > /tmp/deploy-result.json 2>&1

# Extract package ID from JSON (handle spaces)
PACKAGE_ID=$(grep "packageId" /tmp/deploy-result.json | grep -o '0x[a-f0-9]\{64\}' | head -1)

if [ -n "$PACKAGE_ID" ]; then
  echo "✅ Contract deployed!"
  echo "📦 Package ID: $PACKAGE_ID"
  echo "🌐 Network: $CHAIN_NAME"
  
  # Update .env files
  echo ""
  echo "📝 Updating .env files..."
  sed -i "s/^PACKAGE_ID=.*/PACKAGE_ID=$PACKAGE_ID/" ../../facilitator/.env
  echo "✅ Updated facilitator/.env"
  
  # Also update merchant .env if it has PACKAGE_ID
  if grep -q "^PACKAGE_ID=" ../../merchant/.env 2>/dev/null; then
    sed -i "s/^PACKAGE_ID=.*/PACKAGE_ID=$PACKAGE_ID/" ../../merchant/.env
    echo "✅ Updated merchant/.env"
  fi
  
  echo ""
  echo "🎉 Deployment complete!"
  echo "📦 Package ID: $PACKAGE_ID"
  echo "🌐 Network: $CHAIN_NAME"
  exit 0
else
  echo "❌ Deployment failed"
  cat /tmp/deploy-result.json
  exit 1
fi
