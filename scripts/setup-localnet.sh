#!/bin/bash
# Pay402 Local Development Setup Script

set -e

echo "🚀 Pay402 Local Network Setup"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Check if sui is installed
if ! command -v sui &> /dev/null; then
    echo "❌ Error: sui CLI not found"
    echo "   Install from: https://docs.sui.io/guides/developer/getting-started/sui-install"
    exit 1
fi

echo "✅ SUI CLI found: $(sui --version)"
echo ""

# Create localnet environment if it doesn't exist
echo "📝 Setting up localnet environment..."
if ! sui client envs | grep -q "localnet"; then
    sui client new-env --alias localnet --rpc http://127.0.0.1:9000
    echo "✅ Created localnet environment"
else
    echo "✅ Localnet environment already exists"
fi

# Switch to localnet
sui client switch --env localnet
echo "✅ Switched to localnet"
echo ""

# Check current environment
echo "Current configuration:"
echo "  Environment: $(sui client active-env)"
echo "  Address: $(sui client active-address)"
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🎯 Next Steps:"
echo ""
echo "1. Start local network (in separate terminal):"
echo "   sui start --with-faucet --force-regenesis"
echo ""
echo "2. Get test SUI:"
echo "   sui client faucet"
echo ""
echo "3. Deploy Move contract:"
echo "   cd move/payment"
echo "   sui client publish --gas-budget 100000000"
echo ""
echo "4. Configure facilitator:"
echo "   cd ../../facilitator"
echo "   cp .env.example .env"
echo "   # Edit .env with PACKAGE_ID and FACILITATOR_PRIVATE_KEY"
echo ""
echo "5. Run tests:"
echo "   npm test"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
