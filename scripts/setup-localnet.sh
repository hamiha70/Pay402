#!/bin/bash
# Pay402 Local Network Setup Script

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

echo "📝 Setup Instructions:"
echo ""
echo "Since the local network isn't running yet, follow these steps:"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Step 1: Start Local Network"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Open a NEW terminal/tmux pane and run:"
echo ""
echo "  sui start --with-faucet --force-regenesis"
echo ""
echo "You should see output like:"
echo "  Sui local network is running"  
echo "  Full node: http://127.0.0.1:9000"
echo "  Faucet: http://127.0.0.1:9123"
echo ""
echo "⚠️  Keep this terminal open! The network must stay running."
echo ""
echo "Press ENTER once the local network is running..."
read

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Step 2: Configure SUI CLI"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Now create the environment
if sui client new-env --alias localnet --rpc http://127.0.0.1:9000; then
    echo "✅ Created localnet environment"
else
    echo "❌ Failed to create environment. Is the network running?"
    exit 1
fi

# Switch to localnet
sui client switch --env localnet
echo "✅ Switched to localnet"
echo ""

# Show current config
echo "Current configuration:"
echo "  Environment: $(sui client active-env)"
echo "  Address: $(sui client active-address)"
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Step 3: Get Test Funds"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Getting SUI from local faucet..."
sui client faucet
echo ""
echo "Checking balance..."
sui client gas
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Setup Complete!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "🎯 Next Steps:"
echo ""
echo "1. Deploy Move contract:"
echo "   cd move/payment"
echo "   sui client publish --gas-budget 100000000"
echo ""
echo "2. Run Move tests:"
echo "   sui move test"
echo ""
echo "3. Configure facilitator (.env file):"
echo "   cd ../../facilitator"
echo "   cp .env.example .env"
echo ""
echo "   Then edit .env with:"
echo "   - SUI_NETWORK=localnet"
echo "   - PACKAGE_ID=<from deploy output>"
echo "   - FACILITATOR_PRIVATE_KEY=<generate new key>"
echo ""
echo "   To generate a new key:"
echo "   sui client new-address ed25519"
echo "   sui keytool export --key-identity <ADDRESS> --json"
echo ""
echo "4. Run facilitator tests:"
echo "   cd facilitator"
echo "   npm test"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "💡 Pro Tips:"
echo "   - Use tmux for managing multiple terminals"
echo "   - Local network resets with --force-regenesis (fresh state)"
echo "   - Omit --force-regenesis to persist state between restarts"
echo "   - WSL2 works great for SUI development!"
echo ""
