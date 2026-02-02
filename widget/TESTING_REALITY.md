# Widget Testing Reality Check

## The Core Problem Discovered

### What tx.serialize() Actually Returns
```typescript
const tx = new Transaction();
tx.splitCoins(tx.gas, [100]);
const output = tx.serialize();

// Returns: JSON string like:
// {"version":1,"expiration":{"Epoch":0},"inputs":[...],"transactions":[...]}
// NOT base64-encoded bytes!
```

### What the Facilitator Actually Uses
```typescript
// facilitator/src/controllers/build-ptb.ts:160
const ptbBytes = await tx.build({ client });  // Returns Uint8Array
```

**KEY INSIGHT:** `.build()` needs a SUI client connection to:
1. Resolve gas coin references
2. Fetch object states
3. Compute proper transaction digest
4. Generate valid BCS-encoded bytes

### Why Mock PTB Tests Are Impossible

**Cannot create valid PTBs without SUI network:**
```typescript
// ❌ This DOESN'T work:
const tx = new Transaction();
tx.splitCoins(tx.gas, [100]);
const bytes = tx.serialize();  // Returns JSON, not bytes!

// ❌ This REQUIRES network:
const bytes = await tx.build({ client });  // Needs live SUI node!

// ❌ Can't test verifier without valid bytes:
verifyPaymentPTB(bytes, invoice, jwt);  // Needs BCS-encoded PTB!
```

## What We CAN Test in Widget

### 1. Pure Utility Functions ✅
```typescript
describe('computeInvoiceHash', () => {
  it('should compute consistent SHA-256 hash', async () => {
    const hash1 = await computeInvoiceHash('test');
    const hash2 = await computeInvoiceHash('test');
    expect(hash1).toBe(hash2);
  });
});
```
**Why this works:** No PTBs needed, just Web Crypto API

### 2. Input Validation ✅
```typescript
describe('Invoice validation', () => {
  it('should reject expired invoices', () => {
    const expired = { expiry: Date.now() / 1000 - 3600 };
    expect(isExpired(expired)).toBe(true);
  });
});
```
**Why this works:** Tests logic, not PTB parsing

### 3. Helper Functions ✅
```typescript
describe('base64ToBytes', () => {
  it('should decode base64 correctly', () => {
    const bytes = base64ToBytes('aGVsbG8=');
    expect(new TextDecoder().decode(bytes)).toBe('hello');
  });
});
```
**Why this works:** Tests browser API usage

## What We CANNOT Test in Widget

### ❌ PTB Verification Logic
```typescript
// This needs REAL PTBs from facilitator!
verifyPaymentPTB(ptbBytes, invoice, jwt)
```

**Why:** 
- PTBs are complex binary BCS-encoded structures
- Only SUI SDK (with network) can create valid PTBs
- Mock PTBs will always be invalid

## Where PTB Verification IS Tested

### ✅ Facilitator Integration Tests
```typescript
// facilitator/src/__tests__/api-integration.test.ts
it('should build valid PTB', async () => {
  const response = await fetch('/build-ptb', { /* ... */ });
  const { ptbBytes } = await response.json();
  
  // This PTB is REAL (built with .build({ client }))
  const tx = Transaction.from(new Uint8Array(ptbBytes));
  expect(tx.getData().sender).toBe(buyerAddress);
});
```

### ✅ E2E Tests (Manual/Future Automated)
1. Merchant generates JWT
2. Widget calls facilitator `/build-ptb`
3. Widget verifies REAL PTB with `verifyPaymentPTB()`
4. Buyer signs and submits
5. Facilitator settles on-chain

## Conclusion

**Widget unit tests CAN test:**
- ✅ Hash functions
- ✅ Validation logic  
- ✅ Browser API usage
- ✅ Input/output formatting

**Widget unit tests CANNOT test:**
- ❌ PTB verification (needs real PTBs)
- ❌ SUI SDK interactions (needs network)
- ❌ Transaction building (facilitator's job)

**Solution:**
1. Keep minimal widget unit tests (hash, validation)
2. Test PTB verification through facilitator integration tests
3. Test full flow through E2E tests (manual for now)

This is NOT laziness - it's **architectural reality**.
