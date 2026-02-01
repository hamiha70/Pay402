# Pay402 - Design Rationale and Trade-offs

**Project:** Pay402 (x402 Payment Protocol on SUI)  
**Purpose:** Document architectural decisions, alternatives considered, and future extensions  
**Date:** February 1, 2026  
**Status:** Reference Document (Not Implementation Spec)

---

## Document Purpose

This document explains **why** we made specific design choices for Pay402. It captures:
- Trade-offs we evaluated
- Alternatives we considered
- Justifications for our choices
- Future extension ideas (deferred from hackathon)

**For Implementation:** See `ARCHITECTURE.md`  
**For Development:** See `DEVELOPMENT_GUIDE.md`

---

## Table of Contents

1. [Custody Model: Escrow vs Non-Escrow](#custody-model)
2. [Receipt Design: Event vs Object vs Ephemeral](#receipt-design)
3. [Verification Tiers: Web Page vs Extension](#verification-tiers)
4. [Transaction Submission: Buyer vs Facilitator](#transaction-submission)
5. [Salt Management: DIY vs Enoki](#salt-management)
6. [On-Chain Constraints: Template vs pay_exact()](#on-chain-constraints)
7. [Session Persistence: Nonce vs Salt](#session-persistence)
8. [Future Extensions](#future-extensions)

---

## Custody Model

### The Question

**Should buyer funds be:**
- **Option A:** Self-custodied at zkLogin address (non-escrow)
- **Option B:** Pooled in facilitator-controlled escrow contract

### Trade-Off Matrix

| Aspect | Non-Escrow (A) | Escrow (B) |
|--------|----------------|------------|
| **Trust Model** | Buyer owns funds on-chain | Facilitator has custody |
| **Web3 Narrative** | ✅ True self-custody | ⚠️ "Delegated Web2 service" |
| **Complexity** | Higher (coin management, PTB verification) | Lower (internal accounting) |
| **Privacy** | Public coin ownership | ✅ Pooled (harder to track) |
| **Recovery** | ✅ Same address always (salt-based) | Requires withdrawal mechanism |
| **Gas Costs** | Per-payment settlement | ✅ Batched (cheaper) |
| **Dispute Resolution** | On-chain proof (coin transfers) | Requires facilitator logs |
| **Vendor Agnostic** | ✅ Same balance across merchants | Facilitator-locked |

### Our Choice: Non-Escrow (Option A)

**Primary Reasons:**
1. **Trust Boundary:** We want "Web3 trust" not "Web2 custodial service"
   - Facilitator cannot spend without buyer signature
   - Funds always at buyer address
   - No withdrawal process needed

2. **Narrative Strength:** Clear story for hackathon judges
   - "Buyer owns their money, facilitator just helps transact"
   - Distinguishes from traditional payment processors

3. **Alignment with Goals:**
   - Buyer priority: No wallet, no gas, no friction ✅
   - High priority: Web3 trust boundary (not delegated service) ✅
   - Lower priority for hackathon: Privacy (deferred)

**Accepted Trade-offs:**
- ⚠️ More complex PTB verification needed
- ⚠️ Higher gas per tx (individual settlement)
- ⚠️ More coin management UX (handled by facilitator server-side)

**When Escrow Makes Sense:**
- Privacy is highest priority
- Batched settlements needed (high volume)
- Trust in facilitator is acceptable
- We may offer escrow as **Option** post-hackathon

**Key Insight:**
> Non-escrow with Tier 2 verifier (extension) gives us strongest trust story while maintaining UX simplicity.

---

## Receipt Design

### The Question

**How should payment receipts be recorded on-chain?**

### Three Options Evaluated

#### Option R1: Emit On-Chain Event (Chosen)

**Design:**
```rust
event::emit(ReceiptEmitted {
    payment_id,
    invoice_hash,
    buyer,
    merchant,
    amount,
    asset_type,
    timestamp
});
```

**Pros:**
- ✅ Simple merchant audit (query events by payment_id)
- ✅ Low gas cost (~1000 gas units)
- ✅ Automatic indexing (SUI RPC events API)
- ✅ Permanent audit trail (events immutable)
- ✅ Easy demo visualization

**Cons:**
- ⚠️ More indexable (privacy trade-off)
- ⚠️ Requires event indexer for complex queries

**Gas Cost:** ~0.001 SUI per emit

#### Option R2: No Receipt (Infer from Transfer)

**Design:**
```rust
// Just transfer coin, no event
transfer::public_transfer(payment_coin, merchant);
```

**Pros:**
- ✅ Lowest gas cost (no emit)
- ✅ Less metadata leakage (privacy)

**Cons:**
- ❌ Harder merchant reconciliation (scan all transfers)
- ❌ No payment_id binding on-chain
- ❌ Can't prove invoice terms
- ❌ Demo less clear (no visible receipt)

**Use Case:** Privacy-first scenarios where merchants trust facilitator attestation off-chain

#### Option R3: Object-Based Receipt (Deferred)

**Design:**
```rust
struct Receipt has key, store {
    id: UID,
    payment_id: vector<u8>,
    invoice_hash: vector<u8>,
    buyer: address,
    merchant: address,
    amount: u64,
    asset_type: TypeName,
    timestamp: u64
}

// Create and transfer to merchant
let receipt = Receipt { ... };
transfer::public_transfer(receipt, merchant);
```

**Pros:**
- ✅ Richer logic (can add nonces, one-time claims)
- ✅ Merchant can store/query owned receipts
- ✅ Can separate "proof" from "event"

**Cons:**
- ⚠️ Higher gas (object creation + storage)
- ⚠️ More Move code complexity
- ⚠️ Merchant must manage receipt objects

**Use Case:** Complex settlement flows (batch redemption, nonce-based payments)

### Our Choice: R1 (Emit Event)

**Reasons:**
1. **Hackathon Fit:**
   - Easy to demonstrate (show event in explorer)
   - Simple merchant integration (query by payment_id)
   - Clear audit trail for judges

2. **Gas Efficiency:**
   - Event emission is cheap
   - No ongoing storage costs

3. **Audit Trail:**
   - Invoice hash on-chain (improves over EIP-3009)
   - Can prove exact terms in disputes

4. **Flexibility:**
   - Config flag to disable events if needed
   - Can add object receipts later (R3) without breaking protocol

**Implementation:**
```typescript
// config.ts
export const ENABLE_RECEIPT_EVENTS = process.env.ENABLE_RECEIPTS !== 'false';

// payment.move
if (ENABLE_RECEIPT_EVENTS) {
  event::emit(ReceiptEmitted { ... });
}
```

**Future Path:**
- Post-hackathon: Add R3 (object receipts) as option
- Privacy-focused: Add ZK proofs of receipt (event hash committed, details hidden)

---

## Verification Tiers

### The Question

**Where should PTB template verification run?**

### Two-Tier Model

#### Tier 1: Facilitator Web Page (Hackathon)

**What:**
```
┌─────────────────────────────────┐
│  Facilitator-hosted web page    │
│  https://pay402.io/pay          │
│                                  │
│  ┌───────────────────────────┐  │
│  │ verifier.ts (runs here)   │  │
│  │ - Parses PTB bytes        │  │
│  │ - Checks template         │  │
│  │ - Validates invariants    │  │
│  └───────────────────────────┘  │
└─────────────────────────────────┘
```

**Trust Model:**
- Buyer trusts facilitator web page code
- Facilitator can (theoretically) serve modified page

**Why Acceptable for Hackathon:**
1. We control the facilitator (not a third party)
2. Demonstrates the architecture
3. Makes trust boundary explicit
4. Foundation for Tier 2

**What It Guarantees:**
- ✅ Prevents accidental/buggy PTBs from facilitator
- ✅ Buyer sees verification results before signing
- ✅ Demo shows verifier blocking malicious PTB
- ⚠️ Does NOT protect against malicious facilitator altering web page itself

#### Tier 2: Browser Extension (Production)

**What:**
```
┌─────────────────────────────────┐
│  Browser Extension               │
│  "Pay402 Verifier" (user-install│
│                                  │
│  ┌───────────────────────────┐  │
│  │ Same verifier.ts code     │  │
│  │ (buyer-controlled)        │  │
│  └───────────────────────────┘  │
└─────────────────────────────────┘
         ↓ intercepts sign request
┌─────────────────────────────────┐
│  Facilitator web page            │
│  (verifier here is redundant)   │
└─────────────────────────────────┘
```

**Trust Model:**
- Buyer trusts extension they installed
- Extension source is auditable (GitHub + marketplace)
- Facilitator cannot alter extension code

**What It Guarantees:**
- ✅ Malicious facilitator cannot trick buyer
- ✅ Buyer-controlled verification (strongest trust)
- ✅ Same protocol (no changes needed)

**Upgrade Path:**
1. Package existing `verifier.ts` as extension
2. Extension intercepts "sign" requests
3. Extension verifies PTB before allowing signature
4. Optional: Extension warns if facilitator page verification differs

**Why Not Building for Hackathon:**
- Extension is engineering labor, not protocol innovation
- Judges evaluate architecture, not implementation completeness
- Clear path to production is what matters

**Messaging to Judges:**
> "Today, verifier runs in our web app (Tier 1). In production, the same logic ships as an extension (Tier 2). No protocol redesign needed."

### Alternative: Merchant-Hosted Verification

**Design:**
```
Buyer → Merchant page → Fetch PTB from facilitator → Verify → Sign
```

**Why Excluded:**
- Merchant-hosted page increases merchant integration burden
- Merchant could also be malicious (wants to overcharge)
- Extension (Tier 2) is cleaner: buyer-controlled, works with any merchant

**Use Case:** Only if merchant wants full payment UX control (rare)

---

## Transaction Submission

### The Question

**Who submits the signed transaction to SUI RPC?**

### Two Options

#### Option A: Facilitator Submits (Chosen)

**Flow:**
```
Buyer signs PTB → sends signature to facilitator → facilitator submits to RPC → returns tx digest
```

**Pros:**
- ✅ Buyer RPC-free (no SUI node access needed)
- ✅ Simplifies buyer experience (one less step)
- ✅ Facilitator can handle RPC errors gracefully
- ✅ Facilitator can cache/retry if network issues

**Cons:**
- ⚠️ Facilitator can delay submission (but can't alter bytes after signature)
- ⚠️ Buyer relies on facilitator for tx status

**Security:**
- Facilitator CANNOT change PTB after signature (signature invalid)
- Facilitator CAN delay/drop tx (buyer sees "pending" forever)
- Mitigation: Buyer can submit same signed tx to RPC directly if needed (backup)

#### Option B: Buyer Submits Directly

**Flow:**
```
Buyer signs PTB → buyer submits to RPC directly → returns tx digest
```

**Pros:**
- ✅ Buyer fully controls submission
- ✅ No facilitator delay risk

**Cons:**
- ❌ Buyer needs RPC access (requires SUI node URL)
- ❌ Buyer handles RPC errors (gas estimation, rate limits)
- ❌ More complex buyer UX (configure RPC endpoint)

### Our Choice: Option A (Facilitator Submits)

**Reasons:**
1. **UX Priority:** "No wallet, no gas, no blockchain knowledge"
   - Buyer shouldn't configure RPC endpoints
   - Buyer shouldn't handle RPC errors

2. **Security Acceptable:**
   - Worst case: Facilitator delays tx (buyer can resubmit elsewhere)
   - Facilitator cannot alter transaction (signature prevents)

3. **Demo Flow:**
   - Cleaner narrative ("facilitator handles everything except signing")

**Fallback Option:**
- Advanced UI: "Submit yourself" button (for paranoid users)
- Exports signed tx bytes + instructions to submit via `sui client`

**Future Enhancement:**
- Multi-facilitator: Buyer can route to different facilitators if one is down
- P2P relay: Buyers relay signed txs to each other (decentralized submission)

---

## Salt Management

### The Question

**How should we manage zkLogin salt (critical for address derivation)?**

### Options Evaluated

#### Option A: DIY Salt Server

**Design:**
```typescript
// Self-hosted salt derivation
function deriveSalt(googleUserId: string): string {
  return HKDF(
    MASTER_SECRET,  // One secret, stored securely
    googleUserId,
    'zklogin-salt'
  );
}
// Deterministic: same Google ID → same salt → same address
```

**Pros:**
- ✅ Full control over salt service
- ✅ No external dependency
- ✅ Can customize salt-per-app logic

**Cons:**
- ⚠️ Must secure MASTER_SECRET (HSM, KMS, etc.)
- ⚠️ Must maintain high availability (salt service down = no logins)
- ⚠️ Must implement JWT validation, rate limiting, etc.
- ⚠️ Hackathon time sink (days of work)

#### Option B: Mysten Enoki (Chosen)

**Design:**
```typescript
// Use Mysten's production salt service
const { address, session } = await enokiClient.createSession({
  provider: 'google'
});
// Enoki handles: OAuth, JWT, salt derivation, proof generation
```

**Pros:**
- ✅ Production-ready (Mysten operates at scale)
- ✅ Zero setup for hackathon
- ✅ Handles JWT validation, proof generation, session management
- ✅ Same salt always (deterministic per Google ID)
- ✅ Privacy: salt not exposed to client

**Cons:**
- ⚠️ External dependency (trust Mysten availability)
- ⚠️ Mysten sees Google ID ↔ address mapping (privacy trade-off)

**Trust Assumptions:**
1. **Availability:** Enoki services reachable when users log in
2. **Correctness:** Enoki returns correct salt/proof
3. **Privacy:** Enoki doesn't leak Google ID ↔ address mapping
4. **Not custody:** Enoki does NOT hold funds (funds on-chain at derived address)

### Our Choice: Option B (Enoki)

**Reasons:**
1. **Hackathon Time:** Days saved vs DIY implementation
2. **Production Quality:** Mysten's salt service is battle-tested
3. **Trust Model:** We trust Mysten (same org that builds SUI)
4. **Privacy Acceptable:** Enoki sees identity→address, but:
   - zkLogin already breaks OAuth→address link (vs public)
   - Full privacy (ZK identity proofs) is post-hackathon goal

**Post-Hackathon Path:**
- Option to self-host salt service (use Mysten's open-source implementation)
- Or continue with Enoki (SLA, support)

**Key Insight:**
> Salt service is infrastructure, not innovation. Use production service for hackathon, self-host if needed later.

---

## On-Chain Constraints

### The Question

**Should we simplify PTB verification by moving logic on-chain?**

### Two Approaches

#### Approach A: Template Verification (Client-Side) - Chosen

**Design:**
```typescript
// verifier.ts (client-side)
function verifyPaymentPTB(ptbBytes, invoice) {
  // Parse PTB commands
  // Check: only allowed commands
  // Check: exact amount to merchant
  // Check: no unauthorized transfers
  // Return: { pass: true/false, reason }
}
```

**Pros:**
- ✅ Flexible PTB structure (facilitator can optimize coin selection)
- ✅ No additional Move code needed
- ✅ Client can show detailed verification results

**Cons:**
- ⚠️ Complex verification logic (must parse PTB bytes)
- ⚠️ Must handle all PTB edge cases (merge, split, transfer combinations)

#### Approach B: `pay_exact()` On-Chain Function

**Design:**
```rust
// payment.move
public entry fun pay_exact<T>(
    buyer_coins: vector<Coin<T>>,
    amount: u64,
    merchant: address,
    payment_id: vector<u8>,
    invoice_hash: vector<u8>,
    ctx: &mut TxContext
) {
    // Merge coins
    let merged = merge_all(buyer_coins);
    
    // Split exact amount
    let payment_coin = coin::split(&mut merged, amount, ctx);
    
    // Transfer to merchant
    transfer::public_transfer(payment_coin, merchant);
    
    // Return change to buyer
    transfer::public_transfer(merged, tx_context::sender(ctx));
    
    // Emit receipt
    event::emit(ReceiptEmitted { ... });
}
```

**Then verifier becomes:**
```typescript
function verifyPaymentPTB(ptbBytes, invoice) {
  const ptb = parsePTB(ptbBytes);
  
  // Simple check: single MoveCall to pay_exact with correct args
  if (ptb.commands.length !== 1) return { pass: false };
  if (ptb.commands[0].function !== 'pay_exact') return { pass: false };
  if (ptb.commands[0].args.amount !== invoice.amount) return { pass: false };
  if (ptb.commands[0].args.merchant !== invoice.merchant) return { pass: false };
  
  return { pass: true };
}
```

**Pros:**
- ✅ Simpler verifier (just check function name + args)
- ✅ Semantic constraints enforced on-chain
- ✅ Harder to trick buyer with complex PTB

**Cons:**
- ⚠️ Less flexible (fixed merge/split/transfer logic)
- ⚠️ More Move code to test
- ⚠️ Gas slightly higher (function call overhead)

### Our Choice: Approach A (Template Verification)

**Reasons:**
1. **Hackathon Scope:**
   - Approach A already implemented (verifier.ts exists)
   - Approach B requires new Move code + tests

2. **Flexibility:**
   - Facilitator can optimize coin selection
   - Can handle complex coin merging strategies

3. **Upgrade Path:**
   - Can add `pay_exact()` later without breaking protocol
   - Verifier can support both (check for template OR check for pay_exact)

**Post-Hackathon:**
- Implement Approach B as optional "simplified payment"
- Recommended for merchants who want minimal verification logic

**Key Insight:**
> Template verification is more powerful but complex. On-chain constraints simplify but reduce flexibility. Both are valid; we chose flexibility for hackathon.

---

## Session Persistence

### The Confusion

**"Nonce" has multiple meanings in blockchain:**
- Ethereum: account nonce (tx sequence number)
- zkLogin: OAuth nonce (binds JWT to ephemeral key)

**This caused confusion about what needs to persist.**

### What Actually Persists

| Item | Lifespan | Purpose | Persistence |
|------|----------|---------|-------------|
| **Salt** | Forever | Address derivation | ✅ MUST persist (Enoki handles) |
| **Ephemeral Key** | Hours/days (until maxEpoch) | Sign transactions | ⚠️ Can regenerate (same address) |
| **zkLogin Proof** | Same as ephemeral key | Prove Google auth | ⚠️ Regenerate with new key |
| **OAuth Nonce** | Single-use (JWT binding) | Prevents replay | ❌ Never persisted |

### The Critical Distinction

**Salt = Account Identity:**
```typescript
address = hash(google_id + salt)
// Salt MUST be stable → same address always
// If salt changes → different address → funds "lost" (actually at old address)
```

**Nonce = Session Binding:**
```typescript
nonce = hash(ephemeral_public_key + randomness)
// JWT.nonce = nonce
// Proves: "This JWT authorizes this ephemeral key"
// Single-use, never stored long-term
```

### Our Design

**Salt Persistence (CRITICAL):**
- Handled by Enoki
- Same Google account → same salt → same address
- Buyer can clear browser storage → re-login → same address recovered

**Session Caching (TACTICAL):**
- Ephemeral key + proof cached until `maxEpoch`
- If session expires → re-authenticate → new ephemeral key → same address
- Improves UX (fewer logins) but not critical for continuity

**Key Insight:**
> Salt is the hard problem (address continuity). Session caching is just UX optimization.

---

## Future Extensions

### Ideas Deferred from Hackathon

#### 1. Token Swaps via Deepbook

**Concept:**
Buyer has WETH, merchant wants USDC → PTB swaps during payment.

**PTB Structure:**
```typescript
ptb.moveCall({
  target: 'deepbook::swap',
  arguments: [wethCoin, 'USDC', minAmount]
});
// Then transfer swapped USDC to merchant
```

**Why Deferred:**
- Adds slippage handling complexity
- Price oracle needed (prevent MEV)
- User intent verification harder ("Pay 0.1 USDC, swap up to 0.11 WETH")

**Post-Hackathon:**
- Implement as optional "auto-swap" feature
- Show in verifier: "Swapping 0.11 WETH → 0.1 USDC"

#### 2. Batch Settlements (Privacy + Gas Savings)

**Concept:**
Facilitator batches multiple payments into one transaction.

**Benefits:**
- Lower gas per payment (amortized)
- Privacy: harder to link buyer→merchant (multiple payments mixed)

**Challenges:**
- Coordination (wait for batch to fill)
- Latency (payment delayed until batch)
- Failure handling (one payment fails → retry)

**Use Case:**
- High-volume merchants (thousands of payments/day)
- Privacy-sensitive scenarios

#### 3. ZK Privacy Receipts

**Concept:**
Emit only receipt hash on-chain, prove details in ZK.

**Event:**
```rust
event::emit(ReceiptHash {
    receipt_hash: vector<u8>  // H(payment_id, merchant, amount, ...)
});
```

**Merchant verification:**
```typescript
// Merchant provides receipt details
const proof = generateZKProof({
  receipt: { payment_id, merchant, amount, ... },
  receiptHash: onChainHash
});
// Verify proof: receipt hashes to onChainHash
```

**Benefits:**
- On-chain privacy (only hash visible)
- Selective disclosure (merchant proves to auditor without revealing to public)

**Use Case:**
- High-value payments (want privacy)
- Regulatory compliance (prove payment without public disclosure)

#### 4. Multi-Facilitator Routing

**Concept:**
Buyer can choose from multiple facilitators (marketplace).

**Benefits:**
- Decentralization (no single point of failure)
- Competition (lower fees)
- Redundancy (if one facilitator is down, use another)

**Challenges:**
- Discovery (how does buyer find facilitators?)
- Trust (how does buyer verify facilitator?)
- Standards (all facilitators must implement same protocol)

**Post-Hackathon:**
- Facilitator registry (on-chain or DNS-based)
- Reputation system (track uptime, fees)

#### 5. Agentic Payments (AI Agents as Buyers)

**Concept:**
AI agents pay for API access without human intervention.

**Design:**
```typescript
// Agent has keypair (not zkLogin)
const agent = Ed25519Keypair.fromSecretKey(agentPrivateKey);

// Agent pays directly (no verifier needed)
const signedTx = await agent.signTransaction(ptbBytes);
await suiClient.executeTransaction(signedTx);
```

**Challenges:**
- Agent needs SUI for gas (can we sponsor?)
- Agent needs USDC (how to fund?)
- Rate limiting (prevent abuse)

**Use Case:**
- LangChain agents calling paid APIs
- Autonomous trading bots
- AI research (pay per compute)

---

## Summary: Design Philosophy

### Core Principles

1. **Trust Boundary First**
   - Non-escrow: buyer owns funds
   - Verifier: buyer controls approval
   - Tier 2 extension: buyer-controlled code

2. **Hackathon Realism**
   - Tier 1 verifier: demonstrates architecture
   - Demo faucet: skips onramp complexity
   - Testnet only: avoids mainnet risk

3. **Clear Upgrade Paths**
   - Tier 1 → Tier 2: same protocol
   - Events → ZK receipts: backward compatible
   - Single facilitator → marketplace: additive

4. **Optimize for Demo Impact**
   - Visible verification (show PTB check)
   - On-chain receipts (show in explorer)
   - Two payments (show persistence)

### What We Optimized For

✅ **No UX friction** (no wallet, no gas, no crypto knowledge)  
✅ **Web3 trust boundary** (not delegated Web2 service)  
✅ **Fast hackathon demo** (pre-fund, skip onramps)  
⚠️ **Privacy sacrificed** (public receipts, clear coin ownership)  
⚠️ **Single facilitator** (marketplace is post-hackathon)

### What We Did NOT Optimize For (Yet)

- Maximal privacy (deferred)
- Lowest gas cost (deferred)
- Decentralization (deferred)
- Production onramps (deferred)

---

## Implementation Details Resolved

### PTB Verifier Library Choice

**Question:** Which library to use for parsing PTB bytes?

**Decision:** Use `@mysten/sui` built-in transaction deserializer

**Rationale:**
- ✅ Official SDK (maintained by Mysten Labs)
- ✅ Handles all PTB formats correctly
- ✅ Well-tested in production
- ✅ No custom parsing needed

**Usage:**
```typescript
import { Transaction } from '@mysten/sui/transactions';

function verifyPaymentPTB(ptbBytes: Uint8Array, invoice: InvoiceJWT) {
  const tx = Transaction.from(ptbBytes);
  // Inspect tx.commands array
  // Verify against template
}
```

### JWT Signing Algorithm

**Question:** Which algorithm for merchant-signed invoices?

**Decision:** EdDSA (Ed25519)

**Rationale:**
- ✅ Matches SUI keypairs (Ed25519 is native)
- ✅ Simplest for demo (reuse existing key management)
- ✅ Fast signature verification
- ✅ Standard in modern crypto (not deprecated like RS256)

**Alternative considered:** ES256 (ECDSA) - more enterprise-standard but adds complexity

**Usage:**
```typescript
import jwt from 'jsonwebtoken';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';

const merchantKeypair = Ed25519Keypair.fromSecretKey(merchantPrivateKey);
const invoiceJwt = jwt.sign(invoice, merchantKeypair.getSecretKey(), { 
  algorithm: 'EdDSA' 
});
```

### Demo Merchant Sophistication

**Question:** Hardcoded JWT vs real generation?

**Decision:** Real JWT generation (multiple endpoints supported)

**Rationale:**
- ✅ Demonstrates protocol works end-to-end
- ✅ Not much more complex (~20 lines)
- ✅ Easy to add multiple resources (different prices)
- ✅ Easier testing (generate new JWTs on demand)
- ⚠️ Adds `jsonwebtoken` dependency (acceptable)

**Implementation:**
```typescript
// demo-merchant/server.ts
app.get('/api/premium-data', (req, res) => {
  const invoice = createInvoice({
    resource: '/api/premium-data',
    amount: '100000', // 0.1 USDC
    merchantRecipient: MERCHANT_ADDRESS
  });
  
  const invoiceJwt = signInvoice(invoice, merchantKeypair);
  
  res.status(402)
    .setHeader('X-X402-Invoice-JWT', invoiceJwt)
    .json({ 
      error: 'Payment required',
      facilitator_url: FACILITATOR_URL,
      callback_url: `${MERCHANT_URL}/api/verify`
    });
});
```

### Funding Strategy

**Decision:** Auto-detect + script for local/testnet, manual for deployment

**Implementation:**
```typescript
// facilitator/src/controllers/faucet.ts
export async function fundIfNeeded(address: string) {
  const balance = await getBalance(address);
  
  if (balance > 0) {
    return { alreadyFunded: true, balance };
  }
  
  // Fund with 2 USDC (enough for multiple payments)
  const txDigest = await transferUSDC(address, 2_000_000);
  
  return { funded: true, amount: 2_000_000, txDigest };
}
```

**UI:**
```typescript
// For localhost/testnet
if (balance === 0) {
  <button onClick={autoFund}>Fund 2 USDC (auto)</button>
}

// For deployed demo (testnet)
if (balance === 0) {
  <div>
    Your address: <code>{address}</code>
    <a href="https://faucet.circle.com" target="_blank">
      Get testnet USDC from Circle Faucet
    </a>
  </div>
}
```

### Attack Demo Priority

**Decision:** Nice-to-have (implement if time permits)

**Implementation sketch:**
```typescript
// facilitator config
export const DEMO_ATTACK_MODE = process.env.DEMO_ATTACK_MODE === 'true';

// In PTB construction
if (DEMO_ATTACK_MODE) {
  // Intentionally create PTB with 10x amount
  const [paymentCoin] = ptb.splitCoins(coins[0], [amount * 10]);
}

// Verifier catches this:
// ❌ Amount mismatch: expected 0.1 USDC, found 1.0 USDC
```

**Demo flow:**
1. Show normal payment (passes verification)
2. Toggle "attack mode" in facilitator
3. Show verifier blocking malicious PTB
4. Explains: "Even if facilitator is malicious, buyer is protected"

**Priority:** Add after core flow works (Day 3-4 of hackathon)

### Salt Persistence (Enoki Verification)

**Confirmed from Enoki docs:**
- ✅ Same Google account + same Enoki app → **same salt** → **same address**
- ✅ Salt is deterministic per `(issuer, subject, app_id)`
- ✅ Works across devices automatically
- ✅ Enoki manages salt server (no DIY needed)

**Reference:** https://docs.enoki.mystenlabs.com/zklogin#salt-management

**For demo:** Same device is sufficient. Cross-device works automatically if judges want to test.

---

**Last Updated:** February 1, 2026  
**Version:** 1.1 (Added implementation details)  
**Companion to:** `ARCHITECTURE.md` (implementation spec)
