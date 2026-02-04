# MockUSDC - Localnet USDC for Testing

MockUSDC is a simplified USDC implementation for localnet testing that behaves identically to real USDC for Pay402 payment flows.

## Deployment Info

- **Package ID**: `0x34f1b450e7815b8b95df68cb6bfd81bbaf42607acf1f345bcb4a2fc732ca648b`
- **Treasury Cap**: `0x21aa4203c1f95e3e0584624b274f3e5c630578efaba76bb47d53d5d7421fde11`
- **Coin Type**: `0x34f1b450e7815b8b95df68cb6bfd81bbaf42607acf1f345bcb4a2fc732ca648b::mock_usdc::MOCK_USDC`

## Features

- ✅ 6 decimals (same as real USDC)
- ✅ Public mint function (for faucet/testing)
- ✅ No regulated features (no deny list, no pause)
- ✅ Identical behavior to real USDC for payment testing

## Usage

### Mint MockUSDC

```bash
# Using the helper script (recommended)
./scripts/mint-mock-usdc.sh $(sui client active-address) 1000

# Or directly with sui client
sui client call \
  --package 0x34f1b450e7815b8b95df68cb6bfd81bbaf42607acf1f345bcb4a2fc732ca648b \
  --module mock_usdc \
  --function mint \
  --args 0x21aa4203c1f95e3e0584624b274f3e5c630578efaba76bb47d53d5d7421fde11 \
         1000000000 \
         <recipient_address> \
  --gas-budget 10000000
```

### Check Balance

```bash
sui client balance --owner <address> | grep MOCK_USDC
```

## IMPORTANT: Who Needs MockUSDC?

### ✅ Mint to:
- **Buyer addresses** (for making payments)
- **Merchant addresses** (for testing receipt)
- **Test wallets** (for E2E tests)

### ❌ DO NOT mint to:
- **Facilitator address** - Facilitator NEVER needs USDC upfront
  - Facilitator only receives fees FROM payments
  - Facilitator only needs SUI for gas sponsorship

## Why MockUSDC?

1. **Makes localnet identical to testnet** - Both use USDC for payments
2. **Prevents testnet SUI drainage** - SUI is only for gas, not payments
3. **Validates coin-type logic early** - Catch bugs before testnet
4. **More realistic testing** - Mimics production USDC behavior

## Architecture

```
Payment Flow:
  Buyer (has MockUSDC) 
    → Pay 10.50 USDC 
    → Merchant receives 10.00 USDC
    → Facilitator receives 0.50 USDC (fee)
    → Facilitator pays gas in SUI (sponsored transaction)

Facilitator Balance:
  USDC: 0 → 0.50 → 1.00 → 1.50 (accumulates from fees)
  SUI:  For gas only (decreases with each transaction)
```

## Testing

See `facilitator/src/__tests__/e2e-payment.test.ts` for examples of:
- Minting MockUSDC to test addresses
- Verifying balance changes before/after payments
- Checking facilitator fee accumulation
