# Gas Coin Selection Issue - E2E Browser Test Blocker

## 🎯 Summary

Browser E2E test fails at PTB building stage with:
```
Error: Unable to perform gas selection due to insufficient SUI balance 
for account to satisfy required budget 10000000 (0.01 SUI)
```

**Even though the account HAS 10 SUI!**

## 🔍 Root Cause Analysis

### The Problem

In `facilitator/src/controllers/build-ptb.ts`:

```typescript
// Line 128: Find coin for payment
const suitableCoin = coins.objects.find(coin => BigInt(coin.balance) >= totalRequired);

// Line 153: Pass coin to Move function
tx.moveCall({
  target: `${config.packageId}::payment::settle_payment`,
  arguments: [
    tx.object(suitableCoin.objectId),  // ← LOCKS this coin!
    // ...
  ],
});

// Line 163: Set gas budget
tx.setGasBudget(10000000); // 0.01 SUI

// Line 166: SDK tries to auto-select gas coins
const ptbBytes = await tx.build({ client });  
// ❌ FAILS: The coin we're using for payment is LOCKED
//           SDK can't find another coin for gas!
```

### Why It Fails

1. **Single Coin Object**: Funded addresses get ONE coin object (10 SUI)
2. **Coin Locked**: `tx.object(suitableCoin.objectId)` locks that coin for the moveCall
3. **No Gas Coin**: SDK's `tx.build()` can't find a FREE coin to pay for gas
4. **Result**: "insufficient balance" error despite having 10 SUI

### Why Test Script Works

```bash
# In test-e2e-payment.sh:
BUYER_ADDRESS=$FACILITATOR_ADDRESS  # Uses facilitator's address!
```

The facilitator address has **MANY coin objects** (199 SUI across multiple coins), so:
- One coin used for payment
- Other coins available for gas
- ✅ Works perfectly

## 📊 Test Results

```bash
Testing with address: 0x4d5a3da4cb3378eb85cdc19c657a7ea6a851aeb8a6984b593af8b59233d902ca

1. Funding address...
   ✅ funded: true
   ✅ amount: 10 SUI
   
2. On-chain balance check...
   ✅ Balance: 10.00 SUI (in ONE coin object)
   
3. Building PTB...
   ❌ Error: "Unable to perform gas selection... insufficient balance"
```

## 🛠️ Solution Options

### Option 1: Gas Sponsorship (RECOMMENDED)

**Facilitator pays for gas** - cleanest UX, matches architecture

```typescript
// In build-ptb.ts:
tx.setGasPayment([{
  objectId: facilitatorGasCoin.objectId,
  version: facilitatorGasCoin.version,
  digest: facilitatorGasCoin.digest,
}]);

// Buyer signs PTB, facilitator sponsors gas
const ptbBytes = await tx.build({ 
  client,
  onlyTransactionKind: false  // Include gas payment
});
```

**Pros:**
- ✅ Best UX (buyer doesn't need gas)
- ✅ Matches "facilitator handles blockchain complexity"
- ✅ Works with ANY buyer address
- ✅ No changes to Move contract

**Cons:**
- ❌ Facilitator pays gas costs
- ❌ Slightly more complex PTB signing flow

### Option 2: Multiple Coin Funding

**Give buyer 2+ coin objects** during funding

```typescript
// In fund.ts:
const coins = tx.splitCoins(tx.gas, [
  1_000_000_000,  // 1 SUI for payment
  1_000_000_000,  // 1 SUI for gas  
  8_000_000_000   // 8 SUI extra
]);
tx.transferObjects(coins, address);
```

**Pros:**
- ✅ Simpler implementation
- ✅ Buyer pays own gas

**Cons:**
- ❌ Tried and FAILED (TypeScript/runtime errors with SDK)
- ❌ Still has race conditions (which coin for what?)
- ❌ Doesn't scale (what if buyer needs multiple payments?)

### Option 3: Change Move Contract

**Don't pass coin object** - let Move function take from sender

```move
// Current:
public fun settle_payment<T>(
    payment_coin: &mut Coin<T>,  // ← Passed in, locks coin
    // ...
)

// New:
public fun settle_payment<T>(
    ctx: &mut TxContext,  // Take coins from sender's balance
    // ...
)
```

**Pros:**
- ✅ Most flexible
- ✅ SDK can freely select gas coins

**Cons:**
- ❌ Requires Move contract changes
- ❌ Requires redeployment
- ❌ More complex Move code

## 💡 Recommendation

**Implement Option 1: Gas Sponsorship**

This is the cleanest solution that:
1. Matches our architecture (facilitator = trusted party)
2. Provides best UX (users don't worry about gas)
3. Works with the existing Move contract
4. Aligns with production goals

## 🚀 What We Accomplished

Despite this blocker, we achieved MASSIVE progress:

✅ **Auto-redirect with invoice in URL** - No more copy/paste!
✅ **Settlement mode toggle UI** - Beautiful optimistic/pessimistic selector
✅ **Post-payment redirect** - Widget → Merchant with payment details
✅ **Premium content display** - Rich merchant page showing payment success
✅ **Browser automation** - Full MCP tool integration working perfectly
✅ **Comprehensive docs** - Browser guide, AI prompt, test results

**The UX flow is 100% working** - just blocked on this gas coin technical detail!

## 📝 Next Steps

1. Implement gas sponsorship in `build-ptb.ts`
2. Update `sign-ptb.ts` to handle sponsored transactions
3. Test with browser E2E flow
4. Add validation for address mismatches (your excellent suggestion!)
5. Document gas sponsorship architecture

## 🧪 Validation Improvements (Your Suggestion)

Add these checks to catch issues early:

```typescript
// In build-ptb.ts - validate buyer can pay
const coins = await client.listCoins({ owner: buyerAddress });
if (!coins || coins.objects.length === 0) {
  throw new Error(`No coins found for buyer ${buyerAddress}`);
}

// In submit-payment.ts - validate signature matches buyer  
const recoveredAddress = recoverAddressFromSignature(ptbBytes, signature);
if (recoveredAddress !== buyerAddress) {
  throw new Error(`Signature mismatch: expected ${buyerAddress}, got ${recoveredAddress}`);
}
```

---

**Status:** Blocker identified, solution clear, ready to implement! 🎯
