# CRITICAL: Token Usage Policy

**Date:** January 31, 2026  
**Status:** Enforced in code and documentation

---

## Policy

### ⚠️ SUI Token = GAS ONLY

- **Never use SUI as payment token on testnet**
- SUI is reserved exclusively for gas sponsorship
- **Very limited SUI supply** on testnet (must preserve for facilitator operations)
- Difficult to obtain (faucet has strict rate limits)

### ✅ USDC Token = PAYMENTS ONLY

- **USDC is the DEFAULT payment token**
- All payment flows use USDC
- Buyers get USDC from Circle faucet: https://faucet.circle.com/
- **⚠️ Currently limited supply (~20 USDC available)**
- Easier to get than SUI, but still be conservative

### 💡 Testing Strategy

**Use small amounts for testing:**
- Test payments: 0.01-0.10 USDC (10,000-100,000 micro-USDC)
- Facilitator fee: 0.01 USDC (10,000 micro-USDC) - fixed
- Total per test: ~0.02-0.11 USDC

**Example calculation:**
- 20 USDC supply ÷ 0.11 USDC per test = ~180 tests possible
- Be conservative: aim for <50 tests to preserve supply

---

## Implementation

### Code Changes

1. **`facilitator/src/config.ts`**
   ```typescript
   // Added DEFAULT_PAYMENT_COIN_TYPE constant
   export const DEFAULT_PAYMENT_COIN_TYPE = COIN_TYPES.USDC;
   ```

2. **`facilitator/src/controllers/balance.ts`**
   ```typescript
   // Changed default from SUI to USDC
   const requestedCoinType = coinType || DEFAULT_PAYMENT_COIN_TYPE;
   ```

3. **`.cursorrules`**
   ```
   ### Token Usage (CRITICAL)
   - SUI is ONLY for gas
   - USDC is for payments
   - Reason: Limited SUI supply on testnet
   ```

### Documentation Updates

- ✅ README.md - All examples use USDC
- ✅ SETUP.md - All test commands use USDC
- ✅ Added warnings about SUI usage
- ✅ References to Circle USDC faucet

---

## Testnet Addresses

### Facilitator
- Needs: **SUI tokens** (for gas sponsorship)
- Source: SUI testnet faucet
- Amount: 5-10 SUI recommended

### Buyer
- Needs: **USDC tokens** (for payments)
- Source: Circle USDC faucet
- Amount: Start with small amounts for testing (1-5 USDC)
- **⚠️ Current supply: ~20 USDC** - be conservative!
- Use 0.01-0.10 USDC per test to preserve supply

### Merchant
- Receives: **USDC tokens** (from payments)
- No setup needed (receives automatically)

---

## Coin Types (Testnet)

```typescript
// ⚠️ GAS ONLY - Never for payments!
SUI: "0x2::sui::SUI"

// ✅ DEFAULT for payments
USDC: "0xa1ec7fc00a6f40db9693ad1415d0c193ad3906494428cf252621037bd7117e29::usdc::USDC"
```

---

## Why This Matters

### Problem: Limited Tokens on Testnet

**SUI (Very Limited):**
1. Facilitator needs SUI for gas sponsorship
2. Each transaction costs ~0.001-0.003 SUI
3. Testnet faucet has strict rate limits
4. Running out of SUI = no gas = no transactions
5. **Hardest to obtain**

**USDC (Limited but Accessible):**
1. Current supply: ~20 USDC available
2. Circle faucet is more generous than SUI faucet
3. Still need to be conservative with testing
4. Use small amounts: 0.01-0.10 USDC per test

### Solution: Use USDC for Payments + Small Test Amounts

1. USDC has no gas implications (preserves SUI)
2. Simulates real-world usage (stablecoins for payments)
3. Use minimal amounts for testing (0.01-0.10 USDC)
4. Preserves both token supplies for extended testing

---

## Testing Checklist

When testing, verify:

- [ ] Facilitator has SUI for gas (5+ SUI recommended)
- [ ] Buyer has USDC for payments (get from Circle faucet)
- [ ] All API calls use USDC coin type
- [ ] No examples or tests use SUI as payment token
- [ ] Documentation reflects USDC-first approach

---

## Git Commit

```
commit 2e582ee
fix(facilitator): enforce USDC as default payment token, SUI for gas only

CRITICAL CHANGE:
- Update .cursorrules to enforce token usage policy
- SUI is ONLY for gas sponsorship (limited testnet supply)
- USDC is DEFAULT for all payment transactions
- Update config.ts with DEFAULT_PAYMENT_COIN_TYPE constant
- Update balance controller to default to USDC instead of SUI
- Update all documentation with warnings
- All examples now use USDC coin type
```

---

**This policy is now enforced in:**
- ✅ Code (default values)
- ✅ Documentation (all examples)
- ✅ .cursorrules (AI guidance)
- ✅ Git history (committed)
