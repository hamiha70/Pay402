# Receipt Architecture: Events vs Objects

## Overview

Pay402 uses **Sui Events** as receipts, not owned objects. This document explains why and how.

## The Confusion: EVM vs Sui

### EVM Pattern (What You Know)

```solidity
// Ethereum/EVM
event PaymentMade(bytes32 paymentId, address merchant, uint256 amount);

function pay(...) public {
    // ... transfer logic ...
    emit PaymentMade(id, merchant, amount);
    // ✅ Event logged permanently
}
```

**EVM Events:**

- Permanent on-chain
- Indexed in logs
- Queryable off-chain
- Zero storage cost
- **Perfect for audit trails**

### Sui Pattern (What We Use)

```move
// Sui/Move
public struct PaymentSettled has copy, drop {
    payment_id: vector<u8>,
    buyer: address,
    merchant: address,
    // ...
}

public entry fun settle_payment(...) {
    // ... transfer logic ...
    event::emit(PaymentSettled { ... });
    // ✅ Event emitted permanently
}
```

**Sui Events:**

- Permanent on-chain
- Indexed automatically
- Queryable via RPC
- Zero storage cost
- **Exactly like EVM events!**

## Why NOT Receipt Objects?

### Option A: Owned Receipt Object

```move
struct Receipt has key, store {
    payment_id: vector<u8>,
    // ...
}

public fun settle_payment(...): Receipt {
    Receipt { ... }  // ← WHO OWNS THIS?
}
```

**Problems:**

- ❌ Requires blockchain storage (costs SUI)
- ❌ Must transfer to someone (merchant? buyer? facilitator?)
- ❌ Owner must keep it forever (or pay to delete)
- ❌ Can be lost/deleted
- ❌ PTB must handle the return value (UnusedValueWithoutDrop error)

### Option B: Ephemeral Receipt (has drop)

```move
struct EphemeralReceipt has drop {
    // ...
}

public fun settle_payment(...): EphemeralReceipt {
    EphemeralReceipt { ... }  // ← Discarded immediately
}
```

**Problems:**

- ❌ Still needs to be dropped in PTB
- ❌ Not actually useful (gone immediately)
- ❌ Merchant can't access it
- ❌ No audit trail

### Option C: Event (CORRECT!)

```move
public entry fun settle_payment(...) {
    event::emit(PaymentSettled { ... });
    // ✅ No return value
    // ✅ Permanent audit trail
}
```

**Benefits:**

- ✅ Permanent on-chain
- ✅ Zero storage cost
- ✅ Indexed automatically
- ✅ Merchant can query anytime
- ✅ Can't be lost/deleted
- ✅ No PTB complexity

## Event Structure

### PaymentSettled Event

```move
public struct PaymentSettled has copy, drop {
    payment_id: vector<u8>,      // Unique nonce (prevents replay)
    buyer: address,              // Who paid
    merchant: address,           // Who received payment
    facilitator: address,        // Who facilitated (ctx.sender())
    amount: u64,                 // Merchant payment amount
    facilitator_fee: u64,        // Facilitator fee
    coin_type: vector<u8>,       // Token type (SUI, USDC, etc.)
    timestamp_ms: u64,           // When payment settled
}
```

**Complete Audit Trail:**

- ✅ Who: buyer, merchant, facilitator
- ✅ What: amount, fee, coin type
- ✅ When: timestamp
- ✅ Which: payment_id (unique)

## How Merchant Verifies Payment

### Query Events Off-Chain

```typescript
// Merchant backend checks payment
async function verifyPayment(paymentId: string, merchantAddress: string) {
  // Query Sui for PaymentSettled events
  const events = await client.queryEvents({
    query: {
      MoveEventType: `${packageId}::payment::PaymentSettled`,
    },
  });

  // Find event matching payment_id
  const payment = events.data.find(
    (e) =>
      e.parsedJson.payment_id === paymentId &&
      e.parsedJson.merchant === merchantAddress
  );

  if (payment) {
    // ✅ Payment verified!
    return {
      verified: true,
      amount: payment.parsedJson.amount,
      buyer: payment.parsedJson.buyer,
      timestamp: payment.parsedJson.timestamp_ms,
    };
  }

  return { verified: false };
}
```

### Facilitator Indexes Events

```typescript
// Facilitator maintains payment database
async function indexPayments() {
  // Subscribe to PaymentSettled events
  const events = await client.queryEvents({
    query: { MoveEventType: `${packageId}::payment::PaymentSettled` },
  });

  // Store in database
  for (const event of events.data) {
    await db.payments.upsert({
      payment_id: event.parsedJson.payment_id,
      buyer: event.parsedJson.buyer,
      merchant: event.parsedJson.merchant,
      amount: event.parsedJson.amount,
      status: "settled",
      timestamp: event.parsedJson.timestamp_ms,
    });
  }
}
```

## Replay Attack Prevention

### How It Works

1. **Invoice includes unique nonce** (payment_id)
2. **Facilitator tracks used nonces** (off-chain DB or event index)
3. **Before building PTB, check if payment_id already used**
4. **If used, reject** (don't build PTB)
5. **If new, build PTB** and submit
6. **Event emitted on-chain** = payment_id now used

### No On-Chain Nonce Tracking Needed!

```typescript
// Facilitator checks before building PTB
async function buildPTB(invoiceJWT: string, buyerAddress: string) {
  const invoice = decodeJWT(invoiceJWT);

  // Check if payment_id already used
  const existing = await db.payments.findOne({
    payment_id: invoice.nonce,
  });

  if (existing) {
    throw new Error("Payment already processed");
  }

  // Build PTB
  const tx = new Transaction();
  tx.moveCall({
    target: "settle_payment",
    arguments: [
      // ...
      tx.pure.vector("u8", invoice.nonce), // payment_id
    ],
  });

  return tx;
}
```

**Why this works:**

- Facilitator controls PTB building
- Won't build duplicate payment_ids
- Event provides on-chain proof
- Blockchain doesn't need nonce storage

## Validation in Move Contract

### What We Validate

```move
// In settle_payment function:

// 1. Amount must be non-zero
assert!(amount > 0, E_ZERO_AMOUNT);

// 2. Payment ID must not be empty
assert!(std::vector::length(&payment_id) > 0, E_EMPTY_PAYMENT_ID);

// 3. Buyer parameter must match transaction signer
let actual_buyer = tx_context::sender(ctx);
assert!(actual_buyer == buyer, E_BUYER_MISMATCH);

// 4. Transaction must be sponsored
let sponsor_opt = tx_context::sponsor(ctx);
assert!(option::is_some(&sponsor_opt), E_NOT_SPONSORED);

// 5. Get facilitator from sponsor (cannot be forged)
let facilitator = *option::borrow(&sponsor_opt);

// 6. Sufficient balance (automatic)
// coin::split will abort if buyer_coin doesn't have enough
let merchant_payment = coin::split(buyer_coin, amount, ctx);
```

### How Sponsored Transaction Validation Works

In Sui's sponsored transactions, there are TWO distinct addresses:

```move
// ctx.sender() = Transaction SIGNER (buyer)
// - The buyer signs the transaction kind
// - This is who authorized the payment
// - Returned by tx_context::sender(ctx)

// ctx.sponsor() = Gas PAYER (facilitator)
// - The facilitator adds gas and submits
// - This is who pays transaction fees
// - Returned by tx_context::sponsor(ctx)
```

**Security Validation:**

```move
// CORRECT: Validate buyer matches signer
let actual_buyer = ctx.sender();  // Who signed the transaction
assert!(actual_buyer == buyer, E_BUYER_MISMATCH);

// Why? Prevents malicious facilitator from lying:
// - Facilitator can't claim payment from wrong buyer
// - Event will have correct buyer address
// - Audit trail is trustworthy
```

**Example Attack (Prevented):**

```move
// Scenario: Malicious facilitator tries to lie
// Real buyer: 0xALICE (signs transaction)
// Facilitator passes: 0xBOB (fake buyer parameter)

payment::settle_payment(
    alice_coin,
    0xBOB,  // ← LIE!
    // ...
);

// Validation catches this:
// ctx.sender() = 0xALICE (actual signer)
// buyer param = 0xBOB (claimed buyer)
// 0xALICE != 0xBOB → ABORT with E_BUYER_MISMATCH ✅
```

### Why This Matters

**Without validation:**

- ❌ Facilitator could put wrong buyer in event
- ❌ Audit trail would be incorrect
- ❌ Disputes couldn't be resolved
- ❌ Merchant wouldn't know real buyer

**With validation:**

- ✅ Event has cryptographically verified buyer
- ✅ Audit trail is trustworthy
- ✅ Disputes can be resolved on-chain
- ✅ No one can forge buyer identity

### What We DON'T Validate

**buyer ≠ merchant** ⚠️

```move
// We DON'T prevent self-payment
// assert!(buyer != merchant, E_SELF_PAYMENT); // ← NOT IMPLEMENTED

// Why? Self-payment might be valid:
// - Testing
// - Internal transfers
// - Refunds
// If merchant wants to prevent this, check off-chain
```

## Sponsored Transaction Flow

### Complete Flow with Events

```
1. Merchant creates invoice (payment_id = nonce)
   ↓
2. Buyer requests PTB from facilitator
   ↓
3. Facilitator checks payment_id not used
   ↓
4. Facilitator builds transaction kind
   - tx.moveCall(settle_payment, [buyer_coin, buyer, amount, ...])
   - onlyTransactionKind: true (no gas)
   ↓
5. Buyer reconstructs tx and signs
   - tx = Transaction.fromKind(kindBytes)
   - tx.setSender(buyerAddress)
   - buyer signs
   ↓
6. Buyer sends kindBytes + signature to facilitator
   ↓
7. Facilitator sponsors gas and submits
   - tx.setGasOwner(facilitator)
   - tx.setGasPayment([facilitatorGasCoin])
   - Submit with dual signatures
   ↓
8. On-chain execution:
   - Split buyer coin → merchant + facilitator
   - Transfer to merchant
   - Transfer to facilitator
   - Emit PaymentSettled event ✅
   ↓
9. Event indexed by:
   - Facilitator (internal DB)
   - Merchant (verification)
   - Blockchain explorers
   - Anyone querying events
```

## Comparison: Events vs Objects

| Feature                   | Events (Current)     | Receipt Object         | Ephemeral Receipt  |
| ------------------------- | -------------------- | ---------------------- | ------------------ |
| **Permanent audit trail** | ✅ Yes               | ⚠️ Only if kept        | ❌ No              |
| **Merchant verification** | ✅ Query events      | ⚠️ Must own            | ❌ Gone            |
| **Storage cost**          | ✅ Free              | ❌ Costs SUI           | ✅ Free            |
| **Prevents double-spend** | ✅ (off-chain index) | ✅ (on-chain)          | ❌ No              |
| **Dispute resolution**    | ✅ Query blockchain  | ⚠️ Must keep           | ❌ Gone            |
| **PTB complexity**        | ✅ Simple            | ❌ Must transfer       | ⚠️ Must drop       |
| **Can be lost**           | ❌ Never             | ✅ Yes                 | ✅ Yes (immediate) |
| **Query speed**           | ✅ Fast (indexed)    | ⚠️ Slow (scan objects) | ❌ N/A             |

## Best Practices

### For Facilitators

```typescript
// 1. Index all PaymentSettled events
await indexEvents();

// 2. Check payment_id before building PTB
if (await isPaymentUsed(payment_id)) {
  throw new Error("Already processed");
}

// 3. Build PTB with buyer address
tx.moveCall({
  arguments: [
    paymentCoin,
    tx.pure.address(buyerAddress), // ← Actual buyer
    // ...
  ],
});
```

### For Merchants

```typescript
// 1. Query events by merchant address
const payments = await queryPaymentsByMerchant(merchantAddress);

// 2. Verify specific payment_id
const payment = await queryPaymentById(payment_id);
if (payment && payment.merchant === merchantAddress) {
  // ✅ Deliver content
}

// 3. Check balance increased (optional double-check)
const balance = await client.getBalance(merchantAddress);
```

### For Buyers

```typescript
// 1. Sign transaction kind
const signature = await signTransaction(txBytes);

// 2. Submit to facilitator
const result = await submitPayment({
  transactionKindBytes: kindBytes,
  buyerSignature: signature,
});

// 3. Save digest for reference
const digest = result.digest;
```

## Migration from Receipt Objects

If you have existing code expecting receipt objects:

**Before:**

```move
let receipt = settle_payment(...);
// Do something with receipt
```

**After:**

```move
settle_payment(...);  // No return value
// Query event off-chain instead
```

**TypeScript:**

```typescript
// Instead of getting receipt from transaction
const receipt = transaction.receipt; // ❌ Old

// Query event from blockchain
const events = await client.queryEvents({
  query: { MoveEventType: "PaymentSettled" },
});
const receipt = events.data[0].parsedJson; // ✅ New
```

## Summary

### The Right Pattern

✅ **Events ARE receipts** in Sui/Move
✅ **Just like EVM** (emit events for audit trails)
✅ **Zero storage cost**
✅ **Permanent & queryable**
✅ **No PTB complexity**

### The Wrong Pattern

❌ **Don't return receipt objects**
❌ **Don't use ephemeral structs**
❌ **Don't try to transfer receipts**

### Your Objectives (All Met!)

✅ Proof of payment → Query event
✅ Audit trail → Event is permanent
✅ Prevent double-spend → Off-chain tracking
✅ Nonce uniqueness → payment_id in event
✅ Merchant verification → Query events

---

**You were thinking in EVM terms. In Sui/Move, events ARE receipts. Your current implementation is the correct pattern!** 🎯
