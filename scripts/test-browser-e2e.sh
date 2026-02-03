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

# Check prerequisites
echo "Checking services..."

if ! curl -s http://localhost:3002/health > /dev/null; then
    echo "❌ Merchant not running (port 3002)"
    exit 1
fi

if ! curl -s http://localhost:3001/health > /dev/null; then
    echo "❌ Facilitator not running (port 3001)"
    exit 1
fi

if ! curl -s http://localhost:5173 > /dev/null; then
    echo "❌ Widget not running (port 5173)"
    exit 1
fi

echo "✓ All services running"
echo

# Get addresses
FACILITATOR_ADDR=$(curl -s http://localhost:3001/health | jq -r '.address')
echo "Facilitator: $FACILITATOR_ADDR"
echo

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Browser automation will now start..."
echo "  Watch the browser window for the full flow!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo

# The browser test will be driven by the MCP tool
# This script just sets up the environment and provides context
echo "Ready for browser automation!"
echo "Next: AI agent will use browser MCP tool to:"
echo "  1. Navigate to http://localhost:3002"
echo "  2. Click 'Get Premium Data'"
echo "  3. Complete payment flow"
echo "  4. Measure end-to-end timing"
echo
