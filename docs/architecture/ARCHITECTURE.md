# Pay402 - Technical Specification (Hackathon)

**Project:** Zero-Friction x402 Payment Protocol on SUI with zkLogin  
**Hackathon:** ETH Global HackMoney (January 2026)  
**Status:** 🎯 **LOCKED SPECIFICATION** - Ready for Implementation  
**Version:** 2.0 (Post-Refinement)  
**Date:** February 1, 2026

---

## Document Purpose

This is the **canonical technical specification** for the Pay402 hackathon implementation. All architecture questions are resolved. This document defines:

- What we build for the hackathon
- How components interact
- What we explicitly defer to post-hackathon

**See Also:**

- `DESIGN_RATIONALE.md` - Trade-offs, alternatives considered, and justifications
- `DEVELOPMENT_GUIDE.md` - Development practices and tooling
- `WIDGET_DEPLOYMENT.md` - Widget build and deployment specifics

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Actors and Components](#actors-and-components)
3. [Complete Payment Flow](#complete-payment-flow)
4. [Component Specifications](#component-specifications)
5. [PTB Template and Verification](#ptb-template-and-verification)
6. [Receipt Design](#receipt-design)
7. [Security Model](#security-model)
8. [Demo Requirements](#demo-requirements)
9. [Technical Constraints](#technical-constraints)
10. [Out of Scope](#out-of-scope)

---

## Executive Summary

### The Core Innovation

**Pay402** enables micropayments with **zero wallet friction** using zkLogin:

- Users authenticate with Google OAuth
- Derive SUI blockchain address automatically
- Own funds (non-escrow, self-custody)
- Sign payments without wallet extension
- Zero gas burden (facilitator sponsors)

### Key Technical Decisions (Locked)

| Decision                   | Choice                                                            | Rationale                               |
| -------------------------- | ----------------------------------------------------------------- | --------------------------------------- |
| **Custody Model**          | Non-escrow (buyer-owned coins)                                    | Web3 trust boundary, not delegated Web2 |
| **Invoice Format**         | Merchant-signed JWT + hash on-chain                               | Audit trail, conflict resolution        |
| **Verification**           | Tier 1 (facilitator webpage) + Tier 2 (extension, post-hackathon) | Hackathon-realistic, clear upgrade path |
| **Receipt**                | On-chain event with `invoice_hash`                                | Merchant audit, reconciliation          |
| **Transaction Submission** | Facilitator submits (buyer RPC-free)                              | Simplifies buyer UX                     |
| **Salt Management**        | Enoki-managed                                                     | Don't DIY, use production-ready service |
| **Funding**                | Demo faucet (testnet/devnet)                                      | Hackathon-appropriate                   |

### What We Build

✅ **Hackathon Scope:**

1. Move contract with `settle_payment<T>()` and receipt emission
2. Facilitator backend (Express + TypeScript)
   - PTB construction
   - Gas sponsorship
   - Transaction submission
3. Browser payment page (React + Enoki)
   - zkLogin integration
   - PTB template verifier (Tier 1)
   - Payment confirmation UI
4. Demo merchant (simple 402 server)
5. Demo faucet (testnet USDC distribution)

❌ **Out of Scope:**

- Full widget (embedded in merchant pages) - simplified demo version only
- Browser extension (Tier 2 verifier) - architecture supports, not building
- Cross-chain (CCTP) - future
- Privacy enhancements - future

---

## Actors and Components

### Actors

```
┌──────────┐         ┌──────────┐         ┌──────────┐
│  Buyer   │         │ Merchant │         │  Facil.  │
│          │         │          │         │          │
│ - Browses│──────→  │ - Sells  │──────→  │ - Builds │
│ - Pays   │         │   content│         │   PTBs   │
│ - Signs  │         │ - Issues │         │ - Sponsors│
│   (zkL)  │         │   402    │         │   gas    │
└──────────┘         └──────────┘         └──────────┘
      │                    │                    │
      └────────────────────┴────────────────────┘
                           │
                           ↓
                  ┌─────────────────┐
                  │   SUI Chain     │
                  │                 │
                  │ - Settlement    │
                  │ - Receipt emit  │
                  └─────────────────┘
```

**Buyer:**

- Browser user
- Authenticates via Google OAuth (zkLogin)
- Signs PTBs (no wallet extension)
- Owns USDC coins at zkLogin-derived address

**Merchant:**

- Web service selling premium content/API access
- Returns 402 challenges with invoice JWT
- Verifies payment on-chain
- Delivers content after payment

**Facilitator:**

- Service we build
- Constructs PTBs from buyer coins
- Sponsors gas (SUI for tx fees)
- Submits signed transactions
- Provides payment page UI

**SUI Blockchain:**

- Executes PTBs
- Emits receipt events
- Hosts USDC coins

### Components We Build

```
Pay402/
├── move/payment/           # Move smart contract
│   ├── sources/
│   │   └── payment.move    # settle_payment<T>(), emit receipt
│   └── tests/              # 13 unit tests (all passing)
│
├── facilitator/            # Backend service
│   ├── src/
│   │   ├── index.ts        # Express app
│   │   ├── config.ts       # Environment config
│   │   ├── sui.ts          # SuiGrpcClient setup
│   │   └── controllers/
│   │       ├── health.ts   # GET /health
│   │       ├── balance.ts  # POST /check-balance
│   │       ├── payment.ts  # POST /settle-payment
│   │       └── faucet.ts   # POST /fund (demo only)
│   └── tests/              # API integration tests
│
├── widget/                 # Payment page (simplified)
│   ├── src/
│   │   ├── PaymentPage.tsx    # Main UI
│   │   ├── zkLogin.ts         # Enoki integration
│   │   ├── verifier.ts        # PTB template verifier (CRITICAL)
│   │   └── api.ts             # Facilitator API client
│   └── tests/                 # Verifier unit tests
│
└── demo/                   # Demo merchant
    └── merchant-server.ts  # Simple 402 endpoint
```

---

## Complete Payment Flow

### Overview Diagram

```
1. Buyer requests resource
        ↓
2. Merchant returns 402 + Invoice JWT
        ↓
3. Browser opens facilitator payment page
        ↓
4. zkLogin authentication (Google OAuth)
        ↓
5. [First time only] Fund address (demo faucet)
        ↓
6. Facilitator constructs PTB
        ↓
7. Buyer verifies PTB template
        ↓
8. Buyer signs PTB (zkLogin)
        ↓
9. Facilitator submits to SUI
        ↓
10. Receipt event emitted on-chain
        ↓
11. Return to merchant
        ↓
12. Merchant verifies receipt
        ↓
13. Content delivered
```

### Detailed Step-by-Step

#### Step 1: Buyer Requests Protected Resource

```http
GET /premium-data HTTP/1.1
Host: api.merchant.com
```

#### Step 2: Merchant Returns 402 Challenge with Invoice JWT

```http
HTTP/1.1 402 Payment Required
Content-Type: application/json
X-X402-Invoice-JWT: eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9...

{
  "error": "Payment required",
  "facilitator_url": "https://pay402.io/pay",
  "callback_url": "https://api.merchant.com/verify"
}
```

**Invoice JWT Claims:**

```json
{
  "iss": "merchant.com",
  "aud": "pay402.io",
  "iat": 1738396800,
  "exp": 1738397400,
  "payment_id": "pmt_abc123",
  "amount": "100000",
  "assetType": "0xa1ec7fc...::usdc::USDC",
  "merchantRecipient": "0x1234...merchant",
  "resource": "/premium-data",
  "nonce": "unique_nonce_123"
}
```

**Why JWT:**

- Merchant signs invoice terms (prevents facilitator tampering)
- Canonical artifact for audit/disputes
- Standard format (easy to verify)

#### Step 3: Browser Redirects to Facilitator Payment Page

```
https://pay402.io/pay?invoice_jwt=<token>&callback=<url>
```

Payment page displays:

- Merchant domain
- Resource being purchased
- Amount and currency
- "Sign in to pay" button

#### Step 4: zkLogin Authentication

**4a. If no active session:**

User clicks "Sign in with Google" →

```javascript
// Enoki handles OAuth flow
const { address, session } = await enokiClient.createSession({
  provider: "google",
  redirectUrl: currentUrl,
});

// address = 0xabc123... (deterministic from Google ID + salt)
// session = { ephemeralKey, proof, maxEpoch }
```

**4b. Session management:**

- Salt persisted by Enoki (buyer address stable across sessions)
- Ephemeral key + proof cached until `maxEpoch`
- If session expires, re-authenticate (same address)

**Display to buyer:**

```
✅ Signed in as user@gmail.com
📍 Your address: 0xabc123...
💰 Balance: 0 USDC (need funding)
```

#### Step 5: Funding (First Payment Only)

**For demo:**

Buyer clicks "Fund (demo faucet)" →

```typescript
// Facilitator faucet endpoint
POST /fund
{
  "address": "0xabc123...",
  "sessionId": "sess_xyz"
}

// Facilitator sends USDC coin to buyer address
// Returns tx digest
```

**Display:**

```
✅ Funded: 1.0 USDC
   TX: AbCd1234...
💰 New balance: 1.0 USDC
```

**Production (post-hackathon):**

- Credit card onramp
- Circle USDC faucet (testnet)
- Bank transfer

#### Step 6: Facilitator Constructs PTB

**Inputs:**

- Invoice JWT (validated)
- Buyer address
- Buyer USDC coin objects (queried from chain)

**PTB Construction (server-side):**

```typescript
// Fetch buyer's USDC coins
const coins = await suiClient.listCoins({
  owner: buyerAddress,
  coinType: USDC_TYPE,
});

// Select coins, merge if needed
const ptb = new Transaction();

// Optional: Merge multiple coins into one
if (coins.length > 1) {
  ptb.mergeCoins(
    coins[0].objectId,
    coins.slice(1).map((c) => c.objectId)
  );
}

// Split exact amount
const [paymentCoin] = ptb.splitCoins(coins[0].objectId, [amount]);

// Transfer to merchant
ptb.transferObjects([paymentCoin], merchantRecipient);

// Emit receipt
const invoiceHash = sha256(invoiceJwtBytes);
ptb.moveCall({
  target: `${packageId}::payment::emit_receipt`,
  arguments: [
    ptb.pure(payment_id),
    ptb.pure(invoiceHash),
    ptb.pure(buyerAddress),
    ptb.pure(merchantRecipient),
    ptb.pure(amount),
    ptb.pure(assetType),
  ],
  typeArguments: [USDC_TYPE],
});

// Set gas sponsor
ptb.setSender(facilitatorAddress);
ptb.setGasPayment(facilitatorGasCoins);

// Serialize PTB bytes
const ptbBytes = await ptb.build();
```

**Return to buyer page:**

```json
{
  "ptbBytes": "base64_encoded_transaction_bytes",
  "summary": {
    "amount": "100000",
    "recipient": "0x1234...merchant",
    "assetType": "USDC",
    "invoiceHash": "0xabcd..."
  },
  "inputCoins": ["0xobj1...", "0xobj2..."]
}
```

#### Step 7: Buyer-Side Template Verification (CRITICAL)

**Verifier runs in payment page (Tier 1):**

```typescript
// verifier.ts
function verifyPaymentPTB(
  ptbBytes: Uint8Array,
  invoice: InvoiceJWT
): VerificationResult {
  // Parse PTB bytes (NOT facilitator summary!)
  const ptb = deserializeTransaction(ptbBytes);

  // Extract commands
  const commands = ptb.commands;

  // Invariant 1: Only allowed commands
  const allowedCommands = [
    "MergeCoins",
    "SplitCoins",
    "TransferObjects",
    "MoveCall",
  ];
  for (const cmd of commands) {
    if (!allowedCommands.includes(cmd.type)) {
      return { pass: false, reason: `Disallowed command: ${cmd.type}` };
    }
  }

  // Invariant 2: All coin operations are USDC only
  for (const cmd of commands.filter((c) => c.type.includes("Coin"))) {
    if (cmd.coinType !== invoice.assetType) {
      return { pass: false, reason: "Non-USDC coin operation" };
    }
  }

  // Invariant 3: Exactly one transfer of exact amount to merchant
  const transfers = commands.filter((c) => c.type === "TransferObjects");
  const paymentTransfer = transfers.find(
    (t) =>
      t.recipient === invoice.merchantRecipient && t.amount === invoice.amount
  );
  if (!paymentTransfer) {
    return { pass: false, reason: "Payment transfer not found or incorrect" };
  }

  // Invariant 4: No transfers to non-buyer addresses (except merchant)
  for (const transfer of transfers) {
    if (
      transfer.recipient !== invoice.merchantRecipient &&
      transfer.recipient !== invoice.buyerAddress
    ) {
      return { pass: false, reason: "Unauthorized transfer detected" };
    }
  }

  // Invariant 5: Receipt emission with correct invoice hash
  const receiptCall = commands.find(
    (c) => c.type === "MoveCall" && c.function === "emit_receipt"
  );
  if (!receiptCall) {
    return { pass: false, reason: "Missing receipt emission" };
  }

  const invoiceHash = sha256(invoiceJwtBytes);
  if (receiptCall.args.invoiceHash !== invoiceHash) {
    return { pass: false, reason: "Invoice hash mismatch" };
  }

  // All checks passed
  return { pass: true };
}
```

**UI Display:**

```
┌─────────────────────────────────────────┐
│ Invoice Terms (from merchant JWT):     │
│  • Pay 0.1 USDC to merchant.com        │
│  • Resource: /premium-data              │
│  • Payment ID: pmt_abc123               │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│ Transaction Verification (from bytes):  │
│  ✅ Template check: PASS                │
│  ✅ Amount: 0.1 USDC (exact)            │
│  ✅ Recipient: 0x1234...merchant        │
│  ✅ No unauthorized transfers           │
│  ✅ Receipt included                    │
└─────────────────────────────────────────┘

[ Sign and Pay ]  [ Cancel ]
```

**If verification fails:**

```
❌ Transaction does not match invoice!
   Reason: Amount mismatch (expected 0.1, found 1.0)

   DO NOT SIGN THIS TRANSACTION.

[ Report Issue ]  [ Cancel ]
```

#### Step 8: Buyer Signs PTB

```typescript
// User clicks "Sign and Pay"
const signature = await enokiClient.signTransaction(ptbBytes);

// Send signature bundle to facilitator
POST /submit-signature
{
  "ptbBytes": "...",
  "signature": "...",
  "zkProof": "...",
  "ephemeralPublicKey": "..."
}
```

#### Step 9: Facilitator Submits Transaction

```typescript
// facilitator receives signature
const tx = await suiClient.executeTransaction({
  transactionBlock: ptbBytes,
  signature: signatureBundle,
  options: {
    showEffects: true,
    showEvents: true,
  },
});

// Check success
if (tx.effects.status.status !== "success") {
  throw new Error("Transaction failed");
}

// Extract receipt event
const receiptEvent = tx.events.find((e) =>
  e.type.includes("::payment::ReceiptEmitted")
);

return {
  txDigest: tx.digest,
  receipt: receiptEvent.parsedJson,
};
```

---

### Settlement Modes: Optimistic vs Wait-for-Finality

**CRITICAL ARCHITECTURAL DECISION:** How long does the user wait after signing?

**CORE BUSINESS MODEL:** Facilitator acts as **GUARANTOR/INSURER**, not just transaction processor.

> **⚠️ Localnet Testing Note:** Both modes appear similar on localnet (~20-150ms) due to instant finality. The true difference (optimistic: ~50ms, wait: ~700ms) only shows on testnet/mainnet where checkpoint consensus takes ~400-800ms.

---

#### Mode 1: TRUE Optimistic Settlement (Recommended for UX)

**Business Model Insight:**

```
"SAFE TO DELIVER" ≠ "TRANSACTION SETTLED"

Facilitator takes settlement risk → Merchant trusts facilitator → Instant UX
```

**Flow:**

1. User signs PTB → POST to facilitator
2. Facilitator validates comprehensively:
   - Verify signature (~5ms)
   - Check buyer balance (~20ms RPC call)
   - Validate PTB structure (~5ms)
   - Verify invoice JWT (~5ms)
3. Facilitator **SUBMITS to blockchain immediately** (~10ms to submit, NOT finalize)
4. **"SAFE TO DELIVER" response** (after submit, before finality) (~50-100ms total)
5. Merchant delivers content **IMMEDIATELY** (trusts facilitator's validation + submit)
6. Background: Transaction finalizes (~+500ms, merchant already served content)
7. If settlement **FAILS** (rare - front-running): **FACILITATOR PAYS MERCHANT** (liability)

**Critical Difference from "Wait Mode":**

```typescript
// BOTH modes do these steps:
validateSignature(txBytes, signature);        // 5ms
checkBuyerBalance(buyerAddress);              // 20ms (RPC)
validatePTBStructure(txBytes, invoice);       // 5ms
const result = await submitToBlockchain(...); // 10ms (SUBMIT, not finalize!)

// THE ONLY DIFFERENCE:
if (mode === 'optimistic') {
  // Return AFTER submit (BEFORE finality)
  res.json({ 
    safeToDeliver: true, 
    digest: result.digest 
  });  // ~50-100ms total
  
  // Facilitator's ONLY risk:
  // Buyer front-runs (spends coins elsewhere before finality)
  // Mitigated by: Submitting IMMEDIATELY after validation
  
} else if (mode === 'wait') {
  // Return AFTER finality
  await waitForFinality(result.digest);       // +500ms BLOCKING
  res.json({ 
    safeToDeliver: true, 
    digest: result.digest,
    receipt: getReceipt()
  });  // ~550-600ms total
}
```

**Pros:**

- ✅ **Ultra-fast UX:** User sees success in ~50ms (not 700ms!)
- ✅ **Instant delivery:** Merchant delivers before settlement
- ✅ **Trust model:** Facilitator's reputation guarantees payment
- ✅ **Competitive edge:** Stripe-like instant confirmation

**Cons:**

- ⚠️ **Facilitator risk:** Must pay if settlement fails
- ⚠️ **Requires validation:** Must pre-check balance, signature, PTB structure
- ⚠️ **Fraud potential:** Front-running, insufficient gas, invalid PTB
- ⚠️ **Capital requirements:** Facilitator needs reserve pool

**Latency Breakdown:**

```
OPTIMISTIC MODE TIMELINE:
[0ms]    → User clicks "Pay"
[5ms]    → User signs PTB (client-side)
[10ms]   → POST to facilitator
[15ms]   → Facilitator: Validate signature
[35ms]   → Facilitator: Check buyer balance (RPC)
[40ms]   → Facilitator: Validate PTB structure
[50ms]   → Facilitator: SUBMIT to blockchain (locks coins)
[60ms]   ← HTTP response: "SAFE TO DELIVER" + digest
[70ms]   → Redirect to merchant
[80ms]   ← Content delivered ✅ USER HAPPY

BACKGROUND (merchant + user don't wait):
[550ms]  ← Transaction finalized on-chain
[560ms]  → Merchant notified via webhook (optional)

FACILITATOR'S ONLY RISK WINDOW:
[50ms-550ms]: Buyer could theoretically front-run
               (but submitted immediately, so very low probability)
```

**Facilitator Liability Scenarios:**

| Failure Cause         | Frequency | When Can Occur | Mitigation                         |
| --------------------- | --------- | -------------- | ---------------------------------- |
| Buyer front-runs      | Very Low  | Between submit & finality | Submit IMMEDIATELY after validation |
| Invalid signature     | Zero      | Caught in validation | Validate signature before submit |
| Insufficient balance  | Zero      | Caught in validation | Check balance before submit |
| Invalid PTB structure | Zero      | Caught in validation | Validate PTB before submit |
| Network failure       | Low       | During submit | Retry logic, multiple RPC nodes |

**Key Insight:** Comprehensive validation BEFORE submit eliminates most risks.
**Remaining risk:** Buyer double-spends between facilitator's submit and finality (~500ms window)

**Response Format:**

```json
{
  "success": true,
  "mode": "optimistic",
  "safeToDeliver": true,
  "facilitatorGuarantee": true,
  "digest": "AbCd1234...",  // Available immediately after submit
  "validateLatency": "35ms",
  "submitLatency": "10ms",
  "httpLatency": "60ms",
  "note": "Transaction submitted - finality in background"
}
```

**Implementation:**

```typescript
// facilitator/src/controllers/submit-payment.ts (optimistic mode)
async function submitPaymentOptimistic(req, res) {
  const startTime = Date.now();
  
  // Step 1: Comprehensive validation (SAME in both modes)
  const validateStart = Date.now();
  
  validateSignature(txBytes, signature);           // ~5ms
  await checkBuyerBalance(buyerAddress, amount);   // ~20ms (RPC call)
  validatePTBStructure(txBytes, invoiceJWT);       // ~5ms
  validateInvoiceJWT(invoiceJWT);                  // ~5ms
  
  const validateLatency = Date.now() - validateStart;
  
  // Step 2: Submit to blockchain IMMEDIATELY (lock buyer's coins)
  const submitStart = Date.now();
  
  const result = await client.executeTransaction({
    transaction: txBytes,
    signatures: [signature],
  });
  
  const digest = result.$kind === 'Transaction' ? result.Transaction.digest : null;
  const submitLatency = Date.now() - submitStart;
  
  // Step 3: Return "safe to deliver" AFTER submit (BEFORE finality)
  const httpLatency = Date.now() - startTime;
  
  res.json({
    success: true,
    mode: 'optimistic',
    safeToDeliver: true,
    digest,  // Available now!
    validateLatency: `${validateLatency}ms`,
    submitLatency: `${submitLatency}ms`,
    httpLatency: `${httpLatency}ms`,
    note: 'Submitted to blockchain - finality in background'
  });
  
  // Step 4: Monitor finality in background (optional)
  setImmediate(async () => {
    // Transaction already submitted, merchant already delivering
    // This is just for logging/webhook notification
    logger.info('Finality monitoring', { digest });
    
    // In production: Poll for finality status or use websocket
    // await notifyMerchantFinality(invoiceId, digest);
  });
}
```

---

#### Mode 2: Wait-for-Finality (Recommended for High-Value/Security)

**Business Model:**

```
ZERO RISK: Wait for on-chain confirmation before merchant delivers
```

**Flow:**

1. User signs PTB → POST to facilitator
2. Facilitator submits to SUI network
3. **BLOCK until transaction finalized** (~500ms testnet)
4. Extract receipt event from confirmed transaction
5. Return digest + receipt to merchant
6. Merchant delivers content **AFTER confirmation**

**Pros:**

- ✅ **Zero risk:** Transaction confirmed before delivery
- ✅ **No facilitator liability:** Settlement already succeeded
- ✅ **Simpler:** No retry/polling/compensation logic
- ✅ **Guaranteed receipt:** Merchant gets immediate proof

**Cons:**

- ⚠️ **Slower UX:** User waits ~700ms on payment page
- ⚠️ **Perceived latency:** Feels slower (even if total time similar)
- ⚠️ **Less competitive:** Loses UX edge vs traditional processors

**Latency Breakdown:**

```
CLIENT TIMELINE:
[0ms]    → User clicks "Pay"
[5ms]    → Sign with zkLogin
[10ms]   → POST to facilitator
[50ms]   → Facilitator submits to SUI
[500ms]  ← Transaction finalized (BLOCKING)
[700ms]  ← HTTP response with digest + receipt
[710ms]  → Redirect to merchant
[720ms]  ← Content delivered ✅ (but user waited 700ms)
```

**Response Format:**

```json
{
  "success": true,
  "mode": "wait",
  "digest": "AbCd1234...",
  "receipt": {
    "paymentId": "pmt_abc123",
    "buyer": "0xbuyer...",
    "merchant": "0xmerch...",
    "amount": "100000",
    "timestamp": 1738396800000
  },
  "status": "confirmed",
  "submitLatency": "500ms",
  "httpLatency": "700ms"
}
```

**Implementation:**

```typescript
// facilitator/src/controllers/submit-payment.ts (wait mode)
async function submitPaymentWait(req, res) {
  // Submit and WAIT for finality (blocking)
  const result = await client.executeTransaction({
    transaction: txBytes,
    signatures: [signature],
    options: {
      showEffects: true,
      showEvents: true,
      showObjectChanges: true,
    },
  });

  // Extract digest and receipt (guaranteed to exist)
  const digest = result.Transaction.digest;
  const receiptEvent = result.events.find((e) =>
    e.type.includes("PaymentSettled")
  );

  // Return confirmed receipt to merchant (no async waiting needed)
  res.json({
    success: true,
    mode: "wait",
    digest,
    receipt: receiptEvent?.parsedJson,
    status: "confirmed",
  });
}
```

---

#### Comparison Table

| Aspect                    | TRUE Optimistic                    | Wait-for-Finality         |
| ------------------------- | ---------------------------------- | ------------------------- |
| **User Latency**          | ~50ms ✅✅                         | ~700ms ⚠️                 |
| **Merchant Delivery**     | Immediate (before settlement) ✅   | After confirmation ⚠️     |
| **Facilitator Risk**      | HIGH (must pay if fails) ⚠️        | ZERO (already settled) ✅ |
| **Capital Requirements**  | Reserve pool needed ⚠️             | None ✅                   |
| **Pre-validation**        | Critical (balance, sig, PTB) ⚠️    | Optional ✅               |
| **Merchant Complexity**   | Webhook for digest notification ⚠️ | Immediate receipt ✅      |
| **Competitive Advantage** | Stripe-like instant UX ✅          | Standard crypto UX ⚠️     |
| **Best For**              | Low-value, high-volume ✅          | High-value, low-risk ✅   |

---

#### Recommendation: **Risk-Based Hybrid**

**For Hackathon Demo:**

1. **Implement BOTH modes** (toggle in UI)
2. **Show latency comparison** (50ms vs 700ms)
3. **Default to TRUE Optimistic** (best UX showcase)
4. **Document facilitator guarantee model** (judges see innovation)

**Post-Hackathon Production:**

```typescript
// Risk-based settlement mode selection
function selectSettlementMode(amount: number, buyerReputation: number) {
  if (amount < 10_00000 && buyerReputation > 0.8) {
    return "optimistic"; // <$10, trusted buyer
  } else if (amount < 100_000000) {
    return "wait"; // <$100, wait for safety
  } else {
    return "escrow"; // >$100, multi-sig escrow
  }
}
```

**Facilitator Economics:**

- **Reserve Pool:** 10-20% of daily volume (for failed settlements)
- **Insurance:** Optional crypto insurance for large merchants
- **Monitoring:** Real-time settlement success rate tracking
- **Adjustment:** Dynamic risk thresholds based on network conditions

---

#### Step 10: Receipt Event Emitted

**On-chain event structure:**

```rust
// payment.move
struct ReceiptEmitted has copy, drop {
    payment_id: vector<u8>,
    invoice_hash: vector<u8>,
    buyer: address,
    merchant: address,
    amount: u64,
    asset_type: TypeName,
    timestamp: u64
}
```

**Indexed by SUI:**

- Merchants can query by payment_id
- Buyers can query by their address
- Full audit trail

#### Step 11: Return to Merchant

Browser redirects to `callback_url`:

```
https://api.merchant.com/verify?payment_id=pmt_abc123&tx_digest=AbCd1234...
```

#### Step 12: Merchant Verifies Receipt

```typescript
// merchant backend
async function verifyPayment(paymentId: string, txDigest: string) {
  // Fetch tx from SUI
  const tx = await suiClient.getTransaction({ digest: txDigest });

  // Check: tx succeeded
  if (tx.effects.status.status !== "success") {
    throw new Error("Transaction failed");
  }

  // Find receipt event
  const receipt = tx.events.find(
    (e) =>
      e.type.includes("ReceiptEmitted") && e.parsedJson.payment_id === paymentId
  );

  if (!receipt) {
    throw new Error("Receipt not found");
  }

  // Verify invoice hash
  const storedInvoice = await db.getInvoice(paymentId);
  const expectedHash = sha256(storedInvoice.jwt);

  if (receipt.parsedJson.invoice_hash !== expectedHash) {
    throw new Error("Invoice hash mismatch - possible fraud");
  }

  // Verify amount and recipient
  if (
    receipt.parsedJson.amount !== storedInvoice.amount ||
    receipt.parsedJson.merchant !== ourAddress
  ) {
    throw new Error("Payment details mismatch");
  }

  // Mark as paid
  await db.markPaid(paymentId, txDigest);

  return { verified: true };
}
```

#### Step 13: Content Delivered

```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "premium_data": "..."
}
```

---

## Component Specifications

### 1. Move Smart Contract

**File:** `move/payment/sources/payment.move`

**Entry Function:**

```rust
public entry fun settle_payment<T>(
    payment_coin: Coin<T>,
    merchant: address,
    payment_id: vector<u8>,
    invoice_hash: vector<u8>,
    buyer: address,
    clock: &Clock,
    ctx: &mut TxContext
) {
    // Transfer coin to merchant
    transfer::public_transfer(payment_coin, merchant);

    // Emit receipt event
    event::emit(ReceiptEmitted {
        payment_id,
        invoice_hash,
        buyer,
        merchant,
        amount: coin::value(&payment_coin),
        asset_type: type_name::get<T>(),
        timestamp: clock::timestamp_ms(clock)
    });
}
```

**Key Features:**

- Generic `Coin<T>` (works with any token: USDC, SUI, etc.)
- Receipt emission (audit trail)
- Clock for timestamp (deterministic)
- No state storage (ephemeral receipts)

**Tests:**

- 13 unit tests (all passing)
- Covers: settlement, events, edge cases

### 2. Facilitator Backend

**Tech Stack:**

- Node.js 20+
- Express 5
- TypeScript (strict mode)
- `@mysten/sui` (SuiGrpcClient)
- Enoki SDK (zkLogin)

**API Endpoints:**

```typescript
// GET /health
// Returns: network status, facilitator address, gas price
{
  "status": "ok",
  "network": "testnet",
  "facilitator": "0xfacil...",
  "gasPrice": 1000,
  "timestamp": 1738396800000
}

// POST /check-balance
// Input: { address, network }
// Returns: USDC balance and coin objects
{
  "balance": "1000000",
  "coinType": "0xa1ec...::usdc::USDC",
  "coins": [
    { "objectId": "0xobj1...", "balance": "500000" },
    { "objectId": "0xobj2...", "balance": "500000" }
  ],
  "coinCount": 2
}

// POST /settle-payment
// Input: { buyerAddress, amount, merchant, payment_id, invoiceJwt }
// Returns: PTB bytes for buyer to sign
{
  "ptbBytes": "base64_encoded_bytes",
  "summary": {
    "amount": "100000",
    "recipient": "0xmerch...",
    "invoiceHash": "0xabcd..."
  }
}

// POST /submit-signature
// Input: { ptbBytes, signature, zkProof, ephemeralPublicKey }
// Returns: tx digest and receipt
{
  "txDigest": "AbCd1234...",
  "receipt": {
    "payment_id": "pmt_abc123",
    "invoice_hash": "0xabcd...",
    "buyer": "0xbuyer...",
    "merchant": "0xmerch...",
    "amount": "100000",
    "timestamp": 1738396800000
  }
}

// POST /fund (demo only)
// Input: { address, sessionId }
// Returns: faucet tx digest
{
  "txDigest": "FaucetTx123...",
  "amount": "1000000"
}
```

**Gas Sponsorship:**

```typescript
// Facilitator pays SUI gas for all transactions
// Buyer only needs USDC for payments
ptb.setSender(facilitatorAddress);
ptb.setGasPayment(facilitatorGasCoins);
```

**Configuration (`.env`):**

```bash
PORT=3001
SUI_NETWORK=testnet
PACKAGE_ID=0xpkg...
FACILITATOR_PRIVATE_KEY=suiprivkey1...
FACILITATOR_FEE=10000  # 0.01 USDC
```

### 3. Payment Page (Widget Simplified)

**Tech Stack:**

- React 18
- TypeScript
- Enoki SDK
- @mysten/sui (PTB parsing)

**Key Components:**

```typescript
// PaymentPage.tsx
export function PaymentPage({ invoiceJwt, callbackUrl }) {
  const [session, setSession] = useState<zkLoginSession | null>(null);
  const [balance, setBalance] = useState<string>("0");
  const [ptb, setPtb] = useState<PTBData | null>(null);
  const [verification, setVerification] = useState<VerificationResult | null>(
    null
  );

  // 1. zkLogin session
  async function handleSignIn() {
    const session = await enokiClient.createSession({ provider: "google" });
    setSession(session);
    checkBalance(session.address);
  }

  // 2. Check balance
  async function checkBalance(address: string) {
    const resp = await fetch("/check-balance", {
      method: "POST",
      body: JSON.stringify({ address, network: "testnet" }),
    });
    const data = await resp.json();
    setBalance(data.balance);
  }

  // 3. Request PTB
  async function handlePay() {
    const resp = await fetch("/settle-payment", {
      method: "POST",
      body: JSON.stringify({
        buyerAddress: session.address,
        invoiceJwt,
      }),
    });
    const data = await resp.json();
    setPtb(data);

    // 4. Verify PTB
    const result = verifyPaymentPTB(
      base64Decode(data.ptbBytes),
      parseInvoiceJwt(invoiceJwt)
    );
    setVerification(result);
  }

  // 5. Sign and submit
  async function handleSign() {
    if (!verification.pass) {
      alert("Verification failed!");
      return;
    }

    const signature = await enokiClient.signTransaction(ptb.ptbBytes);

    const resp = await fetch("/submit-signature", {
      method: "POST",
      body: JSON.stringify({ ...signature }),
    });
    const { txDigest } = await resp.json();

    // 6. Return to merchant
    window.location.href = `${callbackUrl}?tx_digest=${txDigest}`;
  }

  return (
    <div>
      {!session && <button onClick={handleSignIn}>Sign in with Google</button>}
      {session && balance === "0" && (
        <button onClick={handleFund}>Fund (demo)</button>
      )}
      {session && balance > "0" && !ptb && (
        <button onClick={handlePay}>Pay</button>
      )}
      {ptb && verification && (
        <div>
          <InvoiceSummary invoice={parseInvoiceJwt(invoiceJwt)} />
          <VerificationDisplay result={verification} />
          <button onClick={handleSign} disabled={!verification.pass}>
            {verification.pass ? "Sign and Pay" : "Verification Failed"}
          </button>
        </div>
      )}
    </div>
  );
}
```

**Verifier (CRITICAL):**
See "PTB Template and Verification" section below.

### 4. Demo Merchant

**Simple 402 server:**

```typescript
// demo/merchant-server.ts
app.get("/premium-data", async (req, res) => {
  // Check if paid
  const paymentId = req.query.payment_id;
  if (paymentId && (await verifyPayment(paymentId))) {
    return res.json({ data: "Premium content here" });
  }

  // Not paid, return 402
  const invoice = createInvoiceJwt({
    payment_id: generateId(),
    amount: "100000", // 0.1 USDC
    assetType: USDC_TYPE,
    merchantRecipient: MERCHANT_ADDRESS,
    resource: "/premium-data",
    exp: Date.now() + 600000, // 10 min
  });

  const invoiceJwt = signJwt(invoice, merchantPrivateKey);

  res.status(402).json({
    error: "Payment required",
    facilitator_url: "https://pay402.io/pay",
    callback_url: "https://api.merchant.com/verify",
  });
  res.setHeader("X-X402-Invoice-JWT", invoiceJwt);
});
```

---

## PTB Template and Verification

### Allowed PTB Commands (Strict)

**Only these commands are permitted:**

1. **MergeCoins** (USDC only)

   - Purpose: Consolidate buyer's USDC coins
   - Constraint: All coins must be owned by buyer

2. **SplitCoins** (USDC only)

   - Purpose: Create exact payment amount
   - Constraint: Split amount must match invoice

3. **TransferObjects**

   - Purpose: Send payment coin to merchant
   - Constraint: Only payment coin to merchant, change back to buyer

4. **MoveCall** (only to `payment::emit_receipt`)
   - Purpose: Emit receipt event
   - Constraint: Args must match invoice (payment_id, invoice_hash, etc.)

**Any other command → REJECT**

### Required Invariants

Given invoice `(payment_id, amount, assetType, merchantRecipient, invoiceHash)`:

1. **Asset Type Match**

   - All coin operations use `assetType` from invoice
   - No operations on other coin types

2. **Exact Payment**

   - Exactly one transfer of `amount` to `merchantRecipient`
   - Amount must be exact (not approximate)

3. **No Unauthorized Transfers**

   - No transfers to addresses other than:
     - `merchantRecipient` (payment)
     - `buyerAddress` (change)

4. **Receipt Emission**

   - Exactly one `MoveCall` to `payment::emit_receipt`
   - Arguments:
     - `payment_id` matches invoice
     - `invoice_hash` matches `H(invoiceJwt)`
     - `buyer`, `merchant`, `amount`, `assetType` match

5. **Expiry (client-side)**
   - Current time < invoice expiry
   - (Optional: on-chain enforcement in future)

### Verifier Implementation

**Reference implementation:** `widget/src/verifier.ts`

**Test vectors:**

```typescript
// PASS: Valid payment PTB
const validPTB = {
  commands: [
    { type: 'SplitCoins', coinType: USDC, amount: '100000' },
    { type: 'TransferObjects', recipient: '0xmerch...', amount: '100000' },
    { type: 'MoveCall', function: 'emit_receipt', args: { payment_id: 'pmt_123', invoice_hash: '0xabc...' } }
  ]
};
verifyPaymentPTB(validPTB, invoice) // → { pass: true }

// FAIL: Wrong amount
const wrongAmountPTB = {
  commands: [
    { type: 'SplitCoins', coinType: USDC, amount: '1000000' },  // 10x too much!
    ...
  ]
};
verifyPaymentPTB(wrongAmountPTB, invoice) // → { pass: false, reason: 'Amount mismatch' }

// FAIL: Extra transfer
const extraTransferPTB = {
  commands: [
    { type: 'SplitCoins', coinType: USDC, amount: '100000' },
    { type: 'TransferObjects', recipient: '0xmerch...', amount: '100000' },
    { type: 'TransferObjects', recipient: '0xattacker...', amount: '50000' },  // ❌ Unauthorized!
    ...
  ]
};
verifyPaymentPTB(extraTransferPTB, invoice) // → { pass: false, reason: 'Unauthorized transfer' }
```

### Facilitator Coin Selection

**Facilitator can:**

- Query buyer's USDC coins
- Select which coins to use as inputs
- Merge coins if needed for sufficient balance

**Buyer verifier ensures:**

- All selected coins are owned by buyer
- Merge operations are USDC-only
- Final payment amount is exact
- No unexpected outflows

This design supports efficient coin management while preventing facilitator abuse.

---

## Receipt Design

### On-Chain Event (R1 - Chosen for Hackathon)

**Event Structure:**

```rust
struct ReceiptEmitted has copy, drop {
    payment_id: vector<u8>,        // Unique per payment
    invoice_hash: vector<u8>,      // H(invoiceJwt) - audit trail
    buyer: address,                // Who paid
    merchant: address,             // Who received
    amount: u64,                   // Payment amount (microUSDC)
    asset_type: TypeName,          // e.g., Coin<USDC>
    timestamp: u64                 // Unix ms (from Clock)
}
```

**Why Event (not object):**

- ✅ Simple merchant audit (query by payment_id)
- ✅ Low gas cost (events cheaper than objects)
- ✅ Automatic indexing (SUI RPC events API)
- ✅ Permanent audit trail
- ❌ Slightly more indexable (privacy trade-off accepted for hackathon)

**Config Flag:**

```typescript
// config.ts
export const ENABLE_RECEIPT_EVENTS = process.env.ENABLE_RECEIPTS !== 'false';

// In PTB construction
if (ENABLE_RECEIPT_EVENTS) {
  ptb.moveCall({ target: '...::payment::emit_receipt', ... });
}
```

**Post-Hackathon Options:**

- Add optional object-based receipts (R3)
- Implement privacy-preserving receipt ZK proofs
- See `DESIGN_RATIONALE.md` for full comparison

### Invoice Hash Computation

```typescript
function computeInvoiceHash(invoiceJwt: string): Uint8Array {
  const bytes = new TextEncoder().encode(invoiceJwt);
  return sha256(bytes);
}
```

**Why mandatory:**

- Prevents "he said/she said" disputes
- Merchant can prove exact terms
- On-chain commitment to off-chain invoice
- Improves over EIP-3009 (no hash there)

---

## Security Model

### Trust Boundaries

#### Tier 1 (Hackathon)

**Buyer trusts:**

- ✅ Facilitator service availability (uptime)
- ✅ Facilitator gas sponsorship (pays SUI fees)
- ⚠️ Facilitator web page code (verifier runs here)

**Buyer does NOT trust:**

- ❌ Facilitator to alter invoice terms (prevented by merchant JWT)
- ❌ Facilitator to overcharge (prevented by verifier checking exact amount)
- ❌ Facilitator to sign without buyer approval (buyer signs PTB)

**Merchant trusts:**

- ✅ SUI blockchain finality
- ✅ On-chain receipt events

**Merchant does NOT trust:**

- ❌ Buyer to pay without on-chain settlement
- ❌ Facilitator to attest payment without on-chain proof

**Key Property:**

> Facilitator cannot spend buyer funds without buyer signature over exact PTB bytes.

#### Tier 2 (Production Hardening - Post-Hackathon)

**Upgrade Path:**
Move verifier to buyer-controlled extension.

**Buyer trusts:**

- ✅ Browser extension they installed (from audited source)
- ✅ Extension marketplace review process

**Buyer does NOT trust:**

- ❌ Facilitator web page (extension verifies independently)

**Protocol unchanged:**
Same invoice JWT, same PTB format, same on-chain settlement.

**Messaging to Judges:**

> "Today, the verifier runs in our web app. In production, the same verifier logic ships as a browser extension, moving trust to the buyer. No protocol changes needed."

### Attack Vectors and Mitigations

| Attack                                    | Mitigation                                     |
| ----------------------------------------- | ---------------------------------------------- |
| **Facilitator overcharges buyer**         | Verifier checks exact amount from PTB bytes    |
| **Facilitator alters invoice**            | Invoice signed by merchant (JWT)               |
| **Facilitator submits without signature** | Blockchain rejects (signature required)        |
| **Merchant falsely claims non-payment**   | Receipt event on-chain (immutable)             |
| **Buyer double-spends coin**              | SUI Move object ownership (atomic)             |
| **Replay attack (reuse signature)**       | Nonce in PTB (SUI sequence number)             |
| **Address enumeration**                   | Salt service (Enoki) prevents                  |
| **Loss of funds on browser clear**        | Salt persistence (Enoki), same address derived |

### Gas Sponsorship Security

**Facilitator sponsors gas:**

```typescript
ptb.setSender(facilitatorAddress);
ptb.setGasPayment(facilitatorGasCoins);
```

**Constraints:**

- Facilitator pays SUI for gas
- Buyer pays USDC for payment
- Facilitator cannot redirect buyer's USDC (verifier prevents)
- Buyer cannot redirect facilitator's SUI (Move prevents)

**Economic Attack:**
What if buyer signs malicious PTB that drains facilitator gas?

**Mitigation:**

- Gas budget capped per tx (max ~0.1 SUI)
- Facilitator can rate-limit by address
- Verifier prevents complex PTBs (only template commands)

---

## Demo Requirements

### Demo Script (90 Seconds)

**Setup (pre-demo):**

- Merchant server running
- Facilitator backend running
- Payment page deployed
- Demo faucet funded

**Live Demo:**

**[0:00-0:15] Problem Setup**

- "Here's a premium API endpoint that costs $0.10 per request."
- Browser: `GET /premium-data` → 402 Payment Required
- "Traditional crypto: install wallet, buy crypto, manage keys. Too much friction."

**[0:15-0:30] zkLogin (No Wallet)**

- Click "Sign in with Google"
- Show Google OAuth popup → auto-close
- "Now I have a blockchain address, no wallet installed."
- Show: Address, Balance (0 USDC)

**[0:30-0:45] Funding (First Payment)**

- Click "Fund (demo faucet)"
- Show: TX digest, Balance (1.0 USDC)
- "In production, this is a credit card onramp."

**[0:45-1:00] Payment with Verification**

- Click "Pay 0.1 USDC"
- Show invoice terms (from merchant JWT)
- Show PTB verification results:
  - ✅ Template check: PASS
  - ✅ Amount: 0.1 USDC (exact)
  - ✅ Recipient: merchant.com
  - ✅ No unauthorized transfers
- Click "Sign and Pay"

**[1:00-1:15] Merchant Verification**

- Browser redirects to merchant
- Merchant shows "Verifying payment..."
- Show receipt event on-chain (payment_id, invoice_hash, amounts)
- Content delivered: "Here's your premium data"

**[1:15-1:30] Second Payment (Persistence)**

- "Now let's pay again to show persistence."
- Request same endpoint → 402
- Pay page: Balance 0.9 USDC (no funding needed!)
- Pay → Complete
- "Same address, same balance, no re-setup."

**Optional: Attack Demo (Nice-to-Have)**

- Toggle "malicious facilitator" mode
- PTB shows amount 10x higher
- Verifier: ❌ Amount mismatch
- "Buyer protected even if facilitator is malicious."

### Metrics to Highlight

- **User Clicks:** 3 (Sign in, Fund, Pay)
- **Wallet Installation:** 0
- **Seed Phrases:** 0
- **Gas Paid by Buyer:** 0 SUI
- **Time to First Payment:** <60 seconds
- **Time to Second Payment:** <10 seconds (no funding)

---

## Technical Constraints

### Hackathon Time Budget

**Total:** 48 hours (2 days)

**Breakdown:**

- Move contract: ✅ Complete (13/13 tests passing)
- Facilitator backend: ✅ Complete (3 endpoints working)
- Payment page: 16 hours (zkLogin + verifier + UI)
- Demo merchant: 4 hours (simple 402 server)
- Integration testing: 8 hours
- Demo prep: 4 hours
- Buffer: 8 hours

### Network: Testnet/Devnet Only

- **No mainnet** for hackathon
- Testnet USDC available (limited)
- Devnet USDC unlimited (faucet)
- Facilitator gas (SUI) pre-funded

### Dependencies

**Required:**

- Enoki SDK (zkLogin)
- @mysten/sui (v2.1.0+)
- SUI testnet/devnet RPC

**Optional (deferred):**

- CCTP (cross-chain)
- Privacy ZK proofs
- Wallet Standard integration

### Browser Compatibility

**Target:**

- Chrome/Edge (primary)
- Firefox (secondary)
- Safari (if time permits)

**Required APIs:**

- Fetch API
- Web Crypto API (SHA-256)
- LocalStorage (session caching)

---

## Deployment & Routes Strategy

### Evolution: Localhost → Testnet → Deployed

#### Phase 1: Local Development (Day 1-2)

**All on localhost, different ports:**

```
┌─────────────────────────────────────────────────┐
│ Developer Machine (WSL2 + Suibase)              │
├─────────────────────────────────────────────────┤
│                                                 │
│ Suibase Localnet                                │
│  └─ RPC: http://localhost:9000                  │
│     (or :44340 via proxy)                       │
│                                                 │
│ Demo Merchant (Express)                         │
│  └─ http://localhost:3000                       │
│     ├─ GET / (demo page with "Get Data" button)│
│     ├─ GET /api/premium-data (402 response)     │
│     └─ GET /api/verify?payment_id=... (callback)│
│                                                 │
│ Facilitator Backend (Express)                   │
│  └─ http://localhost:3001                       │
│     ├─ GET /health                              │
│     ├─ POST /check-balance                      │
│     ├─ POST /settle-payment                     │
│     ├─ POST /submit-signature                   │
│     └─ POST /fund (demo faucet)                 │
│                                                 │
│ Payment Page (React + Vite)                     │
│  └─ http://localhost:5173                       │
│     └─ Renders at /?invoice_jwt=...&callback=...│
│                                                 │
└─────────────────────────────────────────────────┘

tmux layout (recommended):
- Pane 1: Facilitator (npm run dev)
- Pane 2: Demo merchant (npm run dev)
- Pane 3: Payment page (npm run dev)
- Pane 4: Suibase (localnet status, lsui commands)
```

**Configuration:**

```bash
# facilitator/.env.local
SUI_NETWORK=localnet
PACKAGE_ID=0x...local
FACILITATOR_PRIVATE_KEY=suiprivkey1...
MERCHANT_DEMO_URL=http://localhost:3000
PAYMENT_PAGE_URL=http://localhost:5173

# demo-merchant/.env.local
PORT=3000
FACILITATOR_URL=http://localhost:3001
MERCHANT_PRIVATE_KEY=suiprivkey1...
MERCHANT_ADDRESS=0x...

# widget/.env.local (Vite)
VITE_FACILITATOR_URL=http://localhost:3001
```

**Flow test:**

1. Open http://localhost:3000 in browser
2. Click "Get Data ($0.01)"
3. Browser redirects to http://localhost:5173?invoice_jwt=...&callback=http://localhost:3000/api/verify
4. Payment page calls http://localhost:3001/\* (facilitator)
5. After payment, redirects to http://localhost:3000/api/verify?payment_id=...&tx_digest=...
6. Merchant verifies, displays content

#### Phase 2: Testnet Testing (Day 3)

**Same localhost ports, switch to testnet blockchain:**

```
Change:
- Suibase: localnet → SUI testnet RPC
- Facilitator: SUI_NETWORK=testnet, PACKAGE_ID=0x...testnet
- Rest unchanged (still localhost)
```

**Commands:**

```bash
# Deploy to testnet
cd move/payment
tsui client publish --gas-budget 100000000

# Update facilitator config
cd ../../facilitator
cp .env.testnet .env  # or update SUI_NETWORK, PACKAGE_ID

# Restart
npm run dev
```

#### Phase 3: Demo Deployment (Day 4 - Hackathon)

**All on pay402.io domain (or pay402.vercel.app):**

```
┌─────────────────────────────────────────────────┐
│ pay402.io (or pay402.vercel.app)                │
├─────────────────────────────────────────────────┤
│                                                 │
│ SUI Testnet (Mysten)                            │
│  └─ https://fullnode.testnet.sui.io:443         │
│                                                 │
│ https://pay402.io (or pay402.vercel.app)        │
│  ├─ / (landing page)                            │
│  ├─ /demo (merchant demo page)                  │
│  ├─ /demo/api/premium-data (402 endpoint)       │
│  ├─ /demo/api/verify (callback)                 │
│  ├─ /pay (payment page React SPA)               │
│  └─ /api/* (facilitator APIs)                   │
│      ├─ /api/health                             │
│      ├─ /api/check-balance                      │
│      ├─ /api/settle-payment                     │
│      ├─ /api/submit-signature                   │
│      └─ /api/fund                               │
│                                                 │
└─────────────────────────────────────────────────┘

Vercel deployment (single project):
- demo/* → demo merchant (static + API routes)
- pay → payment page (React SPA)
- api/* → facilitator backend (serverless functions)
```

**Directory structure for Vercel:**

```
Pay402/
├── demo/                    # Merchant demo
│   ├── public/
│   │   └── index.html       # Demo page
│   └── api/
│       ├── premium-data.ts  # Vercel serverless
│       └── verify.ts        # Vercel serverless
│
├── widget/                  # Payment page
│   └── dist/                # Built React app
│       └── index.html       # Deployed to /pay
│
└── facilitator/             # Facilitator backend
    └── api/                 # Vercel serverless functions
        ├── health.ts
        ├── check-balance.ts
        ├── settle-payment.ts
        ├── submit-signature.ts
        └── fund.ts
```

**Configuration:**

```bash
# .env.production (Vercel environment variables)
SUI_NETWORK=testnet
PACKAGE_ID=0x...testnet
FACILITATOR_PRIVATE_KEY=suiprivkey1...
MERCHANT_DEMO_URL=https://pay402.io/demo
PAYMENT_PAGE_URL=https://pay402.io/pay
```

**Vercel setup:**

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod

# Set environment variables
vercel env add FACILITATOR_PRIVATE_KEY
vercel env add PACKAGE_ID
vercel env add SUI_NETWORK
```

**Alternative (separate subdomains):**

```
https://demo.pay402.io    → merchant demo
https://pay.pay402.io     → payment page
https://api.pay402.io     → facilitator backend
```

### URL Structure Summary

| Phase            | Merchant       | Payment Page  | Facilitator   | Blockchain                |
| ---------------- | -------------- | ------------- | ------------- | ------------------------- |
| **Local**        | :3000          | :5173         | :3001         | localhost:9000 (localnet) |
| **Testnet Test** | :3000          | :5173         | :3001         | testnet.sui.io (testnet)  |
| **Deployed**     | pay402.io/demo | pay402.io/pay | pay402.io/api | testnet.sui.io (testnet)  |

### CORS Configuration

**Local development:** No CORS issues (all localhost)

**Deployed:** Need CORS headers on facilitator

```typescript
// facilitator/src/index.ts
app.use(
  cors({
    origin: [
      "https://pay402.io",
      "https://pay402.vercel.app",
      "http://localhost:5173", // Dev
      "http://localhost:3000", // Dev
    ],
    credentials: true,
  })
);
```

### Environment Detection

```typescript
// shared/config.ts
export const ENV = {
  isDev: process.env.NODE_ENV === "development",
  facilitatorUrl: process.env.FACILITATOR_URL || "http://localhost:3001",
  paymentPageUrl: process.env.PAYMENT_PAGE_URL || "http://localhost:5173",
  merchantUrl: process.env.MERCHANT_URL || "http://localhost:3000",
};
```

---

## Out of Scope (Explicitly Deferred)

### Post-Hackathon Features

❌ **Full Embedded Widget**

- Hackathon: Payment page only (standalone URL)
- Post: Widget embedded in merchant pages (like Stripe.js)

❌ **Browser Extension (Tier 2 Verifier)**

- Hackathon: Verifier in web page (Tier 1)
- Post: Extension for buyer-controlled verification

❌ **Cross-Chain (CCTP)**

- Hackathon: SUI-only
- Post: Bridge USDC from Ethereum/Base/Solana

❌ **Privacy Enhancements**

- Hackathon: Public receipts
- Post: ZK receipt proofs, coin mixing

❌ **On-Chain `pay_exact` Function**

- Hackathon: Template verification in client
- Post: Simplify with single Move entrypoint

❌ **Production Onramps**

- Hackathon: Demo faucet
- Post: Credit card, bank transfer, Circle USDC faucet

❌ **Multi-Merchant Routing**

- Hackathon: One facilitator, any merchant
- Post: Facilitator marketplace, routing

❌ **Agentic Payments (AI Agents)**

- Hackathon: Human buyers only
- Post: API keys for AI agents

### Assumptions

✅ **Accepted for Hackathon:**

- Buyer trusts facilitator web page (Tier 1)
- Public receipt events (no privacy)
- Testnet/devnet only (no mainnet)
- Demo funding (no real onramps)
- Single facilitator (no marketplace)

---

## Conclusion

This specification is **locked and ready for implementation**.

**Next Steps:**

1. Implement payment page (React + Enoki + verifier)
2. Implement demo merchant (simple 402 server)
3. Integration testing (end-to-end flow)
4. Demo preparation (script, slides)

**Questions?** Check `DESIGN_RATIONALE.md` for trade-offs and alternatives.

**Development?** See `DEVELOPMENT_GUIDE.md` for tooling and practices.

**Last Updated:** February 1, 2026  
**Version:** 2.0 (Post-ChatGPT Refinement)
