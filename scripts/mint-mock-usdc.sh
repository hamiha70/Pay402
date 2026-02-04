#!/bin/bash
# Mint MockUSDC for testing
# Usage: ./scripts/mint-mock-usdc.sh <recipient_address> <amount_in_usdc>
#
# Examples:
#   ./scripts/mint-mock-usdc.sh $(sui client active-address) 1000
#   ./scripts/mint-mock-usdc.sh 0x123... 500

set -e

PACKAGE_ID="0x34f1b450e7815b8b95df68cb6bfd81bbaf42607acf1f345bcb4a2fc732ca648b"
TREASURY_CAP="0x21aa4203c1f95e3e0584624b274f3e5c630578efaba76bb47d53d5d7421fde11"

# Validate arguments
if [ -z "$1" ] || [ -z "$2" ]; then
  echo "Usage: $0 <recipient_address> <amount_in_usdc>"
  echo ""
  echo "Examples:"
  echo "  $0 \$(sui client active-address) 1000    # Mint 1000 USDC to active address"
  echo "  $0 0x123... 500                          # Mint 500 USDC to specific address"
  exit 1
fi

RECIPIENT="$1"
AMOUNT_USDC="$2"
AMOUNT_MIST=$((AMOUNT_USDC * 1000000))  # Convert USDC to 6 decimals

echo "=================================================="
echo "MockUSDC Minting"
echo "=================================================="
echo "Recipient:     $RECIPIENT"
echo "Amount:        $AMOUNT_USDC USDC"
echo "Amount (MIST): $AMOUNT_MIST"
echo "=================================================="
echo ""

sui client call \
  --package "$PACKAGE_ID" \
  --module mock_usdc \
  --function mint \
  --args "$TREASURY_CAP" "$AMOUNT_MIST" "$RECIPIENT" \
  --gas-budget 10000000

echo ""
echo "✅ Minted $AMOUNT_USDC USDC to $RECIPIENT"
echo ""
echo "Verify balance:"
echo "  sui client balance --owner $RECIPIENT | grep MOCK_USDC"
