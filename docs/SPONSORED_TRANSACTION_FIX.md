# Sponsored Transaction Fix - Critical Discovery

**Date**: 2026-02-04  
**Status**: ✅ RESOLVED

## Problem

E2E tests were failing with "Invalid user signature: Required Signature from 0x7a... is absent" even though:
- The sponsored transaction pattern was implemented correctly
- Both buyer and facilitator were signing the same `TransactionData`
- The signature format was correct

## Root Cause

**The E2E tests were using the SAME keypair for both buyer and facilitator.**

```typescript
// WRONG (before fix)
const privateKey = process.env.FACILITATOR_PRIVATE_KEY;
buyerKeypair = Ed25519Keypair.fromSecretKey(privateKey); // Same as facilitator!
```

When both parties have the same address, Sui's dual-signature validation logic fails because:
1. Sponsored transactions require TWO distinct addresses (sender ≠ gas owner)
2. The signature validation expects signatures from DIFFERENT public keys
3. Having the same address for both roles violates the sponsored transaction model

## Solution

Generate a unique buyer keypair that is DIFFERENT from the facilitator:

```typescript
// CORRECT (after fix)
buyerKeypair = new Ed25519Keypair(); // Generate unique buyer
buyerAddress = buyerKeypair.getPublicKey().toSuiAddress();
// Facilitator uses its own keypair from config
```

## Verification

Created `minimal-sponsored.test.ts` to isolate and verify the basic sponsored transaction pattern:
- ✅ Simple SUI transfer with gas sponsorship
- ✅ Buyer and facilitator are DIFFERENT addresses
- ✅ Both sign the SAME transaction bytes
- ✅ Signature order doesn't matter

**Result**: All tests pass when buyer ≠ facilitator.

## Test Results

### Before Fix
- ❌ Optimistic mode: "Invalid user signature" (but returned digest anyway - false positive)
- ❌ Pessimistic mode: "Invalid user signature" 
- ❌ Latency comparison: False positives (didn't check response.ok)

### After Fix
- ✅ Build PTB tests (3/3 passed)
- ✅ Optimistic mode (61ms client latency)
- ✅ Pessimistic mode (1126ms client latency)
- ✅ Latency comparison (562ms difference)
- ✅ Minimal sponsored test (4/4 passed)

## Performance Metrics

| Mode | Client Latency | Settlement | Facilitator Risk |
|------|---------------|------------|------------------|
| Optimistic | 46-61ms | Background (~1s) | Yes (front-running) |
| Pessimistic | 608-1126ms | Blocking | No (confirmed on-chain) |

## Key Learnings

1. **Sponsored transactions REQUIRE distinct addresses** for sender and gas owner
2. **Always test with realistic scenarios** - using the same keypair for both roles masked the issue
3. **Minimal test cases are valuable** - isolating the sponsored transaction pattern helped identify the root cause
4. **False positives are dangerous** - optimistic mode was returning success even when the background transaction failed

## Implementation Details

### Correct Sponsored Transaction Pattern

```typescript
// 1. Facilitator builds COMPLETE transaction with gas sponsorship
const tx = new Transaction();
tx.setSender(buyerAddress);           // Buyer is sender
tx.setGasOwner(facilitatorAddress);   // Facilitator sponsors gas
tx.setGasPayment([gasCoins[0]]);
tx.setGasBudget(10000000);

// 2. Build full transaction bytes
const txBytes = await tx.build({ client });

// 3. Buyer signs
const buyerSig = await buyerKeypair.signTransaction(txBytes);

// 4. Facilitator signs THE SAME bytes
const facilitatorSig = await facilitatorKeypair.signTransaction(txBytes);

// 5. Submit with both signatures
await client.executeTransaction({
  transaction: txBytes,
  signatures: [buyerSig.signature, facilitatorSig.signature],
});
```

### Critical Requirements

- ✅ Buyer and facilitator MUST have different addresses
- ✅ Both MUST sign the SAME `TransactionData` (including `GasData`)
- ✅ Signatures are in `flag || signature || pubkey` format (handled by SDK)
- ✅ Signature order doesn't matter (Sui validates both)

## Related Files

- `facilitator/src/__tests__/e2e-payment.test.ts` - Fixed to use unique buyer
- `facilitator/src/__tests__/minimal-sponsored.test.ts` - New minimal test
- `facilitator/src/controllers/build-ptb.ts` - Correct implementation
- `facilitator/src/controllers/submit-payment.ts` - Correct implementation

## Status

✅ **RESOLVED** - All E2E tests passing with correct sponsored transaction pattern.
