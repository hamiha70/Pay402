# Sponsored Transaction Validation in Move Contract

## Overview

The `settle_payment` Move function now includes **cryptographic validation** to ensure the buyer address parameter matches the actual transaction signer. This prevents malicious facilitators from forging buyer identities.

## Background: Sui Sponsored Transactions

In Sui's sponsored transaction model, there are TWO distinct roles:

| Role        | Who         | What They Do               | How to Access in Move                         |
| ----------- | ----------- | -------------------------- | --------------------------------------------- |
| **Sender**  | Buyer       | Signs the transaction kind | `ctx.sender()` or `tx_context::sender(ctx)`   |
| **Sponsor** | Facilitator | Pays gas fees              | `ctx.sponsor()` or `tx_context::sponsor(ctx)` |

### Why This Matters

Without validation, a malicious facilitator could:

1. Build a transaction with Alice's coins
2. Pass Bob's address as the `buyer` parameter
3. The event would show Bob as the buyer (wrong!)
4. Dispute resolution would fail (incorrect audit trail)

## Security Validations

### 1. Buyer Must Match Transaction Signer

```move
// Get the actual transaction signer
let actual_buyer = tx_context::sender(ctx);

// Validate against buyer parameter
assert!(actual_buyer == buyer, E_BUYER_MISMATCH);
```

**What this prevents:**

- ✅ Facilitator cannot lie about buyer identity
- ✅ Events contain cryptographically verified buyer address
- ✅ Audit trail is trustworthy
- ✅ Disputes can be resolved on-chain

**Example Attack (Prevented):**

```move
// Malicious facilitator scenario:
// - Alice signs transaction (ctx.sender() = 0xALICE)
// - Facilitator passes 0xBOB as buyer parameter

settle_payment(
    alice_coin,
    0xBOB,  // ← LIE! Doesn't match ctx.sender()
    // ...
);

// Validation aborts with E_BUYER_MISMATCH ✅
// Attack prevented!
```

### 2. Transaction Must Be Sponsored

```move
// Get optional sponsor address
let sponsor_opt = tx_context::sponsor(ctx);

// Must have a sponsor
assert!(option::is_some(&sponsor_opt), E_NOT_SPONSORED);

// Extract facilitator address
let facilitator = *option::borrow(&sponsor_opt);
```

**What this prevents:**

- ✅ Function only works in sponsored transaction flow
- ✅ Facilitator address comes from cryptographic sponsor field
- ✅ Facilitator cannot forge their own address either

**Why this is important:**

- In non-sponsored transactions, `ctx.sender()` pays gas
- In sponsored transactions, `ctx.sponsor()` pays gas
- We require sponsored transactions for our payment flow
- This ensures the facilitator address in events is correct

## Error Codes

| Code | Constant             | Meaning                                            |
| ---- | -------------------- | -------------------------------------------------- |
| `1`  | `E_ZERO_AMOUNT`      | Payment amount cannot be zero                      |
| `2`  | `E_EMPTY_PAYMENT_ID` | Payment ID cannot be empty                         |
| `3`  | `E_BUYER_MISMATCH`   | Buyer parameter doesn't match transaction signer   |
| `4`  | `E_NOT_SPONSORED`    | Transaction must be sponsored (have a gas sponsor) |

## Complete Validation Flow

```move
public entry fun settle_payment<T>(
    buyer_coin: &mut Coin<T>,
    buyer: address,              // ← Must match signer!
    amount: u64,
    merchant: address,
    facilitator_fee: u64,
    payment_id: vector<u8>,
    clock: &Clock,
    ctx: &mut TxContext
) {
    // === Validate Inputs ===
    assert!(amount > 0, E_ZERO_AMOUNT);
    assert!(std::vector::length(&payment_id) > 0, E_EMPTY_PAYMENT_ID);

    // === Validate Sponsored Transaction Security ===

    // Get actual signer (buyer)
    let actual_buyer = tx_context::sender(ctx);
    assert!(actual_buyer == buyer, E_BUYER_MISMATCH);

    // Get sponsor (facilitator)
    let sponsor_opt = tx_context::sponsor(ctx);
    assert!(option::is_some(&sponsor_opt), E_NOT_SPONSORED);
    let facilitator = *option::borrow(&sponsor_opt);

    // === Execute Payment ===
    // ... split coins, transfer, emit event ...
}
```

## Move Test Coverage

The following tests verify the validation logic:

### Security Tests

1. **`test_buyer_mismatch_fails`**

   - Attempts to pass wrong buyer address
   - Verifies `E_BUYER_MISMATCH` abort

2. **`test_buyer_match_succeeds`**

   - Passes correct buyer address matching signer
   - Verifies transaction succeeds

3. **`test_non_sponsored_transaction_fails`**

   - Attempts non-sponsored transaction
   - Verifies `E_NOT_SPONSORED` abort

4. **`test_facilitator_cannot_lie_about_buyer`**

   - Malicious facilitator scenario
   - Verifies validation catches the attack

5. **`test_merchant_address_as_buyer_fails_if_not_signer`**

   - Attempts to set merchant as buyer (not signer)
   - Verifies validation fails

6. **`test_self_payment_succeeds_if_buyer_is_signer`**
   - Self-payment scenario (buyer = merchant = signer)
   - Verifies this is allowed (signer is correct)

## TypeScript Integration

### Building the PTB

The facilitator must pass the correct buyer address:

```typescript
// In build-ptb.ts
export async function buildPTB(
  invoiceJWT: string,
  buyerAddress: string
): Promise<TransactionKindBytes> {
  // Decode invoice
  const invoice = decodeJWT(invoiceJWT);

  // Build transaction
  const tx = new Transaction();

  // Get buyer's payment coin (USDC, SUI, etc.)
  const paymentCoin = tx.object(/* ... */);

  // Call settle_payment with buyer address
  tx.moveCall({
    target: `${packageId}::payment::settle_payment`,
    arguments: [
      paymentCoin,
      tx.pure.address(buyerAddress), // ← BUYER (will be validated!)
      tx.pure.u64(invoice.amount),
      tx.pure.address(invoice.merchant),
      tx.pure.u64(facilitatorFee),
      tx.pure.vector("u8", invoice.nonce),
      tx.object("0x6"), // Clock
    ],
    typeArguments: [invoice.coinType],
  });

  // Build transaction kind (no gas)
  const kindBytes = await tx.build({
    client,
    onlyTransactionKind: true,
  });

  return kindBytes;
}
```

### Buyer Signs Transaction

```typescript
// Buyer reconstructs transaction and signs
const tx = Transaction.fromKind(kindBytes);
tx.setSender(buyerAddress); // ← This becomes ctx.sender()

const txBytes = await tx.build({ client });
const { signature } = await buyerKeypair.signTransaction(txBytes);
```

### Facilitator Submits with Sponsorship

```typescript
// Facilitator adds gas and submits
const tx = Transaction.fromKind(kindBytes);
tx.setSender(buyerAddress); // ← ctx.sender() = buyer
tx.setGasOwner(facilitatorAddress); // ← ctx.sponsor() = facilitator
tx.setGasPayment([facilitatorGasCoin]);

// Submit with dual signatures
const result = await client.executeTransactionBlock({
  transactionBlock: tx,
  signature: [buyerSignature, facilitatorSignature],
});
```

### Result: Validated Addresses

```typescript
// Query emitted event
const events = await client.queryEvents({
  query: { MoveEventType: `${packageId}::payment::PaymentSettled` },
});

const event = events.data[0].parsedJson;

// These addresses are cryptographically validated:
console.log(event.buyer); // ← Validated against ctx.sender()
console.log(event.facilitator); // ← Validated from ctx.sponsor()
console.log(event.merchant); // ← From invoice (not validated)
```

## Benefits of This Validation

### Security

- ✅ **Prevents identity forgery**: Facilitator cannot lie about buyer
- ✅ **Cryptographic proof**: Buyer address is verified by blockchain
- ✅ **Trustworthy events**: Audit trail has correct addresses

### Dispute Resolution

- ✅ **On-chain verification**: Query events to prove payment
- ✅ **Correct parties**: Know exactly who paid and who facilitated
- ✅ **Immutable record**: Addresses cannot be altered after settlement

### Compliance

- ✅ **Accurate audit trail**: Events contain verified addresses
- ✅ **Transaction traceability**: Can track payment flow on-chain
- ✅ **Regulatory compliance**: Trustworthy payment records

## What We DON'T Validate

### Self-Payment (buyer = merchant)

We **do not** prevent self-payment scenarios:

```move
// NOT implemented:
// assert!(buyer != merchant, E_SELF_PAYMENT);
```

**Why?**

- Valid use cases: testing, internal transfers, refunds
- Buyer is still correctly validated (must be signer)
- Merchant can reject self-payments off-chain if needed

### Facilitator Fee Amount

We **do not** validate the facilitator fee:

```move
// NOT implemented:
// assert!(facilitator_fee <= MAX_FEE, E_FEE_TOO_HIGH);
```

**Why?**

- Buyer signs PTB with explicit amounts visible
- Buyer controls whether to sign (informed consent)
- Market competition keeps fees reasonable
- Different use cases need different fee structures

### Payment Amount Limits

We **do not** enforce min/max payment amounts:

```move
// NOT implemented:
// assert!(amount >= MIN_AMOUNT && amount <= MAX_AMOUNT, E_INVALID_AMOUNT);
```

**Why?**

- Zero amount is prevented (`E_ZERO_AMOUNT`)
- Max is limited by buyer's balance (automatic)
- Use cases vary (micropayments vs large transactions)
- Merchant/buyer negotiate amounts off-chain

## Summary

The validation logic ensures:

1. **Buyer identity is cryptographically verified** against transaction signer
2. **Facilitator identity is cryptographically verified** against transaction sponsor
3. **Events contain trustworthy addresses** for audit trails
4. **Malicious facilitators cannot forge identities**
5. **Disputes can be resolved using on-chain data**

This makes Pay402 payments **secure, auditable, and trustworthy** while maintaining the efficiency of sponsored transactions.
