# Complete Address & SUI Flow Analysis

## Executive Summary

**Your reasoning was 100% correct** - all addresses are properly assigned and funded. The issue is **NOT** missing SUI or address confusion.

The issue is **coin object structure**: The buyer's single 10 SUI coin gets locked for payment, leaving no coins available for gas.

---

## The Three Roles

### 1. Merchant

```
Address: 0xbf8c50a85dbb19deaec5a9712869a03959c81ec1eba43223deae594afa5a8248
Source:  merchant/.env (MERCHANT_PRIVATE_KEY)
Role:    Payment recipient
SUI:     ✗ NOT NEEDED (only receives, doesn't sign)
Status:  ✓ WORKING PERFECTLY
```

### 2. Facilitator

```
Address: 0x44118d0b343e8cb4203bdd4d75321a2eec4a9ec3c4778dcdda715fee18945995
Source:  facilitator/.env (FACILITATOR_PRIVATE_KEY)
Role:    Trusted intermediary, funds buyers, will sponsor gas
SUI:     ✓ 185.96 SUI (PLENTY!)
Coins:   ✓ MULTIPLE coin objects (good for gas selection)
Status:  ✓ WORKING PERFECTLY
```

### 3. Buyer (THE CRITICAL ONE)

```
Address: 0xe6a2f496... (RANDOM, generated per session)
Source:  Widget localStorage (Ed25519Keypair.generate())
Role:    Signs PTB, pays for content
SUI:     ✓ 10 SUI (funded via /fund endpoint)
Coins:   ✗ ONE coin object (locks for payment, can't use for gas!)
Status:  ❌ GAS SELECTION FAILS
```

---

## Actual Flow (Step-by-Step)

### Browser E2E Test Flow:

```
┌─────────────────────────────────────────────────────────────┐
│ 1. User visits merchant (localhost:3002)                    │
├─────────────────────────────────────────────────────────────┤
│ • Clicks "Get Premium Data"                                 │
│ • Merchant creates invoice JWT                              │
│ • Invoice contains:                                         │
│   - merchantRecipient: 0xbf8c50a... (static)               │
│   - facilitatorRecipient: 0x4411... (static)               │
│   - amount: 100000 (0.0001 SUI)                            │
│   - facilitatorFee: 10000 (0.00001 SUI)                    │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. Redirect to widget (localhost:5173?invoice=...)         │
├─────────────────────────────────────────────────────────────┤
│ • Invoice auto-loaded from URL ✓                           │
│ • Shows sign-in page                                        │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. User clicks "Sign In with Demo Keypair"                 │
├─────────────────────────────────────────────────────────────┤
│ • Ed25519Keypair.generate() ← NEW RANDOM KEYPAIR!          │
│ • Derives address: 0xe6a2f496...                           │
│ • Stores in localStorage                                    │
│ • console.log('🔑 Generated new keypair: 0xe6a2f496...')   │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│ 4. Widget shows "Review Payment"                           │
├─────────────────────────────────────────────────────────────┤
│ • useBalance checks buyer's balance                         │
│ • Result: 0 SUI (new address has no coins!)                │
│ • Shows warning: "⚠️ Insufficient balance"                  │
│ • Shows button: "Get Test SUI"                             │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│ 5. User clicks "Get Test SUI"                              │
├─────────────────────────────────────────────────────────────┤
│ • fundWallet() called                                       │
│ • POST /fund                                                │
│   {                                                         │
│     "address": "0xe6a2f496...",                            │
│     "sessionId": "session_1770133..."                      │
│   }                                                         │
│                                                             │
│ • Facilitator:                                             │
│   - tx.splitCoins(tx.gas, [10_000_000_000]) ← 10 SUI      │
│   - tx.transferObjects([coin], buyer)                      │
│   - signAndExecuteTransaction()                            │
│                                                             │
│ • Result: Buyer gets ONE coin with 10 SUI ✓                │
│   Coin ID: 0x962ab5fd...                                   │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│ 6. Balance updates → "Continue to Payment" enabled         │
├─────────────────────────────────────────────────────────────┤
│ • Widget shows: "SUI: 10 SUI" ✓                            │
│ • Button becomes clickable                                  │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│ 7. User clicks "Continue to Payment"                       │
├─────────────────────────────────────────────────────────────┤
│ • requestPTB() called                                       │
│ • POST /build-ptb                                           │
│   {                                                         │
│     "buyerAddress": "0xe6a2f496...",                       │
│     "invoiceJWT": "eyJ..."                                 │
│   }                                                         │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│ 8. Facilitator builds PTB                                  │
├─────────────────────────────────────────────────────────────┤
│ • listCoins(buyer) → finds ONE coin (10 SUI) ✓             │
│ • totalBalance: 10 SUI ✓                                    │
│ • totalRequired: 0.00011 SUI ✓                             │
│ • suitableCoin: 0x962ab5fd... ✓                            │
│                                                             │
│ • tx.setSender(buyer) ✓                                     │
│ • tx.moveCall({                                            │
│     target: "settle_payment",                              │
│     arguments: [                                           │
│       tx.object(0x962ab5fd...) ← LOCKS THIS COIN!          │
│       ...                                                   │
│     ]                                                       │
│   })                                                        │
│ • tx.setGasBudget(10000000) ← needs 0.01 SUI              │
│ • tx.build({ client }) ← SDK tries to auto-select gas      │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│ 9. SUI SDK Gas Selection                                   │
├─────────────────────────────────────────────────────────────┤
│ • Searches for available gas coins for buyer               │
│ • Finds: [0x962ab5fd... (10 SUI)]                         │
│ • Checks: Is this coin already used?                       │
│ • Result: YES! Used in tx.object() for payment             │
│ • Searches for OTHER coins                                  │
│ • Finds: [] (no other coins!)                              │
│                                                             │
│ ❌ Error: "Unable to perform gas selection due to          │
│            insufficient SUI balance for account            │
│            0xe6a2f496... to satisfy required budget        │
│            10000000"                                        │
└─────────────────────────────────────────────────────────────┘
```

---

## Why Test Script Works vs Browser Fails

### Test Script (`test-e2e-payment.sh`):

```bash
BUYER_ADDRESS=$FACILITATOR_ADDRESS  # Uses facilitator's address!
```

**Facilitator's coin situation:**

```
Address: 0x44118d0b343e8cb4203bdd4d75321a2eec4a9ec3c4778dcdda715fee18945995
Coins:
  - 0x4dec4082... (185.96 SUI) ← Used for payment
  - Plus many other small coins from past transactions

When building PTB:
  • Payment locks ONE coin
  • SDK finds OTHER coins for gas
  • ✓ Works perfectly!
```

### Browser Test (NEW buyer):

```javascript
Ed25519Keypair.generate() → 0xe6a2f496...
```

**New buyer's coin situation:**

```
Address: 0xe6a2f496cd51c61cc20067f5ab59e49e068cb266996d0c59b5201449b6d1983b
Coins:
  - 0x962ab5fd... (10 SUI) ← ONLY coin!

When building PTB:
  • Payment locks THE ONLY coin
  • SDK finds NO OTHER coins for gas
  • ❌ Fails with "insufficient balance"!
```

---

## Solution Comparison

### Option A: Fixed Demo Buyer (Quick Fix for Demo)

**Implementation:**

1. Generate ONE buyer keypair upfront
2. Fund with 50+ SUI across MULTIPLE coin objects
3. Store in widget localStorage permanently
4. Use for ALL demo runs

**Pros:**

- ✓ Quick to implement
- ✓ Works with current architecture
- ✓ Good for demo/hackathon

**Cons:**

- ✗ Not realistic (fixed buyer)
- ✗ Doesn't scale to production
- ✗ Still needs multiple coins

**Code Changes:**

```typescript
// In widget/src/hooks/useKeypairAuth.ts
const DEMO_KEYPAIR_SEED = process.env.VITE_DEMO_BUYER_KEY;

// Load fixed keypair instead of generating new one
const keypair = Ed25519Keypair.fromSecretKey(DEMO_KEYPAIR_SEED);
```

### Option B: Gas Sponsorship (RECOMMENDED for Production)

**Implementation:**

1. Facilitator pays ALL gas
2. Buyer just signs PTB
3. Works with ANY buyer address
4. No need for buyer to have separate gas coins

**Pros:**

- ✓ Best UX (buyers don't need gas knowledge)
- ✓ Works with any buyer address
- ✓ Matches production architecture
- ✓ Enables zkLogin/Enoki easily

**Cons:**

- ✗ More complex implementation
- ✗ Facilitator pays gas costs

**Code Changes:**

```typescript
// In build-ptb.ts
const facilitatorGasCoins = await client.listCoins({
  owner: facilitatorAddress,
  coinType: "0x2::sui::SUI",
});

tx.setGasPayment([
  {
    objectId: facilitatorGasCoins[0].objectId,
    version: facilitatorGasCoins[0].version,
    digest: facilitatorGasCoins[0].digest,
  },
]);

// Set gas owner to facilitator
tx.setGasOwner(facilitatorAddress);
```

### Option C: Multiple Coin Funding (Partial Fix)

**Implementation:**
When /fund is called, create 3+ separate coin objects

**Pros:**

- ✓ Works with dynamic buyers
- ✓ Minimal code changes

**Cons:**

- ✗ Wasteful (multiple small coins)
- ✗ Doesn't scale well
- ✗ Still has edge cases

---

## Key Insights

1. **All addresses are correctly assigned** ✓
2. **All addresses are properly funded** ✓
3. **The issue is coin object structure** ✗

The problem is NOT:

- ❌ Missing addresses
- ❌ Address confusion
- ❌ Lack of SUI balance
- ❌ Funding not working

The problem IS:

- ✅ Single coin object gets locked for payment
- ✅ SDK can't find free coins for gas
- ✅ This is a SUI SDK limitation/design

---

## Recommended Path Forward

**For Hackathon Demo (This Weekend):**

- Implement Option A: Fixed buyer with pre-funding
- Quick, works reliably for demos
- Can show full flow end-to-end

**For Production (After Hackathon):**

- Implement Option B: Gas sponsorship
- Better UX, more scalable
- Enables zkLogin/Enoki integration
- Aligns with "facilitator handles complexity" architecture

**Your intuition was spot-on** - it's not about missing SUI, it's about understanding SUI's coin object model and working with it properly! 🎯
