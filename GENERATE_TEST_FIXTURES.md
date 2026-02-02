# Generate Real PTB Test Fixtures

## Why We Need This

The widget's `verifyPaymentPTB()` function needs REAL PTBs for testing because:
- `tx.serialize()` returns JSON (not bytes)  
- `tx.build({ client })` requires SUI network connection
- Only the facilitator can create valid PTBs

**Key Point:** The fixtures use the REAL merchant private key from `merchant/.env`, so the JWTs have valid signatures that the widget can verify!

## How to Generate Fixtures

### 1. Start All Services

```bash
# Terminal 1: Merchant
cd merchant && npm run dev

# Terminal 2: Facilitator  
cd facilitator && npm run dev

# Terminal 3: Widget
cd widget && npm run dev
```

### 2. Generate Fixtures

```bash
# From project root
node scripts/generate-test-ptbs.js
```

This will:
1. Use merchant to generate signed JWTs
2. Use facilitator to build REAL PTBs from JWTs
3. Save PTBs as test fixtures in `widget/src/__fixtures__/ptb-fixtures.json`

### 3. Use Fixtures in Tests

```typescript
// widget/src/lib/verifier.test.ts
import fixtures from '../__fixtures__/ptb-fixtures.json';

describe('verifyPaymentPTB', () => {
  it('should accept valid payment PTB', async () => {
    const { ptbBytes, invoice, invoiceJWT } = fixtures.validPayment;
    const result = await verifyPaymentPTB(
      new Uint8Array(ptbBytes),
      invoice,
      invoiceJWT
    );
    expect(result.valid).toBe(true);
  });

  it('should reject wrong recipient', async () => {
    const { ptbBytes, expectedInvoice, invoiceJWT } = fixtures.wrongRecipient;
    const result = await verifyPaymentPTB(
      new Uint8Array(ptbBytes),
      expectedInvoice, // Expect valid invoice
      invoiceJWT
    );
    expect(result.valid).toBe(false);
    expect(result.reason).toContain('recipient');
  });
});
```

## Generated Fixtures

The script generates:
- `validPayment` - Correct PTB for valid invoice
- `wrongRecipient` - PTB sending to attacker address
- `wrongAmount` - PTB with different amount than expected

## When to Regenerate

Regenerate fixtures when:
- PTB building logic changes in facilitator
- Invoice structure changes
- Test addresses change
- SUI SDK version updates

## Benefits

✅ Tests use REAL PTBs (not mocks)
✅ Tests run fast (no network needed after generation)
✅ Tests catch actual PTB verification bugs
✅ Fixtures can be committed to git for CI/CD
