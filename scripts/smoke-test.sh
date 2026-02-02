#!/bin/bash
# Pay402 Smoke Test Script
# Validates all services are working correctly
#
# Usage: ./scripts/smoke-test.sh

set -e

echo "🧪 Pay402 Smoke Test Suite"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

FACILITATOR_URL="http://localhost:3001"
MERCHANT_URL="http://localhost:3002"
WIDGET_URL="http://localhost:5173"

TESTS_PASSED=0
TESTS_FAILED=0

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Helper function to test HTTP endpoint
test_endpoint() {
  local name="$1"
  local url="$2"
  local expected_status="${3:-200}"
  
  printf "Testing: %-40s" "$name"
  
  response=$(curl -s -o /dev/null -w "%{http_code}" "$url" 2>&1 || echo "FAILED")
  
  if [ "$response" = "$expected_status" ]; then
    echo -e "${GREEN}✓ PASS${NC} (HTTP $response)"
    ((TESTS_PASSED++))
    return 0
  else
    echo -e "${RED}✗ FAIL${NC} (HTTP $response, expected $expected_status)"
    ((TESTS_FAILED++))
    return 1
  fi
}

# Helper function to test JSON response
test_json_response() {
  local name="$1"
  local url="$2"
  local json_field="$3"
  
  printf "Testing: %-40s" "$name"
  
  response=$(curl -s "$url" 2>&1)
  
  if echo "$response" | jq -e "$json_field" > /dev/null 2>&1; then
    echo -e "${GREEN}✓ PASS${NC}"
    ((TESTS_PASSED++))
    return 0
  else
    echo -e "${RED}✗ FAIL${NC} (field '$json_field' not found)"
    ((TESTS_FAILED++))
    return 1
  fi
}

# Helper function to test POST endpoint
test_post_endpoint() {
  local name="$1"
  local url="$2"
  local data="$3"
  local expected_status="${4:-200}"
  
  printf "Testing: %-40s" "$name"
  
  response=$(curl -s -o /dev/null -w "%{http_code}" -X POST \
    -H "Content-Type: application/json" \
    -d "$data" \
    "$url" 2>&1 || echo "FAILED")
  
  if [ "$response" = "$expected_status" ]; then
    echo -e "${GREEN}✓ PASS${NC} (HTTP $response)"
    ((TESTS_PASSED++))
    return 0
  else
    echo -e "${RED}✗ FAIL${NC} (HTTP $response, expected $expected_status)"
    ((TESTS_FAILED++))
    return 1
  fi
}

echo "🔍 SERVICE HEALTH CHECKS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Test facilitator
test_endpoint "Facilitator Health" "$FACILITATOR_URL/health"
test_json_response "Facilitator Status Field" "$FACILITATOR_URL/health" '.status'
test_json_response "Facilitator Service Field" "$FACILITATOR_URL/health" '.service'

# Test merchant
test_endpoint "Merchant Health" "$MERCHANT_URL/health"

# Test widget (Vite dev server)
test_endpoint "Widget" "$WIDGET_URL"

echo ""
echo "🎫 MERCHANT API TESTS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Test merchant JWT generation
test_endpoint "Merchant Premium Data" "$MERCHANT_URL/api/premium-data" "402"
test_json_response "Merchant Invoice Field" "$MERCHANT_URL/api/premium-data" '.invoice'
test_json_response "Merchant Error Field" "$MERCHANT_URL/api/premium-data" '.error'

# Extract JWT for further tests
INVOICE_JWT=$(curl -s "$MERCHANT_URL/api/premium-data" | jq -r '.invoice')

if [ -n "$INVOICE_JWT" ] && [ "$INVOICE_JWT" != "null" ]; then
  echo -e "Testing: JWT Format                              ${GREEN}✓ PASS${NC} (valid JWT)"
  ((TESTS_PASSED++))
  
  # Verify JWT has 3 parts (header.payload.signature)
  JWT_PARTS=$(echo "$INVOICE_JWT" | awk -F. '{print NF}')
  if [ "$JWT_PARTS" -eq 3 ]; then
    echo -e "Testing: JWT Structure                           ${GREEN}✓ PASS${NC} (3 parts)"
    ((TESTS_PASSED++))
  else
    echo -e "Testing: JWT Structure                           ${RED}✗ FAIL${NC} ($JWT_PARTS parts, expected 3)"
    ((TESTS_FAILED++))
  fi
else
  echo -e "Testing: JWT Format                              ${RED}✗ FAIL${NC} (no JWT returned)"
  ((TESTS_FAILED++))
fi

echo ""
echo "🚀 FACILITATOR API TESTS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Test build-ptb with missing invoice
test_post_endpoint "Build PTB - Missing Invoice" \
  "$FACILITATOR_URL/build-ptb" \
  '{"buyerAddress":"0xca0027e5a2a47e748fef3845bd3ed51852fe30af40832d7a952eacc71eab0f37"}' \
  "400"

# Test build-ptb with missing buyer address
test_post_endpoint "Build PTB - Missing Buyer" \
  "$FACILITATOR_URL/build-ptb" \
  "{\"invoice\":\"$INVOICE_JWT\"}" \
  "400"

# Test build-ptb with invalid JWT
test_post_endpoint "Build PTB - Invalid JWT" \
  "$FACILITATOR_URL/build-ptb" \
  '{"invoice":"not-a-jwt","buyerAddress":"0xca0027e5a2a47e748fef3845bd3ed51852fe30af40832d7a952eacc71eab0f37"}' \
  "401"

# Test build-ptb with valid inputs
if [ -n "$INVOICE_JWT" ] && [ "$INVOICE_JWT" != "null" ]; then
  printf "Testing: %-40s" "Build PTB - Valid Request"
  
  BUYER_ADDRESS=$(sui client active-address 2>/dev/null || echo "0xca0027e5a2a47e748fef3845bd3ed51852fe30af40832d7a952eacc71eab0f37")
  
  response=$(curl -s -w "\n%{http_code}" -X POST \
    -H "Content-Type: application/json" \
    -d "{\"invoice\":\"$INVOICE_JWT\",\"buyerAddress\":\"$BUYER_ADDRESS\"}" \
    "$FACILITATOR_URL/build-ptb" 2>&1)
  
  http_code=$(echo "$response" | tail -n1)
  body=$(echo "$response" | head -n-1)
  
  if [ "$http_code" = "200" ]; then
    if echo "$body" | jq -e '.ptbBytes' > /dev/null 2>&1; then
      PTB_LENGTH=$(echo "$body" | jq '.ptbBytes | length')
      if [ "$PTB_LENGTH" -gt 0 ]; then
        echo -e "${GREEN}✓ PASS${NC} (PTB bytes length: $PTB_LENGTH)"
        ((TESTS_PASSED++))
      else
        echo -e "${RED}✗ FAIL${NC} (empty PTB bytes)"
        ((TESTS_FAILED++))
      fi
    else
      echo -e "${RED}✗ FAIL${NC} (no ptbBytes field)"
      ((TESTS_FAILED++))
    fi
  else
    echo -e "${RED}✗ FAIL${NC} (HTTP $http_code)"
    echo "Response: $body"
    ((TESTS_FAILED++))
  fi
fi

echo ""
echo "⛓️  BLOCKCHAIN TESTS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Check if SUI client is available
if command -v sui &> /dev/null; then
  printf "Testing: %-40s" "SUI Client Available"
  echo -e "${GREEN}✓ PASS${NC}"
  ((TESTS_PASSED++))
  
  # Check active environment
  ACTIVE_ENV=$(sui client active-env 2>&1 || echo "none")
  if [ "$ACTIVE_ENV" = "local" ]; then
    printf "Testing: %-40s" "Active Environment"
    echo -e "${GREEN}✓ PASS${NC} ($ACTIVE_ENV)"
    ((TESTS_PASSED++))
  else
    printf "Testing: %-40s" "Active Environment"
    echo -e "${YELLOW}⚠ WARN${NC} ($ACTIVE_ENV, expected 'local')"
  fi
  
  # Check gas balance
  GAS_COUNT=$(sui client gas --json 2>&1 | jq '. | length' 2>/dev/null || echo "0")
  if [ "$GAS_COUNT" -gt 0 ]; then
    printf "Testing: %-40s" "Gas Coins Available"
    echo -e "${GREEN}✓ PASS${NC} ($GAS_COUNT coins)"
    ((TESTS_PASSED++))
  else
    printf "Testing: %-40s" "Gas Coins Available"
    echo -e "${YELLOW}⚠ WARN${NC} (no gas coins - run: sui client faucet)"
  fi
  
  # Check if Move contract is deployed
  if [ -f "../facilitator/.env" ]; then
    PACKAGE_ID=$(grep "^PACKAGE_ID=" ../facilitator/.env | cut -d= -f2)
    if [ -n "$PACKAGE_ID" ] && [ "$PACKAGE_ID" != "0x0" ]; then
      printf "Testing: %-40s" "Move Contract Deployed"
      echo -e "${GREEN}✓ PASS${NC} ($PACKAGE_ID)"
      ((TESTS_PASSED++))
    else
      printf "Testing: %-40s" "Move Contract Deployed"
      echo -e "${YELLOW}⚠ WARN${NC} (no package ID in .env)"
    fi
  fi
else
  printf "Testing: %-40s" "SUI Client Available"
  echo -e "${RED}✗ FAIL${NC} (sui command not found)"
  ((TESTS_FAILED++))
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 TEST SUMMARY"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo -e "  ${GREEN}Passed:${NC}  $TESTS_PASSED"
echo -e "  ${RED}Failed:${NC}  $TESTS_FAILED"
echo -e "  Total:   $((TESTS_PASSED + TESTS_FAILED))"
echo ""

if [ $TESTS_FAILED -eq 0 ]; then
  echo -e "${GREEN}✅ ALL TESTS PASSED!${NC}"
  echo ""
  echo "🎉 Pay402 system is ready for testing!"
  exit 0
else
  echo -e "${RED}❌ SOME TESTS FAILED${NC}"
  echo ""
  echo "💡 Tips:"
  echo "  - Make sure all services are running (./scripts/pay402-tmux.sh)"
  echo "  - Check logs in Pay402/logs/"
  echo "  - Run: sui client faucet (if gas warnings)"
  exit 1
fi
