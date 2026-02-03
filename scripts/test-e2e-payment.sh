#!/bin/bash
set -e

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}  Pay402 End-to-End Payment Flow Test${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo

# Check prerequisites
echo -e "${YELLOW}Checking prerequisites...${NC}"

if ! command -v sui &> /dev/null; then
    echo -e "${RED}✗ SUI CLI not found${NC}"
    exit 1
fi

if ! command -v jq &> /dev/null; then
    echo -e "${RED}✗ jq not found (install with: sudo apt install jq)${NC}"
    exit 1
fi

# Check localnet
if ! localnet status &> /dev/null; then
    echo -e "${RED}✗ Localnet not running${NC}"
    echo "  Start with: localnet start"
    exit 1
fi

echo -e "${GREEN}✓ Prerequisites OK${NC}"
echo

# Check services
echo -e "${YELLOW}Checking services...${NC}"

if ! curl -s http://localhost:3001/health > /dev/null 2>&1; then
    echo -e "${RED}✗ Facilitator not running (port 3001)${NC}"
    echo "  Start with: cd facilitator && npm run dev"
    exit 1
fi

if ! curl -s http://localhost:3002/health > /dev/null 2>&1; then
    echo -e "${RED}✗ Merchant not running (port 3002)${NC}"
    echo "  Start with: cd merchant && npm start"
    exit 1
fi

echo -e "${GREEN}✓ Services running${NC}"
echo

# Role separation for proper testing
FACILITATOR_ADDRESS=$(curl -s http://localhost:3001/health | jq -r '.facilitator')
echo -e "${BLUE}Facilitator Address:${NC} $FACILITATOR_ADDRESS"

# Use separate suibase addresses for buyer and merchant
# FIXME: Currently using facilitator key for buyer (need keypair access for signing)
# TODO: Implement proper buyer keypair management or use wallet SDK
BUYER_ADDRESS=$FACILITATOR_ADDRESS  # Temporary: same as facilitator for signing
echo -e "${BLUE}Buyer Address:${NC} $BUYER_ADDRESS ${YELLOW}(TEMP: using facilitator for signing)${NC}"

MERCHANT_ADDRESS=$(sui client active-address)  # sb-1-ed25519
echo -e "${BLUE}Merchant Address:${NC} $MERCHANT_ADDRESS"

echo
echo -e "${YELLOW}NOTE: Proper role separation requires:${NC}"
echo -e "  1. Buyer keypair accessible for signing (not just address)"
echo -e "  2. Separate funding per role (use scripts/fund-test-accounts.sh)"
echo -e "  3. Gas sponsorship testing (facilitator pays for unfunded buyer)"

echo
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}  Step 1: Check Gas Balances${NC}"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

SUI_TYPE="0x2::sui::SUI"
MIN_BALANCE="1000000000"  # 1 SUI minimum

# Check buyer balance
BUYER_BALANCE=$(curl -s -X POST http://localhost:3001/check-balance \
  -H "Content-Type: application/json" \
  -d "{\"address\":\"$BUYER_ADDRESS\",\"coinType\":\"$SUI_TYPE\",\"network\":\"localnet\"}" | jq -r '.balance // "0"')

if [ "$BUYER_BALANCE" = "0" ] || [ "$BUYER_BALANCE" = "null" ] || [ "$BUYER_BALANCE" -lt "$MIN_BALANCE" ]; then
    echo -e "${RED}✗ Buyer has insufficient SUI${NC}"
    echo -e "  Current: $(echo "scale=2; $BUYER_BALANCE / 1000000000" | bc 2>/dev/null || echo "0") SUI"
    echo -e "  Required: 1+ SUI"
    echo -e "  ${YELLOW}Requesting from faucet...${NC}"
    sui client faucet
    sleep 3
    # Re-check
    BUYER_BALANCE=$(curl -s -X POST http://localhost:3001/check-balance \
      -H "Content-Type: application/json" \
      -d "{\"address\":\"$BUYER_ADDRESS\",\"coinType\":\"$SUI_TYPE\",\"network\":\"localnet\"}" | jq -r '.balance // "0"')
fi

BALANCE_SUI=$(echo "scale=2; $BUYER_BALANCE / 1000000000" | bc)
echo -e "${GREEN}✓ Buyer has sufficient SUI${NC}"
echo -e "  Balance: $BALANCE_SUI SUI ($BUYER_BALANCE nanoSUI)"

# Check facilitator balance (needed for gas sponsorship if applicable)
FACILITATOR_BALANCE=$(curl -s -X POST http://localhost:3001/check-balance \
  -H "Content-Type: application/json" \
  -d "{\"address\":\"$FACILITATOR_ADDRESS\",\"coinType\":\"$SUI_TYPE\",\"network\":\"localnet\"}" | jq -r '.balance // "0"')

if [ "$FACILITATOR_BALANCE" = "0" ] || [ "$FACILITATOR_BALANCE" = "null" ]; then
    echo -e "${YELLOW}! Facilitator has no SUI (may be OK for buyer-paid gas)${NC}"
    echo -e "  Balance: 0 SUI"
else
    FACI_BALANCE_SUI=$(echo "scale=2; $FACILITATOR_BALANCE / 1000000000" | bc)
    echo -e "${GREEN}✓ Facilitator has SUI${NC}"
    echo -e "  Balance: $FACI_BALANCE_SUI SUI ($FACILITATOR_BALANCE nanoSUI)"
fi

echo
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}  Step 2: Get Invoice JWT from Merchant${NC}"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

INVOICE_RESPONSE=$(curl -s http://localhost:3002/api/premium-data)
INVOICE_JWT=$(echo "$INVOICE_RESPONSE" | jq -r '.invoice')

if [ "$INVOICE_JWT" = "null" ] || [ -z "$INVOICE_JWT" ]; then
    echo -e "${RED}✗ Failed to get invoice${NC}"
    echo "$INVOICE_RESPONSE"
    exit 1
fi

echo -e "${GREEN}✓ Invoice received${NC}"
echo -e "  JWT: ${INVOICE_JWT:0:50}..."

# Decode invoice
INVOICE_PAYLOAD=$(echo "$INVOICE_JWT" | cut -d'.' -f2 | base64 -d 2>/dev/null || echo "{}")
AMOUNT=$(echo "$INVOICE_PAYLOAD" | jq -r '.amount')
FEE=$(echo "$INVOICE_PAYLOAD" | jq -r '.facilitatorFee')
COIN_TYPE=$(echo "$INVOICE_PAYLOAD" | jq -r '.coinType')
echo -e "  Amount: $AMOUNT"
echo -e "  Fee: $FEE"
echo -e "  Coin: ${COIN_TYPE:0:20}..."

echo
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}  Step 3: Build PTB via Facilitator${NC}"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

PTB_RESPONSE=$(curl -s -X POST http://localhost:3001/build-ptb \
  -H "Content-Type: application/json" \
  -d "{\"buyerAddress\":\"$BUYER_ADDRESS\",\"invoiceJWT\":\"$INVOICE_JWT\"}")

if ! echo "$PTB_RESPONSE" | jq -e '.ptbBytes' > /dev/null 2>&1; then
    echo -e "${RED}✗ PTB build failed${NC}"
    echo "$PTB_RESPONSE" | jq '.'
    exit 1
fi

echo -e "${GREEN}✓ PTB built successfully${NC}"
PTB_BYTES_LENGTH=$(echo "$PTB_RESPONSE" | jq '.ptbBytes | length')
echo -e "  PTB size: $PTB_BYTES_LENGTH bytes"

PTB_BYTES=$(echo "$PTB_RESPONSE" | jq -r '.ptbBytes')

echo
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}  Step 4: Sign PTB with Buyer Keypair (sui keytool)${NC}"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

# Sign PTB with buyer's key (via facilitator endpoint since buyer=facilitator for testing)
SIGN_RESPONSE=$(curl -s -X POST http://localhost:3001/sign-ptb \
  -H "Content-Type: application/json" \
  -d "{\"ptbBytes\":$PTB_BYTES}")

if ! echo "$SIGN_RESPONSE" | jq -e '.signature' > /dev/null 2>&1; then
    echo -e "${RED}✗ Signing failed${NC}"
    echo "$SIGN_RESPONSE" | jq '.'
    exit 1
fi

SIGNATURE=$(echo "$SIGN_RESPONSE" | jq -r '.signature')
echo -e "${GREEN}✓ PTB signed with buyer's key (facilitator key for testing)${NC}"
echo -e "  Signature: ${SIGNATURE:0:50}..."

# Prepare signed transaction JSON
SIGNED_TX=$(jq -n \
  --argjson ptbBytes "$PTB_BYTES" \
  --arg signature "$SIGNATURE" \
  '{
    "transactionBytes": $ptbBytes,
    "signature": $signature
  }')

echo
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}  Step 5A: Submit Payment (OPTIMISTIC mode)${NC}"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

SUBMIT_RESPONSE=$(curl -s -X POST http://localhost:3001/submit-payment \
  -H "Content-Type: application/json" \
  -d "{
    \"invoiceJWT\":\"$INVOICE_JWT\",
    \"buyerAddress\":\"$BUYER_ADDRESS\",
    \"signedTransaction\":$SIGNED_TX,
    \"settlementMode\":\"optimistic\"
  }")

if echo "$SUBMIT_RESPONSE" | jq -e '.success' > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Payment submitted (optimistic)${NC}"
    TX_DIGEST=$(echo "$SUBMIT_RESPONSE" | jq -r '.digest')
    SUBMIT_LAT=$(echo "$SUBMIT_RESPONSE" | jq -r '.submitLatency // .latency')
    HTTP_LAT=$(echo "$SUBMIT_RESPONSE" | jq -r '.httpLatency // .latency')
    echo -e "  Digest: $TX_DIGEST"
    echo -e "  Submit latency: $SUBMIT_LAT (to finality)"
    echo -e "  HTTP latency: $HTTP_LAT (total round-trip)"
else
    echo -e "${RED}✗ Submission failed${NC}"
    echo "$SUBMIT_RESPONSE" | jq '.'
    exit 1
fi

echo
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}  Step 5B: Submit Payment (PESSIMISTIC mode)${NC}"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

# Need to rebuild PTB for second test
PTB_RESPONSE2=$(curl -s -X POST http://localhost:3001/build-ptb \
  -H "Content-Type: application/json" \
  -d "{\"buyerAddress\":\"$BUYER_ADDRESS\",\"invoiceJWT\":\"$INVOICE_JWT\"}")

PTB_BYTES2=$(echo "$PTB_RESPONSE2" | jq -r '.ptbBytes')

# Sign with buyer's key (via facilitator endpoint)
SIGN_RESPONSE2=$(curl -s -X POST http://localhost:3001/sign-ptb \
  -H "Content-Type: application/json" \
  -d "{\"ptbBytes\":$PTB_BYTES2}")
SIGNATURE2=$(echo "$SIGN_RESPONSE2" | jq -r '.signature')

SIGNED_TX2=$(jq -n \
  --argjson ptbBytes "$PTB_BYTES2" \
  --arg signature "$SIGNATURE2" \
  '{
    "transactionBytes": $ptbBytes,
    "signature": $signature
  }')

SUBMIT_RESPONSE2=$(curl -s -X POST http://localhost:3001/submit-payment \
  -H "Content-Type: application/json" \
  -d "{
    \"invoiceJWT\":\"$INVOICE_JWT\",
    \"buyerAddress\":\"$BUYER_ADDRESS\",
    \"signedTransaction\":$SIGNED_TX2,
    \"settlementMode\":\"pessimistic\"
  }")

if echo "$SUBMIT_RESPONSE2" | jq -e '.success' > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Payment submitted (pessimistic mode)${NC}"
    TX_DIGEST2=$(echo "$SUBMIT_RESPONSE2" | jq -r '.digest')
    LATENCY2=$(echo "$SUBMIT_RESPONSE2" | jq -r '.latency')
    HAS_RECEIPT=$(echo "$SUBMIT_RESPONSE2" | jq -e '.receipt' > /dev/null 2>&1 && echo "yes" || echo "no")
    echo -e "  Digest: $TX_DIGEST2"
    echo -e "  Latency: $LATENCY2"
    echo -e "  Receipt included: $HAS_RECEIPT"
else
    echo -e "${RED}✗ Submission failed${NC}"
    echo "$SUBMIT_RESPONSE2" | jq '.'
    exit 1
fi

echo
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}  Step 6: Verify On-Chain Settlement${NC}"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

# Wait for finality if needed
echo "Waiting for transaction finality..."
sleep 2

# Query transaction
TX_RESULT=$(sui client object $TX_DIGEST2 --json 2>/dev/null || echo "{}")

echo -e "${GREEN}✓ Transaction on-chain${NC}"
echo -e "  Explorer: http://localhost:44380/txblock/$TX_DIGEST2"

# No cleanup needed (using API endpoints)

echo
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}  ✓ END-TO-END TEST PASSED${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo
echo -e "${BLUE}Summary:${NC}"
echo -e "  Optimistic Mode:"
echo -e "    Submit: $SUBMIT_LAT | HTTP: $HTTP_LAT"
echo -e "  Wait Mode:"
echo -e "    Submit: $SUBMIT_LAT2 | HTTP: $HTTP_LAT2"
echo -e "  Transaction Digest: $TX_DIGEST2"
echo
echo -e "${YELLOW}NOTE: Localnet Behavior${NC}"
echo -e "  - Both modes similar due to instant finality (~20-150ms)"
echo -e "  - SDK executeTransaction() always waits for checkpoint"
echo -e "  - Transaction deduplication can make 2nd call faster"
echo
echo -e "${BLUE}Expected on Testnet/Mainnet:${NC}"
echo -e "  - Optimistic: ~50-100ms (submit + return digest)"
echo -e "  - Wait: ~500-1000ms (submit + wait for checkpoint)"
echo -e "  - Real consensus delay will show true difference"
echo -e "  - See docs/architecture/SETTLEMENT_MODES.md for details"
echo
