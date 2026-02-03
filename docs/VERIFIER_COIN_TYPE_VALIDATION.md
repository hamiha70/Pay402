# PTB Verifier: Coin Type Validation

## Summary

**✅ IMPLEMENTED**: The PTB verifier now validates that the coin type in the PTB matches the coin type specified in the merchant's invoice.

## Security Issue Addressed

**Attack Vector**: Malicious facilitator substitutes cheaper token

A malicious facilitator could:
1. Receive invoice: "Pay 100 USDC" ($100)
2. Build PTB with: "Pay 100 SUI" (might be worth only $10)
3. Buyer signs without checking coin type
4. Transaction succeeds but buyer paid wrong (cheaper) token

## Implementation

### Location
`/widget/src/lib/verifier.ts` - `verifyPaymentPTB()` function

### Code
```typescript
// Verify coin type matches invoice (check MoveCall typeArguments)
const moveCalls = commands.filter((cmd: any) => cmd.$kind === 'MoveCall');
if (moveCalls.length > 0) {
  // Check if any MoveCall has typeArguments (should be settle_payment)
  for (const call of moveCalls) {
    const typeArgs = call.MoveCall?.typeArguments || [];
    if (typeArgs.length > 0) {
      // First type argument should match invoice coin type
      const ptbCoinType = typeArgs[0];
      if (ptbCoinType !== invoice.coinType) {
        return {
          pass: false,
          reason: 'Coin type mismatch - PTB uses different token than invoice',
          details: {
            expectedAmount: invoice.coinType,
            foundAmount: ptbCoinType,
          },
        };
      }
    }
  }
}
```

### How It Works

1. **Extract MoveCall commands** from PTB
2. **Check typeArguments** for each MoveCall (the `<T>` in `settle_payment<T>`)
3. **Compare with invoice** - PTB coin type must exactly match invoice coin type
4. **Reject if mismatch** - Buyer sees clear error message

## Test Coverage

### Test File
`/widget/src/lib/verifier.security.test.ts`

### Test Cases

✅ **Valid Cases**:
- Accept PTB with correct USDC coin type
- Accept PTB with correct SUI coin type  
- Accept PTB with zero facilitator fee

❌ **Attack Cases** (REJECTED):
- PTB with USDC invoice but SUI typeArgument
- PTB with SUI invoice but USDC typeArgument
- Expired invoice
- Empty PTB

## Example Failure

```typescript
Invoice: {
  coinType: '0xabc::usdc::USDC',  // Merchant expects USDC
  amount: '100000000',  // 100 USDC
  // ...
}

PTB typeArguments: ['0x2::sui::SUI']  // ❌ Facilitator used SUI!

Verifier Result: {
  pass: false,
  reason: 'Coin type mismatch - PTB uses different token than invoice',
  details: {
    expectedAmount: '0xabc::usdc::USDC',
    foundAmount: '0x2::sui::SUI'
  }
}
```

## Integration Points

### Widget Flow
1. User clicks "Pay with 402"
2. Widget fetches invoice JWT from merchant
3. Widget calls facilitator `/build-ptb`
4. **Verifier checks coin type** ← THIS CHECK
5. If pass: Show "Sign Transaction" button
6. If fail: Show error, don't allow signing

### User Experience
- **Attack prevented**: User never sees malicious PTB
- **Clear error**: "Payment uses wrong token type"
- **No fund loss**: Transaction never submitted

## Future Enhancements

### Additional Validations Needed
1. ✅ **Coin type** - DONE
2. ⚠️ **MoveCall arguments** - Partially done (amounts checked via splits)
3. ⚠️ **Package ID** - Should verify `packageId::payment::settle_payment`
4. ⚠️ **Function name** - Should verify calling `settle_payment` specifically

### Known Limitations
- Verifier currently checks `TransferObjects` commands, but `settle_payment` does transfers internally
- Need to update verifier to parse MoveCall arguments directly for amount/merchant validation
- Current approach validates via `SplitCoins` amounts as proxy

## Testing Instructions

```bash
# Run verifier security tests
cd widget
npm test verifier.security.test.ts

# Key test: Coin type mismatch
# Expected: PASS (verifier rejects wrong coin type)
```

## Related Documentation
- `/docs/security/PTB_VERIFIER_SECURITY.md` - Overall verifier security
- `/docs/reference/VERIFIER_EXPLAINER.md` - How verifier works
- `/move/payment/sources/payment.move` - Generic `Coin<T>` implementation
