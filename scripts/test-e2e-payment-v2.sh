#!/bin/bash
# End-to-end test for Pay402 payment flow
# Tests BOTH settlement modes with SEPARATE, ISOLATED runs
# 
# Output: Console + /tmp/test-e2e-payment.log (append)
# Correlate with: /tmp/facilitator.log

set -e

# Logging setup
LOG_FILE="/tmp/test-e2e-payment.log"
exec > >(tee -a "$LOG_FILE") 2>&1

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
GRAY='\033[0;90m'
NC='\033[0m'

# Timing helper
time_step() {
    echo "$(($(date +%s%3N) - START_MS))ms"
}

echo ""
echo "========================================="
echo "TEST RUN: $(date -Iseconds)"
echo "========================================="
echo

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}  Pay402 End-to-End Payment Flow Test (v2)${NC}"
echo -e "${BLUE}  Two isolated runs: Optimistic + Wait modes${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo

# Prerequisites check
echo -e "${YELLOW}Checking prerequisites...${NC}"
command -v sui &> /dev/null || { echo -e "${RED}✗ SUI CLI not found${NC}"; exit 1; }
command -v jq &> /dev/null || { echo -e "${RED}✗ jq not found${NC}"; exit 1; }
command -v curl &> /dev/null || { echo -e "${RED}✗ curl not found${NC}"; exit 1; }
echo -e "${GREEN}✓ Prerequisites OK${NC}"
echo

# Services check
echo -e "${YELLOW}Checking services...${NC}"
curl -s http://localhost:3001/health > /dev/null 2>&1 || {
    echo -e "${RED}✗ Facilitator not running (port 3001)${NC}"
    exit 1
}
curl -s http://localhost:3002/health > /dev/null 2>&1 || {
    echo -e "${RED}✗ Merchant not running (port 3002)${NC}"
    exit 1
}
echo -e "${GREEN}✓ Services running${NC}"
echo

# Get addresses
FACILITATOR_ADDRESS=$(curl -s http://localhost:3001/health | jq -r '.facilitator')
BUYER_ADDRESS=$FACILITATOR_ADDRESS  # Temp: same for signing
MERCHANT_ADDRESS=$(sui client active-address)

echo -e "${GRAY}Facilitator: $FACILITATOR_ADDRESS${NC}"
echo -e "${GRAY}Buyer:       $BUYER_ADDRESS (using facilitator key)${NC}"
echo -e "${GRAY}Merchant:    $MERCHANT_ADDRESS${NC}"
echo

#############################################################################
# FUNCTION: Run complete payment flow
#############################################################################
run_payment_flow() {
    local MODE=$1
    local RUN_NUM=$2
    
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}  RUN $RUN_NUM: ${MODE^^} MODE${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo
    
    FLOW_START=$(date +%s%3N)
    
    # Step 1: Get Invoice
    echo -e "${YELLOW}Step 1: Get Invoice JWT from Merchant${NC}"
    STEP_START=$(date +%s%3N)
    INVOICE_RESPONSE=$(curl -s http://localhost:3002/api/premium-data)
    INVOICE_JWT=$(echo "$INVOICE_RESPONSE" | jq -r '.invoice')
    STEP_LAT=$(($(date +%s%3N) - STEP_START))
    echo -e "${GREEN}✓ Invoice received${NC} ${GRAY}[${STEP_LAT}ms]${NC}"
    echo
    
    # Step 2: Build PTB
    echo -e "${YELLOW}Step 2: Build PTB via Facilitator${NC}"
    STEP_START=$(date +%s%3N)
    PTB_RESPONSE=$(curl -s -X POST http://localhost:3001/build-ptb \
        -H "Content-Type: application/json" \
        -d "{\"buyerAddress\":\"$BUYER_ADDRESS\",\"invoiceJWT\":\"$INVOICE_JWT\"}")
    
    if ! echo "$PTB_RESPONSE" | jq -e '.ptbBytes' > /dev/null 2>&1; then
        echo -e "${RED}✗ PTB build failed${NC}"
        echo "$PTB_RESPONSE" | jq '.'
        return 1
    fi
    
    PTB_BYTES=$(echo "$PTB_RESPONSE" | jq -r '.ptbBytes')
    PTB_SIZE=$(echo "$PTB_BYTES" | jq '. | length')
    STEP_LAT=$(($(date +%s%3N) - STEP_START))
    echo -e "${GREEN}✓ PTB built${NC} ${GRAY}[$PTB_SIZE bytes, ${STEP_LAT}ms]${NC}"
    echo
    
    # Step 3: Sign PTB
    echo -e "${YELLOW}Step 3: Sign PTB with Buyer Keypair${NC}"
    STEP_START=$(date +%s%3N)
    SIGN_RESPONSE=$(curl -s -X POST http://localhost:3001/sign-ptb \
        -H "Content-Type: application/json" \
        -d "{\"ptbBytes\":$PTB_BYTES}")
    
    SIGNATURE=$(echo "$SIGN_RESPONSE" | jq -r '.signature')
    STEP_LAT=$(($(date +%s%3N) - STEP_START))
    echo -e "${GREEN}✓ PTB signed${NC} ${GRAY}[${STEP_LAT}ms]${NC}"
    echo
    
    # Prepare signed transaction
    SIGNED_TX=$(jq -n \
        --argjson ptbBytes "$PTB_BYTES" \
        --arg signature "$SIGNATURE" \
        '{
            "transactionBytes": $ptbBytes,
            "signature": $signature
        }')
    
    # Step 4: Submit Payment
    echo -e "${YELLOW}Step 4: Submit Payment (${MODE} mode)${NC}"
    STEP_START=$(date +%s%3N)
    SUBMIT_RESPONSE=$(curl -s -X POST http://localhost:3001/submit-payment \
        -H "Content-Type: application/json" \
        -d "{
            \"invoiceJWT\":\"$INVOICE_JWT\",
            \"buyerAddress\":\"$BUYER_ADDRESS\",
            \"signedTransaction\":$SIGNED_TX,
            \"settlementMode\":\"$MODE\"
        }")
    
    HTTP_LAT=$(($(date +%s%3N) - STEP_START))
    
    if echo "$SUBMIT_RESPONSE" | jq -e '.success' > /dev/null 2>&1; then
        DIGEST=$(echo "$SUBMIT_RESPONSE" | jq -r '.digest')
        SUBMIT_LAT=$(echo "$SUBMIT_RESPONSE" | jq -r '.submitLatency // "N/A"')
        SERVER_HTTP_LAT=$(echo "$SUBMIT_RESPONSE" | jq -r '.httpLatency // "N/A"')
        
        echo -e "${GREEN}✓ Payment submitted${NC}"
        echo -e "  Digest: ${DIGEST}"
        echo -e "  ${GRAY}Client-side HTTP: ${HTTP_LAT}ms${NC}"
        echo -e "  ${GRAY}Server-side submit: ${SUBMIT_LAT}${NC}"
        echo -e "  ${GRAY}Server-side HTTP: ${SERVER_HTTP_LAT}${NC}"
    else
        echo -e "${RED}✗ Submission failed${NC}"
        echo "$SUBMIT_RESPONSE" | jq '.'
        return 1
    fi
    
    FLOW_LAT=$(($(date +%s%3N) - FLOW_START))
    echo
    echo -e "${BLUE}────────────────────────────────────────────────────────────${NC}"
    echo -e "${BLUE}TOTAL FLOW LATENCY: ${FLOW_LAT}ms${NC}"
    echo -e "${BLUE}────────────────────────────────────────────────────────────${NC}"
    echo
    
    # Export for summary
    if [ "$MODE" == "optimistic" ]; then
        OPT_DIGEST=$DIGEST
        OPT_TOTAL=$FLOW_LAT
        OPT_HTTP=$HTTP_LAT
    else
        WAIT_DIGEST=$DIGEST
        WAIT_TOTAL=$FLOW_LAT
        WAIT_HTTP=$HTTP_LAT
    fi
}

#############################################################################
# RUN 1: OPTIMISTIC MODE
#############################################################################
run_payment_flow "optimistic" "1"

echo -e "${YELLOW}Waiting 2 seconds before next run...${NC}"
sleep 2
echo

#############################################################################
# RUN 2: WAIT MODE
#############################################################################
run_payment_flow "wait" "2"

#############################################################################
# SUMMARY
#############################################################################
echo
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}  ✓ BOTH RUNS COMPLETED${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo
echo -e "${BLUE}SUMMARY:${NC}"
echo -e "  Optimistic Mode:"
echo -e "    Total flow: ${OPT_TOTAL}ms"
echo -e "    HTTP submit: ${OPT_HTTP}ms"
echo -e "    Digest: ${OPT_DIGEST}"
echo
echo -e "  Wait Mode:"
echo -e "    Total flow: ${WAIT_TOTAL}ms"
echo -e "    HTTP submit: ${WAIT_HTTP}ms"
echo -e "    Digest: ${WAIT_DIGEST}"
echo
echo -e "${YELLOW}NOTE: Localnet vs Testnet${NC}"
echo -e "  - Localnet: Both modes ~200-300ms (instant finality)"
echo -e "  - Testnet: Optimistic ~200ms, Wait ~900ms (real consensus)"
echo -e "  - See logs: /tmp/test-e2e-payment.log"
echo -e "  - See server: /tmp/facilitator.log"
echo
echo "========================================="
echo "TEST RUN ENDED: $(date -Iseconds)"
echo "========================================="
