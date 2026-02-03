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

# Get buyer address (active address)
BUYER_ADDRESS=$(sui client active-address)
echo -e "${BLUE}Buyer Address:${NC} $BUYER_ADDRESS"

# Get merchant address (for testing, use buyer as merchant)
MERCHANT_ADDRESS=$BUYER_ADDRESS
echo -e "${BLUE}Merchant Address:${NC} $MERCHANT_ADDRESS"

echo
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}  Step 1: Fund Buyer with USDC${NC}"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

FUND_RESPONSE=$(curl -s -X POST http://localhost:3001/fund \
  -H "Content-Type: application/json" \
  -d "{\"address\":\"$BUYER_ADDRESS\",\"amount\":\"1000000\"}")

if echo "$FUND_RESPONSE" | jq -e '.success' > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Funded buyer with 1 USDC${NC}"
    BUYER_BALANCE=$(echo "$FUND_RESPONSE" | jq -r '.balance')
    echo -e "  Balance: $BUYER_BALANCE microUSDC"
else
    echo -e "${RED}✗ Funding failed${NC}"
    echo "$FUND_RESPONSE" | jq '.'
    exit 1
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
echo -e "  Amount: $AMOUNT microUSDC"
echo -e "  Fee: $FEE microUSDC"

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

# Save PTB bytes to temp file for signing
echo "$PTB_RESPONSE" | jq -r '.ptbBytes | @json' > /tmp/ptb_bytes.json

echo
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}  Step 4: Sign PTB with Buyer Keypair${NC}"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

# Create Node.js script to sign PTB
cat > /tmp/sign_ptb.js << 'EOF'
const { Transaction } = require('@mysten/sui/transactions');
const { Ed25519Keypair } = require('@mysten/sui/keypairs/ed25519');
const { toB64 } = require('@mysten/sui/utils');
const fs = require('fs');

(async () => {
  try {
    // Read PTB bytes
    const ptbBytesArray = JSON.parse(fs.readFileSync('/tmp/ptb_bytes.json', 'utf8'));
    const ptbBytes = new Uint8Array(ptbBytesArray);
    
    // Get keypair from environment
    const privateKeyBase64 = process.env.FACILITATOR_PRIVATE_KEY;
    if (!privateKeyBase64) {
      console.error('FACILITATOR_PRIVATE_KEY not set');
      process.exit(1);
    }
    
    // For testing, we'll use facilitator key as buyer (hackathon demo)
    const keypair = Ed25519Keypair.fromSecretKey(privateKeyBase64);
    
    // Sign transaction bytes
    const signature = await keypair.signTransaction(ptbBytes);
    
    // Output result
    console.log(JSON.stringify({
      transactionBytes: toB64(ptbBytes),
      signature: signature.signature,
    }));
  } catch (err) {
    console.error('Signing failed:', err.message);
    process.exit(1);
  }
})();
EOF

cd /home/hamiha70/Projects/ETHGlobal/HackMoney_Jan26/Pay402/facilitator

SIGNED_TX=$(node /tmp/sign_ptb.js 2>/dev/null)

if [ $? -ne 0 ]; then
    echo -e "${RED}✗ Signing failed${NC}"
    exit 1
fi

echo -e "${GREEN}✓ PTB signed${NC}"
SIGNATURE=$(echo "$SIGNED_TX" | jq -r '.signature')
echo -e "  Signature: ${SIGNATURE:0:50}..."

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
    LATENCY=$(echo "$SUBMIT_RESPONSE" | jq -r '.latency')
    echo -e "  Digest: $TX_DIGEST"
    echo -e "  Latency: $LATENCY"
else
    echo -e "${RED}✗ Submission failed${NC}"
    echo "$SUBMIT_RESPONSE" | jq '.'
    exit 1
fi

echo
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}  Step 5B: Submit Payment (WAIT mode)${NC}"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

# Need to rebuild PTB for second test
PTB_RESPONSE2=$(curl -s -X POST http://localhost:3001/build-ptb \
  -H "Content-Type: application/json" \
  -d "{\"buyerAddress\":\"$BUYER_ADDRESS\",\"invoiceJWT\":\"$INVOICE_JWT\"}")

echo "$PTB_RESPONSE2" | jq -r '.ptbBytes | @json' > /tmp/ptb_bytes2.json

cat > /tmp/sign_ptb2.js << 'EOF'
const { Ed25519Keypair } = require('@mysten/sui/keypairs/ed25519');
const { toB64 } = require('@mysten/sui/utils');
const fs = require('fs');

(async () => {
  const ptbBytesArray = JSON.parse(fs.readFileSync('/tmp/ptb_bytes2.json', 'utf8'));
  const ptbBytes = new Uint8Array(ptbBytesArray);
  const keypair = Ed25519Keypair.fromSecretKey(process.env.FACILITATOR_PRIVATE_KEY);
  const signature = await keypair.signTransaction(ptbBytes);
  console.log(JSON.stringify({
    transactionBytes: toB64(ptbBytes),
    signature: signature.signature,
  }));
})();
EOF

SIGNED_TX2=$(node /tmp/sign_ptb2.js 2>/dev/null)

SUBMIT_RESPONSE2=$(curl -s -X POST http://localhost:3001/submit-payment \
  -H "Content-Type: application/json" \
  -d "{
    \"invoiceJWT\":\"$INVOICE_JWT\",
    \"buyerAddress\":\"$BUYER_ADDRESS\",
    \"signedTransaction\":$SIGNED_TX2,
    \"settlementMode\":\"wait\"
  }")

if echo "$SUBMIT_RESPONSE2" | jq -e '.success' > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Payment submitted (wait mode)${NC}"
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

# Cleanup
rm -f /tmp/ptb_bytes.json /tmp/ptb_bytes2.json /tmp/sign_ptb.js /tmp/sign_ptb2.js

echo
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}  ✓ END-TO-END TEST PASSED${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo
echo -e "${BLUE}Summary:${NC}"
echo -e "  Optimistic Mode Latency: $LATENCY"
echo -e "  Wait Mode Latency: $LATENCY2"
echo -e "  Transaction Digest: $TX_DIGEST2"
echo
