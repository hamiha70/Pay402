#!/bin/bash
# Pay402 Environment Setup Script
# Automates configuration of localnet and testnet environment files
#
# Usage:
#   ./setup-env.sh           # Interactive setup
#   ./setup-env.sh --force   # Force reconfigure (overwrites existing)

set -e

PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
FORCE_SETUP=false

# Parse arguments
if [ "$1" = "--force" ]; then
  FORCE_SETUP=true
fi

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo ""
echo "🔧 Pay402 Environment Setup"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# ========================================
# STEP 0: Prerequisites Check
# ========================================
echo "📋 Checking prerequisites..."

# Check if sui CLI is installed
if ! command -v sui &> /dev/null; then
  echo -e "${RED}❌ Error: sui CLI not found${NC}"
  echo ""
  echo "Please install SUI CLI first:"
  echo "  curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh"
  echo "  cargo install --locked --git https://github.com/MystenLabs/sui.git --branch testnet sui"
  echo ""
  exit 1
fi

echo -e "${GREEN}✅ sui CLI found: $(sui --version)${NC}"
echo ""

# ========================================
# STEP 1: Check if Already Configured
# ========================================
CONFIG_EXISTS=false
if [ -f "$PROJECT_DIR/widget/.env.localnet" ] || [ -f "$PROJECT_DIR/widget/.env.testnet" ]; then
  CONFIG_EXISTS=true
fi

if [ "$CONFIG_EXISTS" = true ] && [ "$FORCE_SETUP" = false ]; then
  echo -e "${YELLOW}⚠️  Configuration files already exist.${NC}"
  echo ""
  echo "Found existing configurations:"
  [ -f "$PROJECT_DIR/facilitator/.env.localnet" ] && echo "  • facilitator/.env.localnet"
  [ -f "$PROJECT_DIR/facilitator/.env.testnet" ] && echo "  • facilitator/.env.testnet"
  [ -f "$PROJECT_DIR/widget/.env.localnet" ] && echo "  • widget/.env.localnet"
  [ -f "$PROJECT_DIR/widget/.env.testnet" ] && echo "  • widget/.env.testnet"
  echo ""
  read -p "Do you want to reconfigure? This will overwrite existing files. (y/n): " -n 1 -r
  echo ""
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Setup cancelled."
    exit 0
  fi
  echo ""
fi

# ========================================
# STEP 2: Copy Template Files
# ========================================
echo "📁 Copying template files..."

# Facilitator
cp "$PROJECT_DIR/facilitator/.env.localnet.example" "$PROJECT_DIR/facilitator/.env.localnet"
cp "$PROJECT_DIR/facilitator/.env.testnet.example" "$PROJECT_DIR/facilitator/.env.testnet"
echo -e "${GREEN}  ✅ Facilitator templates copied${NC}"

# Merchant
cp "$PROJECT_DIR/merchant/.env.localnet.example" "$PROJECT_DIR/merchant/.env.localnet"
cp "$PROJECT_DIR/merchant/.env.testnet.example" "$PROJECT_DIR/merchant/.env.testnet"
echo -e "${GREEN}  ✅ Merchant templates copied${NC}"

# Widget
cp "$PROJECT_DIR/widget/.env.localnet.example" "$PROJECT_DIR/widget/.env.localnet"
cp "$PROJECT_DIR/widget/.env.testnet.example" "$PROJECT_DIR/widget/.env.testnet"
echo -e "${GREEN}  ✅ Widget templates copied${NC}"

echo ""

# ========================================
# STEP 3: Collect Shared Secrets
# ========================================
echo "🔑 Configure shared secrets (used for both localnet and testnet)"
echo ""

# Enoki API Key
while true; do
  read -p "Enter your Enoki API Key (public key): " ENOKI_KEY
  
  # Validate format: enoki_public_[64 hex chars]
  if [[ $ENOKI_KEY =~ ^enoki_public_[a-f0-9]{64}$ ]]; then
    echo -e "${GREEN}  ✅ Valid Enoki API key${NC}"
    break
  else
    echo -e "${RED}  ❌ Invalid format. Expected: enoki_public_[64 hex characters]${NC}"
    echo "     Example: enoki_public_7edbeb7decb38349e30a6d900cdc8843..."
    echo ""
  fi
done
echo ""

# Google OAuth Client ID
while true; do
  read -p "Enter your Google OAuth Client ID: " GOOGLE_CLIENT_ID
  
  # Validate format: numbers-letters.apps.googleusercontent.com
  if [[ $GOOGLE_CLIENT_ID =~ ^[0-9]+-[a-z0-9]+\.apps\.googleusercontent\.com$ ]]; then
    echo -e "${GREEN}  ✅ Valid Google Client ID${NC}"
    break
  else
    echo -e "${RED}  ❌ Invalid format. Expected: NNNNNN-XXXXX.apps.googleusercontent.com${NC}"
    echo "     Example: 300529773657-abc123.apps.googleusercontent.com"
    echo ""
  fi
done
echo ""

# Update widget config files with shared secrets
echo "📝 Updating configuration files..."

# Update localnet
if [[ "$OSTYPE" == "darwin"* ]]; then
  # macOS
  sed -i '' "s|^VITE_ENOKI_API_KEY=.*|VITE_ENOKI_API_KEY=$ENOKI_KEY|" "$PROJECT_DIR/widget/.env.localnet"
  sed -i '' "s|^VITE_GOOGLE_CLIENT_ID=.*|VITE_GOOGLE_CLIENT_ID=$GOOGLE_CLIENT_ID|" "$PROJECT_DIR/widget/.env.localnet"
  
  # Update testnet
  sed -i '' "s|^VITE_ENOKI_API_KEY=.*|VITE_ENOKI_API_KEY=$ENOKI_KEY|" "$PROJECT_DIR/widget/.env.testnet"
  sed -i '' "s|^VITE_GOOGLE_CLIENT_ID=.*|VITE_GOOGLE_CLIENT_ID=$GOOGLE_CLIENT_ID|" "$PROJECT_DIR/widget/.env.testnet"
else
  # Linux
  sed -i "s|^VITE_ENOKI_API_KEY=.*|VITE_ENOKI_API_KEY=$ENOKI_KEY|" "$PROJECT_DIR/widget/.env.localnet"
  sed -i "s|^VITE_GOOGLE_CLIENT_ID=.*|VITE_GOOGLE_CLIENT_ID=$GOOGLE_CLIENT_ID|" "$PROJECT_DIR/widget/.env.localnet"
  
  sed -i "s|^VITE_ENOKI_API_KEY=.*|VITE_ENOKI_API_KEY=$ENOKI_KEY|" "$PROJECT_DIR/widget/.env.testnet"
  sed -i "s|^VITE_GOOGLE_CLIENT_ID=.*|VITE_GOOGLE_CLIENT_ID=$GOOGLE_CLIENT_ID|" "$PROJECT_DIR/widget/.env.testnet"
fi

echo -e "${GREEN}  ✅ Widget configs updated (localnet + testnet)${NC}"
echo ""

# ========================================
# STEP 4: Facilitator Keys
# ========================================
echo "🔐 Configure facilitator keys"
echo ""
echo "The facilitator needs separate private keys for localnet and testnet."
echo "This provides security isolation between environments."
echo ""
read -p "Do you want to auto-generate new keys? (recommended) (y/n): " -n 1 -r
echo ""
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
  # Auto-generate keys
  echo "🎲 Generating new facilitator keys..."
  echo ""
  
  # Generate localnet key
  echo "Generating localnet facilitator key..."
  LOCALNET_OUTPUT=$(sui client new-address ed25519 2>&1)
  LOCALNET_KEY=$(echo "$LOCALNET_OUTPUT" | grep -o 'suiprivkey1q[a-z0-9]*' | head -1)
  LOCALNET_ADDR=$(echo "$LOCALNET_OUTPUT" | grep -o '0x[a-f0-9]\{64\}' | head -1)
  
  if [ -z "$LOCALNET_KEY" ]; then
    echo -e "${RED}❌ Failed to generate localnet key${NC}"
    exit 1
  fi
  
  echo -e "${GREEN}  ✅ Localnet key generated${NC}"
  echo "     Address: ${LOCALNET_ADDR:0:20}..."
  echo ""
  
  # Generate testnet key
  echo "Generating testnet facilitator key..."
  TESTNET_OUTPUT=$(sui client new-address ed25519 2>&1)
  TESTNET_KEY=$(echo "$TESTNET_OUTPUT" | grep -o 'suiprivkey1q[a-z0-9]*' | head -1)
  TESTNET_ADDR=$(echo "$TESTNET_OUTPUT" | grep -o '0x[a-f0-9]\{64\}' | head -1)
  
  if [ -z "$TESTNET_KEY" ]; then
    echo -e "${RED}❌ Failed to generate testnet key${NC}"
    exit 1
  fi
  
  echo -e "${GREEN}  ✅ Testnet key generated${NC}"
  echo "     Address: ${TESTNET_ADDR:0:20}..."
  echo ""
  
else
  # User provides existing keys
  echo "Enter your existing facilitator keys."
  echo ""
  
  read -p "Localnet facilitator private key: " LOCALNET_KEY
  LOCALNET_ADDR=""
  echo ""
  
  read -p "Testnet facilitator private key: " TESTNET_KEY
  read -p "Testnet facilitator address: " TESTNET_ADDR
  echo ""
fi

# Update facilitator config files
echo "📝 Updating facilitator configurations..."

if [[ "$OSTYPE" == "darwin"* ]]; then
  # macOS
  sed -i '' "s|^FACILITATOR_PRIVATE_KEY=.*|FACILITATOR_PRIVATE_KEY=$LOCALNET_KEY|" "$PROJECT_DIR/facilitator/.env.localnet"
  
  sed -i '' "s|^FACILITATOR_PRIVATE_KEY=.*|FACILITATOR_PRIVATE_KEY=$TESTNET_KEY|" "$PROJECT_DIR/facilitator/.env.testnet"
  sed -i '' "s|^FACILITATOR_ADDRESS=.*|FACILITATOR_ADDRESS=$TESTNET_ADDR|" "$PROJECT_DIR/facilitator/.env.testnet"
else
  # Linux
  sed -i "s|^FACILITATOR_PRIVATE_KEY=.*|FACILITATOR_PRIVATE_KEY=$LOCALNET_KEY|" "$PROJECT_DIR/facilitator/.env.localnet"
  
  sed -i "s|^FACILITATOR_PRIVATE_KEY=.*|FACILITATOR_PRIVATE_KEY=$TESTNET_KEY|" "$PROJECT_DIR/facilitator/.env.testnet"
  sed -i "s|^FACILITATOR_ADDRESS=.*|FACILITATOR_ADDRESS=$TESTNET_ADDR|" "$PROJECT_DIR/facilitator/.env.testnet"
fi

echo -e "${GREEN}  ✅ Facilitator configs updated${NC}"
echo ""

# ========================================
# STEP 5: Summary
# ========================================
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${GREEN}✅ Setup Complete!${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📊 Configuration Summary:"
echo ""
echo "Shared Secrets:"
echo "  • Enoki API Key: ${ENOKI_KEY:0:30}..."
echo "  • Google Client ID: ${GOOGLE_CLIENT_ID:0:30}..."
echo ""
echo "Facilitator Keys:"
echo "  • Localnet: ${LOCALNET_KEY:0:30}..."
if [ -n "$LOCALNET_ADDR" ]; then
  echo "    Address: ${LOCALNET_ADDR:0:20}..."
fi
echo "  • Testnet: ${TESTNET_KEY:0:30}..."
echo "    Address: ${TESTNET_ADDR:0:20}..."
echo ""
echo "Files Created:"
echo "  ✅ facilitator/.env.localnet"
echo "  ✅ facilitator/.env.testnet"
echo "  ✅ merchant/.env.localnet"
echo "  ✅ merchant/.env.testnet"
echo "  ✅ widget/.env.localnet"
echo "  ✅ widget/.env.testnet"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "🚀 Next Steps:"
echo ""
echo "1. Configure Google OAuth redirect URIs:"
echo "   → Visit: https://console.cloud.google.com"
echo "   → Add redirect URI: http://localhost:5173/zklogin-test"
echo "   → Add redirect URI: http://localhost:5173"
echo ""
echo "2. Start Pay402 on localnet (for development):"
echo -e "   ${BLUE}./scripts/pay402-tmux.sh --localnet${NC}"
echo ""
echo "3. Or start on testnet (for testing):"
echo -e "   ${BLUE}./scripts/pay402-tmux.sh --testnet${NC}"
echo "   ${YELLOW}Note: Requires manual testnet funding first!${NC}"
echo ""
echo "4. Visit the payment widget:"
echo "   → http://localhost:5173"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
