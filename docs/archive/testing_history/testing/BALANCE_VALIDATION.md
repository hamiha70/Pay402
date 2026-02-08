# Balance & Address Validation

## Overview

Comprehensive validation system to catch issues early and provide clear, actionable error messages.

## Pre-Test Validation (`test-browser-e2e.sh`)

### Step 1: Service Health Checks

```bash
✓ Merchant running (port 3002)
✓ Facilitator running (port 3001)
✓ Widget running (port 5173)
```

### Step 2: Balance Validation

**Facilitator Balance Check:**

```bash
✓ Facilitator balance: 185.95 SUI
  - Minimum required: 1 SUI (for gas sponsorship)
  - Recommended: 20+ SUI (for funding test accounts)
```

**Validation Rules:**

- ❌ **Fails** if facilitator has < 1 SUI
- ⚠️ **Warns** if facilitator has < 20 SUI (can't fund many test accounts)
- ✅ **Passes** if facilitator has 20+ SUI

**What Gets Checked:**

1. Facilitator SUI balance (must have funds to sponsor gas & fund buyers)
2. Merchant address (if different from facilitator)
3. Coin object count (multiple coins = better gas selection)

## Runtime Validation

### Widget Validation (`PaymentPage.tsx`)

**Enhanced Error Messages:**

```typescript
// Before (generic):
"Failed to build PTB";

// After (specific):
"Insufficient SUI for gas. This is a known issue - gas sponsorship coming soon!";
"No coins found for your address. Please fund your wallet first.";
"Need to merge coins (not yet implemented). Use an address with a single large coin.";
```

### Facilitator Validation (`build-ptb.ts`)

**1. No Coins Check:**

```typescript
if (!coins.objects || coins.objects.length === 0) {
  return {
    error: "No coins found for buyer",
    hint: "Please fund this address first. For testing, use the /fund endpoint.",
  };
}
```

**2. Insufficient Balance Check:**

```typescript
if (totalBalance < totalRequired) {
  return {
    error: "Insufficient balance",
    required: "110000",
    available: "50000",
    hint: "Need 110000 but only have 50000",
  };
}
```

**3. Gas Coin Warning:**

```typescript
const MIN_GAS_BUDGET = 10000000n; // 0.01 SUI
const hasMultipleCoins = coins.objects.length > 1;
const hasSufficientGas =
  hasMultipleCoins || totalBalance > totalRequired + MIN_GAS_BUDGET;

if (!hasSufficientGas) {
  logger.warn("Potential gas selection issue", {
    message: "Single coin may cause gas selection failure",
  });
}
```

**4. Gas Selection Error (Catch Block):**

```typescript
if (errorMessage.includes("gas selection")) {
  return {
    error: "Gas coin selection failed",
    hint:
      "KNOWN ISSUE: The buyer's coin is locked for payment, leaving no coins for gas. " +
      "Gas sponsorship (facilitator pays gas) is the solution - coming soon! " +
      "See docs/testing/GAS_COIN_ISSUE.md for details.",
  };
}
```

## Validation Flow Diagram

```
┌─────────────────────────────────────────────────────────┐
│  test-browser-e2e.sh (Pre-Test Validation)              │
├─────────────────────────────────────────────────────────┤
│  1. Check services running                              │
│  2. Check facilitator balance (>= 1 SUI)                │
│  3. Warn if low balance (< 20 SUI)                      │
│  4. Display address info                                │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│  Widget: PaymentPage.tsx (Request PTB)                  │
├─────────────────────────────────────────────────────────┤
│  • Sends buyerAddress + invoiceJWT                      │
│  • Catches errors from facilitator                      │
│  • Maps to user-friendly messages                       │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│  Facilitator: build-ptb.ts (Build PTB)                  │
├─────────────────────────────────────────────────────────┤
│  1. ✓ Check buyer has coins                             │
│  2. ✓ Check sufficient balance for payment + fee        │
│  3. ⚠️ Warn if single coin (gas selection risk)         │
│  4. ✓ Check single coin has enough balance              │
│  5. 🔧 Build PTB with moveCall + gas budget             │
│  6. ❌ Catch gas selection errors → helpful hint        │
└─────────────────────────────────────────────────────────┘
```

## Example Error Messages

### User Sees (Widget):

```
❌ Payment Failed

Insufficient SUI for gas. This is a known issue -
gas sponsorship coming soon!
```

### Developer Sees (Facilitator Log):

```
[ERROR] === BUILD PTB REQUEST FAILED ===
Error: Unable to perform gas selection due to insufficient
SUI balance for account 0xe6a2f496... to satisfy required
budget 10000000.

Hint: KNOWN ISSUE - buyer's coin locked for payment,
no coins left for gas. See docs/testing/GAS_COIN_ISSUE.md
```

### Pre-Test Check Output:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Step 2: Checking Balances & Roles
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Addresses:
  Facilitator: 0x4411...5995
  Merchant:    0x4411...5995

✓ Facilitator balance: 185.95 SUI

Balance Summary:
  Total facilitator funds: 185.95 SUI
  Minimum required: 1 SUI (for gas sponsorship)
  Recommended: 20+ SUI (for funding test accounts)

✓ All balance checks passed
```

## Benefits

1. **Early Detection**: Catches issues before browser automation starts
2. **Clear Messages**: Users know exactly what's wrong
3. **Actionable**: Provides specific steps to fix issues
4. **Developer-Friendly**: Logs reference docs for known issues
5. **Production-Ready**: Foundation for real-world error handling

## Testing

Run the enhanced test script:

```bash
cd Pay402
bash scripts/test-browser-e2e.sh
```

The script will:

1. ✓ Check all services are running
2. ✓ Validate facilitator has sufficient balance
3. ⚠️ Warn about potential issues
4. ✅ Proceed only if all checks pass

## Future Enhancements

1. **Gas Sponsorship**: Eliminates the gas coin selection issue
2. **Coin Merging**: Automatically combine small coins
3. **Balance Monitoring**: Track facilitator balance over multiple tests
4. **Network Validation**: Check correct network (localnet/testnet/mainnet)
5. **Smart Contract Validation**: Verify deployed package exists
