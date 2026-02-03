# Settlement Modes: Optimistic vs Wait-for-Finality

## Overview

Pay402 supports two settlement modes to balance **UX speed** with **confirmation guarantees**:

1. **Optimistic**: Fast user experience (~50-100ms on testnet)
2. **Wait-for-Finality**: Guaranteed confirmation (~500-1000ms on testnet)

## Current Implementation (Localnet Limitation)

### The Localnet Reality

**Both modes appear similar on localnet** because:
- Block time is ~instant (no real consensus delay)
- `executeTransaction()` returns in ~20-150ms for both modes
- Transaction deduplication makes second submission faster

**This is NOT representative of testnet/mainnet behavior!**

### SDK Limitation

The SUI gRPC SDK's `executeTransaction()` **always waits for finality** - there's no true "fire-and-forget" mode. Both modes call the same method, just with different `include` parameters.

## Expected Behavior on Testnet/Mainnet

### Network Characteristics
- **Checkpoint interval**: ~400-800ms (Sui's consensus time)
- **Network latency**: 50-200ms (depending on location)
- **Transaction broadcast**: ~10-30ms

### Mode 1: Optimistic Settlement

**Flow:**
```
1. Client signs PTB                     [client-side]
2. POST /submit-payment (optimistic)    [→ facilitator]
3. Facilitator submits to network       [50ms]
4. Return digest immediately            [← merchant]
5. Redirect user to success page        [instant UX]
6. [Background] Transaction finalizes   [+400-800ms]
7. Merchant polls receipt               [as needed]
```

**Latency breakdown (testnet):**
- Client → Facilitator: 20-50ms
- Submit to network: 30-50ms
- **Total merchant sees: ~50-100ms** ✅

**Finality**: Transaction settles in background (~500-1000ms total)

**Use case**: Best UX for low-risk transactions (gas-sponsored, known buyer)

### Mode 2: Wait-for-Finality

**Flow:**
```
1. Client signs PTB                     [client-side]
2. POST /submit-payment (wait)          [→ facilitator]
3. Facilitator submits to network       [50ms]
4. Wait for checkpoint finality         [+400-800ms]
5. Return digest + receipt              [← merchant]
6. Redirect with confirmed payment      [guaranteed]
```

**Latency breakdown (testnet):**
- Client → Facilitator: 20-50ms
- Submit to network: 30-50ms
- Wait for checkpoint: 400-800ms
- **Total merchant sees: ~500-1000ms** ⏱️

**Finality**: Guaranteed before redirect

**Use case**: High-value transactions, regulated scenarios, immediate proof needed

## Implementation Details

### Optimistic Mode (Current)

```typescript
const result = await client.executeTransaction({
  transaction: txBytes,
  signatures: signatures,
  // NOTE: This still waits for finality in SDK
  // For true async, need raw gRPC or polling approach
});

// Return digest immediately
res.json({
  digest: result.Transaction.digest,
  latency: '50-100ms',  // testnet expected
});
```

### Wait Mode (Current)

```typescript
const result = await client.executeTransaction({
  transaction: txBytes,
  signatures: signatures,
  include: {
    effects: true,      // Full execution effects
    events: true,       // Receipt event
    objectChanges: true // State changes
  },
});

// Return digest + receipt after finality
res.json({
  digest: result.Transaction.digest,
  receipt: extractReceipt(result.Transaction.events),
  latency: '500-1000ms',  // testnet expected
});
```

## Future Optimization (True Async)

To achieve **true optimistic mode** on testnet:

### Option A: Raw gRPC Submit
```typescript
// Submit transaction without waiting
const digest = await submitTransactionRaw(txBytes, signatures);

// Return immediately (~50ms)
res.json({ digest });

// Merchant polls separately
const receipt = await client.waitForTransaction({ 
  digest,
  include: { events: true }
});
```

### Option B: Background Worker
```typescript
// Submit and return digest
const digest = await submitOptimistic(txBytes);
res.json({ digest });

// Background worker waits and stores receipt
await backgroundQueue.add({ digest, invoiceId });
```

## Testing on Different Networks

### Localnet
```bash
# Both modes similar (instant finality)
Optimistic: ~20-150ms
Wait:       ~20-150ms
```

### Testnet
```bash
# Real consensus delay visible
Optimistic: ~50-100ms   (UX win!)
Wait:       ~500-1000ms (guaranteed)
```

### Mainnet
```bash
# Similar to testnet with production traffic
Optimistic: ~60-120ms
Wait:       ~600-1200ms
```

## Merchant Integration

### Optimistic Flow
```typescript
// 1. Submit payment
const { digest } = await POST('/submit-payment', {
  settlementMode: 'optimistic'
});

// 2. Redirect immediately
window.location = `/success?txn=${digest}`;

// 3. Poll for receipt (background)
const receipt = await pollReceipt(digest);
```

### Wait Flow
```typescript
// 1. Submit payment (blocks ~1s)
const { digest, receipt } = await POST('/submit-payment', {
  settlementMode: 'wait'
});

// 2. Redirect with confirmed payment
window.location = `/success?txn=${digest}&confirmed=true`;
```

## Recommendations

### Use Optimistic When:
- Gas-sponsored by facilitator (no risk of insufficient funds)
- Known/trusted buyers
- Low transaction amounts
- UX is critical (checkout flow)

### Use Wait When:
- High-value transactions
- First-time buyers
- Regulatory requirements
- Need immediate proof of payment
- On-chain receipt required for delivery

## Monitoring & Metrics

Track these metrics on testnet/mainnet:

```
optimistic_latency_p50: 60ms   (target)
optimistic_latency_p99: 150ms

wait_latency_p50: 700ms   (target)
wait_latency_p99: 1200ms

settlement_success_rate: >99.9%
```
