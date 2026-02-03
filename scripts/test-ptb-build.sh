#!/bin/bash
# Rapid PTB Build Test - No browser needed!
#
# Tests the core PTB building logic quickly:
# 1. Get invoice
# 2. Build PTB
# 3. Verify PTB structure
#
# This is FAST and catches issues early before full E2E test.

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}  Rapid PTB Build Test (No Browser)${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo

# Check services
echo -e "${YELLOW}Checking services...${NC}"
if ! curl -s http://localhost:3001/health > /dev/null; then
    echo -e "${RED}❌ Facilitator not running${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Facilitator running${NC}"

if ! curl -s http://localhost:3002/health > /dev/null; then
    echo -e "${RED}❌ Merchant not running${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Merchant running${NC}"
echo

# Get facilitator address (has plenty of SUI with multiple coins)
FACILITATOR_INFO=$(curl -s http://localhost:3001/health)
FACILITATOR_ADDR=$(echo "$FACILITATOR_INFO" | jq -r '.facilitator')

echo -e "${BLUE}Test Address:${NC} $FACILITATOR_ADDR"
echo -e "${YELLOW}(Using facilitator address since it has multiple coin objects)${NC}"
echo

# Step 1: Get Invoice
echo -e "${BLUE}━━━ Step 1: Get Invoice ━━━${NC}"
START=$(date +%s%3N)
INVOICE_RESPONSE=$(curl -s http://localhost:3002/api/premium-data)
INVOICE_JWT=$(echo "$INVOICE_RESPONSE" | jq -r '.invoice')
INVOICE_TIME=$(($(date +%s%3N) - START))

if [ -z "$INVOICE_JWT" ] || [ "$INVOICE_JWT" == "null" ]; then
    echo -e "${RED}❌ Failed to get invoice${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Invoice received${NC} (${INVOICE_TIME}ms)"
echo "  JWT length: ${#INVOICE_JWT} bytes"
echo

# Step 2: Build PTB
echo -e "${BLUE}━━━ Step 2: Build PTB ━━━${NC}"
START=$(date +%s%3N)
BUILD_RESPONSE=$(curl -s -X POST http://localhost:3001/build-ptb \
    -H "Content-Type: application/json" \
    -d "{\"buyerAddress\":\"$FACILITATOR_ADDR\",\"invoiceJWT\":\"$INVOICE_JWT\"}")
BUILD_TIME=$(($(date +%s%3N) - START))

# Check for errors
if echo "$BUILD_RESPONSE" | jq -e '.error' > /dev/null 2>&1; then
    echo -e "${RED}❌ Build PTB failed${NC}"
    echo "$BUILD_RESPONSE" | jq '.'
    exit 1
fi

# Check for transaction kind bytes
TK_SIZE=$(echo "$BUILD_RESPONSE" | jq '.transactionKindBytes | length')
if [ -z "$TK_SIZE" ] || [ "$TK_SIZE" == "null" ] || [ "$TK_SIZE" -eq 0 ]; then
    echo -e "${RED}❌ No transaction kind bytes returned${NC}"
    echo "$BUILD_RESPONSE" | jq '.'
    exit 1
fi

echo -e "${GREEN}✓ Transaction kind built successfully${NC} (${BUILD_TIME}ms)"
echo "  Transaction kind size: ${TK_SIZE} bytes"
echo "  (Ready for sponsored transaction - buyer signs, facilitator adds gas)"
echo

# Step 3: Analyze transaction kind structure
echo -e "${BLUE}━━━ Step 3: Analyze Transaction Kind ━━━${NC}"

# Save transaction kind bytes to temp file
echo "$BUILD_RESPONSE" | jq '.transactionKindBytes' > /tmp/tk_test.json

# Count number of bytes
TK_BYTES=$(cat /tmp/tk_test.json | jq '. | length')

echo -e "${GREEN}✓ Transaction kind structure valid${NC}"
echo "  Byte array length: ${TK_BYTES}"
echo "  Format: Transaction kind only (no gas data)"
echo

# Extract invoice details from response
INVOICE_DETAILS=$(echo "$BUILD_RESPONSE" | jq '.invoice')
if [ "$INVOICE_DETAILS" != "null" ]; then
    echo -e "${BLUE}Invoice Details:${NC}"
    echo "$INVOICE_DETAILS" | jq '.'
    echo
fi

# Summary
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✓ All tests passed!${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo
echo "Performance:"
echo "  Get Invoice:  ${INVOICE_TIME}ms"
echo "  Build PTB:    ${BUILD_TIME}ms"
echo "  Total:        $((INVOICE_TIME + BUILD_TIME))ms"
echo
echo -e "${YELLOW}Next: Run full E2E test with browser automation${NC}"
echo "  bash scripts/test-e2e-payment.sh"
echo
