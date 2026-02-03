#!/bin/bash
# Fund test accounts for e2e testing
# Ensures proper role separation: buyer, merchant, facilitator

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}  Fund Test Accounts (Role Separation)${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo

# Check if .env exists
if [ ! -f "facilitator/.env" ]; then
    echo -e "${RED}✗ facilitator/.env not found${NC}"
    exit 1
fi

# Load facilitator address from .env
source facilitator/.env
FACILITATOR_ADDRESS=$(echo "$FACILITATOR_PRIVATE_KEY" | sui keytool show --json 2>/dev/null | jq -r '.address' || echo "")

if [ -z "$FACILITATOR_ADDRESS" ]; then
    echo -e "${RED}✗ Could not derive facilitator address from FACILITATOR_PRIVATE_KEY${NC}"
    exit 1
fi

echo -e "${YELLOW}Role Addresses:${NC}"
echo -e "  Facilitator: $FACILITATOR_ADDRESS"

# For testing, we'll use different suibase addresses
BUYER_ADDRESS="0xf7ae71f84fabc58662bd4209a8893f462c60f247095bb35b19ff659ad0081462"  # sb-1-ed25519
MERCHANT_ADDRESS="0x8c66fda13388668dcb7bbe402c56e5819fa429f973070f094775711a4bb63b34"  # sb-2-ed25519

echo -e "  Buyer:       $BUYER_ADDRESS"
echo -e "  Merchant:    $MERCHANT_ADDRESS"
echo

# Funding function
fund_address() {
    local address=$1
    local role=$2
    
    echo -e "${YELLOW}Funding $role ($address)...${NC}"
    
    curl -s -X POST http://127.0.0.1:9123/gas \
        -H 'Content-Type: application/json' \
        -d "{\"FixedAmountRequest\":{\"recipient\":\"$address\"}}" > /dev/null
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ $role funded${NC}"
    else
        echo -e "${RED}✗ $role funding failed${NC}"
        return 1
    fi
}

# Fund all roles
fund_address "$FACILITATOR_ADDRESS" "Facilitator"
fund_address "$BUYER_ADDRESS" "Buyer"
fund_address "$MERCHANT_ADDRESS" "Merchant"

echo
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}  ✓ All test accounts funded${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo
echo -e "${BLUE}Test Scenarios Available:${NC}"
echo -e "  1. Normal flow: All funded"
echo -e "  2. Gas sponsorship: Drain buyer, facilitator sponsors"
echo -e "  3. Insufficient funds: Check validation"
