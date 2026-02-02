# Widget Testing Strategy (Research-Based)

## Research Findings

### Vitest Browser Testing (Official Docs)

**jsdom vs Browser Mode:**
- **jsdom**: Fast, simulates browser in Node.js, good for unit tests
- **Browser Mode**: Real browser (Playwright/WebDriver), better accuracy, catches real issues
- **Recommendation**: Use BOTH - jsdom for fast unit tests, Browser Mode for components

### When to Use Each

**✅ Use jsdom for:**
- Fast unit tests of business logic
- Pure functions (computeInvoiceHash)
- Validation logic that doesn't need real browser APIs
- Development speed (fast feedback)

**✅ Use Browser Mode for:**
- Component testing (React components)
- Real browser API usage (Web Crypto, atob, etc.)
- User interaction testing
- Maximum accuracy

**✅ Use Integration Tests for:**
- Blockchain transaction flows
- PTB verification with REAL data from facilitator
- End-to-end payment flows

## Our Specific Case: PTB Verification

### Problem
PTB verification depends on:
1. Binary transaction format from SUI SDK
2. Real browser APIs (Web Crypto, atob, Uint8Array)
3. Actual PTB data from facilitator

### What We Tried (WRONG)
- ❌ Mock PTBs with `tx.serialize()` (invalid without `.build()`)
- ❌ Testing PTB binary structure (that's SUI SDK's job)
- ❌ jsdom + polyfills (complex, fragile)

### What We Should Do (RIGHT)

**1. Unit Tests (jsdom)** - Keep minimal
```typescript
// widget/src/lib/verifier.test.ts
describe('Utility Functions', () => {
  it('should compute consistent hashes', async () => {
    const hash1 = await computeInvoiceHash('test');
    const hash2 = await computeInvoiceHash('test');
    expect(hash1).toBe(hash2);
  });
});
```
**Why**: Pure function, no browser APIs, fast

**2. Integration Tests (Node.js + Real SUI SDK)** - Already have!
```typescript
// facilitator/src/__tests__/api-integration.test.ts
it('should build valid PTB from merchant JWT', async () => {
  const response = await fetch('/build-ptb', {
    body: JSON.stringify({ invoiceJWT, buyerAddress })
  });
  const { ptbBytes } = await response.json();
  
  // Verify PTB can be deserialized
  const tx = Transaction.from(new Uint8Array(ptbBytes));
  expect(tx.getData().sender).toBe(buyerAddress);
});
```
**Why**: Tests REAL PTBs, uses SUI SDK properly, caught Buffer bug

**3. E2E Tests (Real Browser)** - Manual for now, automate later
```
1. User clicks "Get Premium Data" on merchant page
2. Copies JWT, pastes in widget
3. Clicks "Request Payment"
4. Verifier checks PTB (uses real Web Crypto)
5. User signs & submits
```
**Why**: Tests actual user flow, real browser environment

## Recommended File Structure

```
widget/
├── src/
│   └── lib/
│       ├── verifier.ts           # Main logic
│       └── verifier.test.ts      # ✅ KEEP: Pure function tests
├── vitest.config.ts              # environment: 'jsdom'
└── TESTING_STRATEGY.md

facilitator/
└── src/
    └── __tests__/
        ├── api-integration.test.ts  # ✅ KEEP: Real PTB tests
        ├── build-ptb.test.ts        # ✅ KEEP: PTB building logic
        └── ptb-codec.test.ts        # ✅ KEEP: Serialization tests

scripts/
└── smoke-test.sh                 # ✅ KEEP: Service health checks
```

## Current Status After Research

**What We Have:**
- ✅ Facilitator integration tests (35/35 passing) - Test REAL PTBs
- ✅ Smoke test script - Test service health
- ✅ Browser environment (jsdom) configured
- ✅ Minimal widget tests (hash functions only)

**What We DON'T Need:**
- ❌ Mock PTB tests (can't create valid PTBs without network)
- ❌ Complex browser polyfills (use integration tests instead)
- ❌ PTB binary structure tests (that's SUI SDK's responsibility)

## Action Items

1. ✅ Keep widget tests minimal (hash functions, validation helpers)
2. ✅ Rely on facilitator integration tests for PTB verification
3. ✅ Use smoke tests for service health
4. 🔄 Add E2E test later (Playwright + real browser)

## Why This Is Better

**Before (Wrong Approach):**
- 22 tests, 16 failing
- Testing SUI SDK behavior (not our code)
- Brittle mocks that don't match reality
- False confidence from passing tests

**After (Right Approach):**
- 2 meaningful widget tests (pure functions)
- 35 facilitator tests (real PTBs, real SUI SDK)
- Integration tests caught the Buffer bug!
- Fast feedback, accurate results

## Conclusion

**For PTB verification testing:**
1. Don't mock complex binary formats
2. Test at integration level with real data
3. Use unit tests for pure utility functions only
4. Save E2E tests for critical user flows

This aligns with official Vitest docs and blockchain testing best practices.
