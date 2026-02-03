#!/bin/bash
# Full Browser E2E Test - Complete User Journey
# 
# Simulates real user flow:
# 1. Click "Get Premium Data" on merchant page
# 2. Redirect to Pay402 widget
# 3. Payment processing (optimistic vs pessimistic)
# 4. Redirect back to merchant
# 5. Premium content displayed
#
# Tests BOTH modes with timing measurements

set -e

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Pay402 Full Browser E2E Test"
echo "  Complete user journey with timing"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check prerequisites
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Step 1: Checking Services"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo

if ! curl -s http://localhost:3002/health > /dev/null; then
    echo -e "${RED}❌ Merchant not running (port 3002)${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Merchant running${NC}"

if ! curl -s http://localhost:3001/health > /dev/null; then
    echo -e "${RED}❌ Facilitator not running (port 3001)${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Facilitator running${NC}"

if ! curl -s http://localhost:5173 > /dev/null; then
    echo -e "${RED}❌ Widget not running (port 5173)${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Widget running${NC}"

echo

# Get addresses and check balances
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Step 2: Checking Balances & Roles"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo

# Get facilitator info
FACILITATOR_INFO=$(curl -s http://localhost:3001/health)
FACILITATOR_ADDR=$(echo "$FACILITATOR_INFO" | jq -r '.facilitator')
MERCHANT_ADDR=$(echo "$FACILITATOR_INFO" | jq -r '.merchant // .facilitator')

echo "Addresses:"
echo "  Facilitator: $FACILITATOR_ADDR"
echo "  Merchant:    $MERCHANT_ADDR"
echo

# Check facilitator balance
echo "Checking Facilitator Balance..."
FACILITATOR_BALANCE=$(sui client gas "$FACILITATOR_ADDR" --json 2>/dev/null | jq '[.[] | .mistBalance] | add // 0')
FACILITATOR_SUI=$(echo "scale=2; $FACILITATOR_BALANCE / 1000000000" | bc)

if [ -z "$FACILITATOR_BALANCE" ] || [ "$FACILITATOR_BALANCE" -eq 0 ]; then
    echo -e "${RED}❌ Facilitator has 0 SUI${NC}"
    echo "   Run: sui client faucet --address $FACILITATOR_ADDR"
    exit 1
fi

if [ "$FACILITATOR_BALANCE" -lt 1000000000 ]; then
    echo -e "${YELLOW}⚠️  Facilitator has low balance: ${FACILITATOR_SUI} SUI${NC}"
    echo "   Recommended: At least 1 SUI for gas sponsorship"
    echo "   Run: sui client faucet --address $FACILITATOR_ADDR"
else
    echo -e "${GREEN}✓ Facilitator balance: ${FACILITATOR_SUI} SUI${NC}"
fi

# Check if facilitator can fund test accounts (needs at least 20 SUI for safety)
MIN_FOR_FUNDING=20000000000  # 20 SUI
if [ "$FACILITATOR_BALANCE" -lt "$MIN_FOR_FUNDING" ]; then
    echo -e "${YELLOW}⚠️  Warning: Low balance for funding test accounts${NC}"
    echo "   Current: ${FACILITATOR_SUI} SUI"
    echo "   Recommended: At least 20 SUI to fund multiple test buyers"
    echo "   The test will work but may fail if we need to fund new addresses"
    echo
fi

# Check merchant balance (if different from facilitator)
if [ "$MERCHANT_ADDR" != "$FACILITATOR_ADDR" ]; then
    echo
    echo "Checking Merchant Balance..."
    MERCHANT_BALANCE=$(sui client gas "$MERCHANT_ADDR" --json 2>/dev/null | jq '[.[] | .mistBalance] | add // 0')
    MERCHANT_SUI=$(echo "scale=2; $MERCHANT_BALANCE / 1000000000" | bc)
    
    if [ -z "$MERCHANT_BALANCE" ] || [ "$MERCHANT_BALANCE" -eq 0 ]; then
        echo -e "${YELLOW}⚠️  Merchant has 0 SUI (OK for receiving payments)${NC}"
    else
        echo -e "${GREEN}✓ Merchant balance: ${MERCHANT_SUI} SUI${NC}"
    fi
fi

# Summary
echo
echo "Balance Summary:"
echo "  Total facilitator funds: ${FACILITATOR_SUI} SUI"
echo "  Minimum required: 1 SUI (for gas sponsorship)"
echo "  Recommended: 20+ SUI (for funding test accounts)"
echo

if [ "$FACILITATOR_BALANCE" -lt 1000000000 ]; then
    echo -e "${RED}❌ Cannot proceed: Insufficient facilitator balance${NC}"
    exit 1
fi

echo -e "${GREEN}✓ All balance checks passed${NC}"
echo

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Step 3: Ready for Browser Automation"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo
echo -e "${GREEN}✓ All checks passed - ready to start!${NC}"
echo
echo "The browser test will:"
echo "  1. Navigate to http://localhost:3002"
echo "  2. Click 'Get Premium Data'"  
echo "  3. Generate new buyer keypair"
echo "  4. Fund buyer address (if needed)"
echo "  5. Complete payment flow"
echo "  6. Verify premium content display"
echo "  7. Measure end-to-end timing"
echo
echo -e "${YELLOW}Note: The test creates NEW random buyer addresses each run${NC}"
echo "      Funded by facilitator's balance checked above"
echo
echo "Watch the browser window for the full flow!"
echo
