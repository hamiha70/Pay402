# Split Coin Fix - Test Results

## Summary

**Split coin fix DOES NOT solve the gas selection issue.**

## What We Tested

### Implementation:
```typescript
// Instead of passing entire coin:
tx.object(suitableCoin.objectId)  // OLD

// Split off only payment amount:
const [paymentCoin] = tx.splitCoins(
  tx.object(suitableCoin.objectId),
  [totalRequired]  // 0.00011 SUI
);
tx.moveCall({ arguments: [paymentCoin, ...] })  // NEW
```

### Test Setup:
- Address: 0x44118d... (facilitator)
- Balance: 185.96 SUI
- Single coin object with all SUI
- Payment required: 0.00011 SUI
- Gas required: 0.01 SUI

### Result:
```
❌ Build PTB failed
Error: Unable to perform gas selection due to insufficient 
       SUI balance... to satisfy required budget 10000000
```

## Why It Still Fails

**SUI SDK locks ANY coin referenced in the PTB:**

```typescript
tx.object(coinId)              // ← Locks coin
tx.splitCoins(tx.object(coinId), [...])  // ← ALSO locks coin!
```

When `tx.build({ client })` runs:
1. SDK scans PTB for coin references
2. Finds: `tx.object(0x4dec...)`  (used in splitCoins)
3. Marks coin as "in-use"
4. Tries to find OTHER coins for gas
5. ❌ No other coins available!
6. Error: "insufficient balance"

**The split doesn't help** because the SDK locks the coin as soon as it's referenced, regardless of whether we're using all of it or just splitting off a piece.

## Conclusion

**Gas sponsorship is the ONLY solution on SUI.**

The buyer's payment coin (USDC in production) will ALWAYS be locked when used in the PTB. The ONLY way to pay for gas is:
1. Have a SEPARATE SUI coin for gas (not the payment coin)
2. OR use gas sponsorship (different address pays gas)

Since buyers will use USDC for payments, they won't have SUI. Therefore:

**Gas sponsorship is REQUIRED, not optional.**

##Next Steps

1. Research correct SUI SDK API for gas sponsorship
2. Implement gas sponsorship properly
3. Update submit-payment to handle sponsored transactions
4. Test with new buyer addresses (will work because they don't need SUI!)
