# Pay402 - Hackathon Presentation (v2)

**Event:** ETH Global HackMoney January 2026  
**Project:** Pay402 🐠 - First x402 Facilitator on SUI  
**Duration:** 5 minutes (with backup slides for Q&A/extended reading)  
**Demo URL:** https://merchant-production-0255.up.railway.app (testnet)

---

## Presentation Objectives

1. **Establish x402 context** - Emerging standard, already on Base/Solana
2. **Position Pay402** - First SUI implementation with unique advantages
3. **Demonstrate capabilities** - Live demo showing seamless flow
4. **Prove technical depth** - Architecture, trust model, implementation
5. **Show impact** - Performance, use cases, roadmap

---

## SLIDE 1: Title

**Title:** Pay402 🐠  
**Subtitle:** First x402 Facilitator on SUI

**Visual:** Banner image (gradient background with logo)

**Tagline:** "Micropayments. No Wallet. Massively Parallel."

**One-liner for speaker:**

> "We built the first x402 payment facilitator on SUI - and it unlocks capabilities impossible on existing implementations."

---

## SLIDE 2: x402 Protocol - Quick Context

**Title:** "x402: Emerging Standard for Micropayments"

### What is x402?

**HTTP 402 Status Code** - "Payment Required" (reserved since 1999, finally useful)

```http
GET /api/data HTTP/1.1

HTTP/1.1 402 Payment Required
X-402-Payment-Details: {...}
```

**Machine-readable payment requests** for:

- API monetization ($0.01-$1.00 per request)
- Premium content paywalls
- AI agent commerce
- Pay-per-use services

### Current Adoption

| Chain       | Facilitator       | Status            |
| ----------- | ----------------- | ----------------- |
| **Base**    | Coinbase x402 SDK | Live, mainnet     |
| **Solana**  | PayAI             | Live, mainnet     |
| **Polygon** | Coinbase SDK      | Live              |
| **SUI**     | ❌ None           | **← We're first** |

**Market signal:** Coinbase, Circle, and multiple teams shipping x402 implementations

**Our goal:** Build the BEST facilitator, not just first on SUI

---

## SLIDE 3: The Problem with Current x402 Implementations

**Title:** "What's Missing in Base/Solana Facilitators?"

### Limitation 1: Onboarding Friction

**Current state:**

- AI agents: ✅ Easy (API keys, programmatic)
- Humans: ❌ Hard (need wallet, seed phrases, gas tokens)

**Pay402 solution:** zkLogin + Enoki = OAuth login → blockchain address

---

### Limitation 2: Scalability Bottlenecks

**EVM (Base):**

- Shared state for payment authorization
- Sequential execution limits throughput
- EIP-3009 requires careful nonce management

**Solana:**

- Better parallelism than EVM
- But still global state for escrow/authorization

**Pay402 solution:** SUI's object model = no shared state, unlimited parallelism

---

### Limitation 3: Trust Model Compromises

**Question:** Can facilitator spend buyer funds without buyer signature?

**EIP-3009 (EVM):**

- ✅ Requires signature per payment
- ⚠️ But limited extensibility

**Pay402 solution:** PTB verification = EIP-3009 guarantees + flexible extensions

---

### Limitation 4: Expensive On-Chain Receipts

**EVM gas costs:** ~$0.50-$5.00 for receipt storage (defeats micropayment economics)

**Pay402 solution:** SUI events = ~$0.0003, merchant audit trail for pennies

---

### Limitation 5: Opaque Fee Structures

**EIP-3009 limitation:** Fixed transfer logic, hard to extend for facilitator fees

**Pay402 solution:** PTBs allow atomic: Payment → Merchant + Fee → Facilitator

---

## SLIDE 4: Pay402's 5 Unique Advantages

**Title:** "Why Pay402 on SUI is Different"

| Advantage                  | Technology          | Benefit                                  |
| -------------------------- | ------------------- | ---------------------------------------- |
| **1. Seamless Onboarding** | zkLogin + Enoki     | Google OAuth → Address, no wallet        |
| **2. Massive Parallelism** | Object Model + PTBs | No shared state, unlimited scaling       |
| **3. Strong Trust Model**  | PTB Verification    | EIP-3009 equivalent, buyer must sign     |
| **4. Cheap Receipts**      | SUI Events          | $0.0003 vs $0.50+, enables micropayments |
| **5. Flexible Extensions** | PTBs                | Transparent fees, customizable flows     |

**Core message:** SUI's architecture enables a superior x402 facilitator

---

## SLIDE 5: How It Works - The x402 Flow

**Title:** "Two Layers: HTTP (Fast) + Blockchain (Final)"

### Dual-Layer Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│               HTTP LAYER (Off-Chain, ~50-100ms)                 │
│                  ✅ OPTIMISTIC SETTLEMENT                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Buyer              Facilitator              Merchant           │
│    │                     │                       │              │
│    │ 1. GET /api/data    │                       │              │
│    ├─────────────────────────────────────────────>              │
│    │                     │                       │              │
│    │ 2. HTTP 402 + Invoice (signed by merchant) │              │
│    <─────────────────────────────────────────────┤              │
│    │                     │                       │              │
│    │ 3. Sign payment PTB │                       │              │
│    │    (zkLogin)        │                       │              │
│    │                     │                       │              │
│    │ 4. Signed PTB       │                       │              │
│    ├────────────────────>│                       │              │
│    │                     │ 5. Validate:          │              │
│    │                     │    • Signature ✓      │              │
│    │                     │    • Balance ✓        │              │
│    │                     │    • PTB structure ✓  │              │
│    │                     │                       │              │
│    │                     │ 6. Submit to SUI      │              │
│    │                     │    (non-blocking)     │              │
│    │                     │                       │              │
│    │                     │ 7. "Safe to deliver"  │              │
│    │                     ├──────────────────────>│              │
│    │                     │                       │              │
│    │ 8. Content delivered (before finality!)    │              │
│    <─────────────────────────────────────────────┤              │
│    │                                             │              │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│            BLOCKCHAIN LAYER (On-Chain, ~400ms)                  │
│                 ✅ PESSIMISTIC SETTLEMENT                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Buyer's USDC         Facilitator             Merchant          │
│  (owned object)            │                      │             │
│      │                     │                      │             │
│      │ 9. PTB executed:    │                      │             │
│      │    • Split coins    │                      │             │
│      │    • Transfer       ├─────────────────────>│             │
│      │    • Emit receipt   │                      │             │
│      │                     │                      │             │
│      │ 10. Receipt event (on-chain audit trail)  │             │
│      │                     │                      │             │
└─────────────────────────────────────────────────────────────────┘
```

### Key Insight: Flexible Settlement Modes

**Optimistic (~100ms):** Facilitator validates, submits, delivers content before finality

- **Use case:** Low-value, high-volume (API calls, articles)
- **Trust:** Merchant trusts facilitator's validation

**Pessimistic (~600ms):** Wait for on-chain confirmation before delivery

- **Use case:** Higher-value transactions
- **Trust:** Zero trust, pure on-chain proof

**Pay402 supports both** - merchant chooses per transaction

---

## SLIDE 6: zkLogin - The UX Breakthrough

**Title:** "No Wallet Required"

### Traditional Crypto Payment

```
User → Install wallet extension (2 min)
     → Save seed phrase (3 min)
     → Buy crypto on exchange (1-3 days)
     → Transfer to wallet (10 min)
     → Connect to site (1 min)
     → Sign transaction (30 sec)
```

**Total:** Days of setup for a $0.10 payment

---

### Pay402 with zkLogin

```
User → Click payment link (1 sec)
     → "Sign in with Google" (3 sec)
     → Confirm payment (1 sec)
```

**Total:** ~5 seconds (with funded account)

---

### How zkLogin Works

```
1. User authenticates with Google (OAuth 2.0)
2. Google returns JWT with user identity
3. zkLogin derives deterministic SUI address:

   Address = Hash(OAuth_Provider + User_ID + Salt)

4. User signs transaction with ephemeral key + ZK proof
5. SUI validators verify proof, execute transaction
```

**Key properties:**

- ✅ No private key storage
- ✅ Same address on every login (deterministic)
- ✅ Non-custodial (user owns coins)
- ✅ Can sign any PTB (full transaction expressiveness)

**Powered by Enoki:** Infrastructure layer for zkLogin (session management, proof generation, gas sponsorship)

---

## SLIDE 7: Why SUI Enables Pay402

**Title:** "SUI-Specific Advantages"

### Comparison Table

| Feature             | SUI           | Solana                    | EVM (Base)                       | Why It Matters                                |
| ------------------- | ------------- | ------------------------- | -------------------------------- | --------------------------------------------- |
| **zkLogin**         | Native        | ❌ Not available          | ⚠️ Social recovery wallets exist | Google → Address, no wallet                   |
| **PTBs**            | Native        | ⚠️ Versioned transactions | ❌ Single-call only              | Atomic multi-step: split, transfer, receipt   |
| **Object Model**    | Owned objects | Account-based             | Account-based                    | Parallel execution, massive scalability       |
| **Finality**        | ~400ms        | ~400ms                    | ~12 min (L1), ~2s (L2)           | Near-instant payment confirmation             |
| **Gas Sponsorship** | Built-in      | Supported                 | ⚠️ Complex (EIP-4337)            | Facilitator pays, user doesn't need gas token |
| **Generic Coins**   | `Coin<T>`     | Token Program             | Token-specific contracts         | One contract, any stablecoin                  |
| **Receipt Events**  | ~$0.0003      | ~$0.00025                 | ~$0.50-$5.00                     | Cheap audit trails enable micropayments       |

### Key Takeaway

**Not "only possible on SUI"** - but **dramatically simpler and better**:

- zkLogin is native (vs third-party social wallets on EVM)
- PTBs are first-class (vs complex transaction batching)
- Object model eliminates shared state (vs careful state management)
- Sub-second finality + cheap events = perfect for micropayments

---

## SLIDE 8: Trust Model & PTB Verification

**Title:** "Who Trusts Whom?"

### Trust Boundaries

```
┌──────────────────────────────────────────────────────────────┐
│                    BUYER'S TRUST MODEL                       │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  ❌ Buyer DOES NOT trust facilitator to:                     │
│     • Spend funds without signature                         │
│     • Alter payment amount                                  │
│     • Redirect funds to wrong merchant                      │
│                                                              │
│  ✅ Buyer TRUSTS:                                            │
│     • Their own signature (zkLogin-based)                   │
│     • PTB verification in widget                            │
│     • SUI blockchain execution                              │
│                                                              │
│  ⚠️ Buyer DEPENDS ON facilitator for:                        │
│     • Service availability (uptime)                         │
│     • Gas sponsorship                                       │
│                                                              │
└──────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────┐
│                  MERCHANT'S TRUST MODEL                      │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  Optimistic mode:                                            │
│    • Trusts facilitator's validation                        │
│    • Delivers content before on-chain finality              │
│                                                              │
│  Pessimistic mode:                                           │
│    • Trusts only on-chain receipt event                     │
│    • Waits for blockchain confirmation                      │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

### PTB Verification (Critical Security)

**Where:** Widget (buyer's browser) verifies PTB before signing

**What it checks:**

```typescript
✓ Only allowed commands (Split, Transfer, MoveCall to payment::settle)
✓ Transfer amount matches invoice exactly
✓ Recipient matches merchant address
✓ No unauthorized transfers (no other destinations)
✓ Receipt emission included with correct invoice hash
✓ Asset type is USDC (not other tokens)
```

**Facilitator CANNOT:**

- Overcharge (PTB verification catches amount mismatch)
- Redirect funds (verification catches wrong recipient)
- Add hidden calls (verification rejects unknown commands)

**Future:** Same verification code moves to browser extension (lighter than full wallet, no signing keys needed - zkLogin handles that)

**Screenshot placeholder:** `[x402_PTB-Verification-Passed_2026-02-04.png]`

---

## SLIDE 9: Live Demo

**Title:** "See It Work"

**Demo URL:** https://pay402.io

### Demo Scenario

User purchases premium API data for $0.10 USDC

### Flow (Record This)

**Step 1: Merchant Page**

- Visit https://pay402.io/demo
- Click "Get Premium Data ($0.10)"
- **Screenshot:** `[x402_Payment-Request_2026-02-04.png]`

**Step 2: HTTP 402 Response**

- Widget detects 402 status
- Shows: Merchant, Amount, Resource
- "Sign in to pay" button

**Step 3: zkLogin Authentication**

- Click "Sign in with Google"
- OAuth flow (familiar Google login)
- Address derived: `0xabc...` (no wallet installed!)

**Step 4: [First Time] Fund USDC**

- Balance: 0 USDC
- Click "Get Test USDC" (Circle faucet on testnet)
- **Screenshot:** `[x402_Review-Payment_before-Faucet_2026-02-04.png]`
- Balance updated: 20 USDC
- **Screenshot:** `[x402_Review-Payment_after-Faucet_2026-02-04.png]`

**Step 5: Review & Verify**

- Widget shows PTB verification:
  - ✅ Amount: 0.10 USDC (exact match)
  - ✅ Recipient: merchant.com
  - ✅ No unauthorized transfers
  - ✅ Receipt emission included
- **Screenshot:** `[x402_PTB-Verification-Passed_2026-02-04.png]`

**Step 6: Confirm Payment**

- Click "Confirm & Pay"
- Transaction signed (zkLogin, 1 click)
- Submitted to SUI
- **Screenshot:** `[x402_Payment-Succesful_2026-02-04.png]`

**Step 7: Content Delivered**

- Redirect to merchant
- Premium data displayed
- **Screenshot:** `[x402_Premium-Content_Pessimistic_2026-04-02.png]`

**Step 8: On-Chain Verification**

- Transaction visible on SUI explorer
- Receipt event permanent on blockchain
- **Screenshot:** `[x402_tx-block_local-blockchain_2026-02-04.png]`

### Demo Callouts

During demo, emphasize:

- "No wallet extension installed"
- "No seed phrase anywhere"
- "User paid zero gas"
- "PTB verified before signing"
- "Content delivered in <1 second"
- "Receipt permanent on blockchain"

---

## SLIDE 10: Performance Metrics

**Title:** "How Fast Is It?"

### Latency: Request → Content Delivered

| Mode            | Description                           | Blockchain Latency | Breakdown                                        |
| --------------- | ------------------------------------- | ------------------ | ------------------------------------------------ |
| **Optimistic**  | Deliver after submit, before finality | 0ms (background)   | Validate + Submit + HTTP response                |
| **Pessimistic** | Deliver after on-chain confirmation   | ~400ms             | Validate + SUI finality (~400ms) + HTTP response |

### Optimistic Settlement Deep Dive

```
Timeline from buyer click to content delivery:

1. User clicks "Confirm Payment"
2. Widget signs PTB (zkLogin)
3. POST to facilitator
4. Facilitator validates signature
5. Facilitator checks USDC balance (RPC call)
6. Facilitator validates PTB structure
7. Facilitator submits to SUI blockchain
8. HTTP response: "Safe to deliver"
9. Redirect to merchant
10. ✅ Content delivered to user

Background (user already has content):
11. Transaction finalized on-chain (~400ms)
12. Receipt event indexed
```

**Key insight:** Facilitator acts as guarantor. Comprehensive validation before submit eliminates most risk. Only remaining risk: buyer spends USDC elsewhere between submit and finality - mitigated by fast SUI finality (~400ms) and immediate balance validation.

### Return Visit (Funded User)

| Action                   | Latency        |
| ------------------------ | -------------- |
| Click payment link       | Instant        |
| zkLogin session (cached) | No re-auth     |
| Confirm payment          | 1 click        |
| Content delivered        | Fast (seconds) |

**Total:** Fast repeat purchases (no wallet popups, no re-authentication)

---

## SLIDE 11: Implementation Achievements

**Title:** "BREAKTHROUGH! Full Flow Working on Testnet"

### End-to-End Capabilities Confirmed ✅

The following features are **working live on SUI testnet:**

| Feature                       | Status  | Implementation Details                                                           |
| ----------------------------- | ------- | -------------------------------------------------------------------------------- |
| ✅ **OAuth login**            | Working | Automatic SUI address creation (persisted, OAuth + Salt)                         |
| ✅ **Gas sponsorship**        | Working | Facilitator pays gas via sponsored PTB, buyer needs no blockchain access nor SUI |
| ✅ **PTB validation**         | Working | Buyer verifies transaction structure before signing (widget)                     |
| ✅ **zkLogin signing**        | Working | Enoki service for Salt management                                                |
| ✅ **Optimistic settlement**  | Working | Content delivered quickly (before finality)                                      |
| ✅ **Pessimistic settlement** | Working | On-chain confirmation before delivery                                            |
| ✅ **USDC persistence**       | Working | USDC remains with buyer all the time (no escrow custody)                         |
| ✅ **Merchant onboarding**    | Working | Add JavaScript widget to website (Stripe model)                                  |
| ✅ **On-chain receipts**      | Working | Events with x402 invoice details for audit & conflict resolution                 |
| ✅ **Future-ready**           | Planned | PTB verification → browser extension (OAuth + one-time USDC funding only)        |

**Critical breakthrough:** Missing `chain: "sui:testnet"` parameter - once fixed, everything works!

**Live proof on testnet:**  
🔗 https://suiscan.xyz/testnet/tx/EV7D7z9gjzjrAQSKWSW8S1iLGdk8aEVPjn3zLA1aUSLE

**Note:** First time funding requires Circle faucet. Subsequent payments reuse USDC at same address.

---

## SLIDE 12: Technical Implementation

**Title:** "What We Built"

### Components & Status

| Component           | Tech Stack                   | Status      | Tests                    |
| ------------------- | ---------------------------- | ----------- | ------------------------ |
| **Move Contract**   | SUI Move, generic `Coin<T>`  | ✅ Complete | 18 passing               |
| **Facilitator API** | Node.js, TypeScript, Express | ✅ Complete | 181 passing              |
| **Payment Widget**  | React, Vite, Enoki SDK       | ✅ Complete | 77 passing               |
| **PTB Verifier**    | TypeScript, @mysten/sui      | ✅ Complete | Included in widget tests |
| **Demo Merchant**   | Node.js, Express             | ✅ Complete | Manual testing           |

**Total Test Coverage:** 276 automated tests, all passing

---

### Move Contract: Generic Settlement

```move
public entry fun settle_payment<T>(
    payment_coin: Coin<T>,
    facilitator_fee: u64,
    merchant: address,
    facilitator: address,
    payment_id: vector<u8>,
    invoice_hash: vector<u8>,
    ctx: &mut TxContext
) {
    let coin_value = coin::value(&payment_coin);

    // Split fee
    let fee_coin = coin::split(&mut payment_coin, facilitator_fee, ctx);
    transfer::public_transfer(fee_coin, facilitator);

    // Transfer payment
    transfer::public_transfer(payment_coin, merchant);

    // Emit receipt
    event::emit(PaymentSettled {
        payment_id,
        invoice_hash,
        buyer: tx_context::sender(ctx),
        merchant,
        amount: coin_value - facilitator_fee,
        fee: facilitator_fee,
        timestamp: clock::timestamp_ms(clock)
    });
}
```

**Advantages:**

- **Generic `Coin<T>`** - works with USDC, SUI, USDT, any token
- **Transparent fees** - split in single PTB (impossible with EIP-3009 without effort)
- **Cheap events** - receipt ~$0.0003 (vs $0.50+ on EVM)

---

### Facilitator API

```
GET  /health           - Network status, facilitator address
POST /check-balance    - User USDC balance lookup
POST /build-ptb        - Construct payment PTB from invoice
POST /submit-payment   - Submit signed PTB to blockchain
POST /fund             - Demo faucet (testnet only)
```

**Key features:**

- Gas sponsorship (user pays zero SUI)
- Network switching (localnet, testnet, mainnet-ready)
- Optimistic + pessimistic settlement modes
- Comprehensive validation before submission

---

### PTB Verifier (Widget)

Runs in buyer's browser, verifies PTB before signing:

```typescript
function verifyPaymentPTB(ptbBytes, invoice): VerificationResult {
  const ptb = deserialize(ptbBytes);

  // Check 1: Only allowed commands
  for (cmd of ptb.commands) {
    if (!ALLOWED.includes(cmd.type)) return FAIL;
  }

  // Check 2: Exact payment amount
  const transfer = findTransfer(ptb);
  if (transfer.amount !== invoice.amount) return FAIL;

  // Check 3: Correct recipient
  if (transfer.to !== invoice.merchant) return FAIL;

  // Check 4: No unauthorized transfers
  for (tx of ptb.transfers) {
    if (tx.to !== invoice.merchant && tx.to !== buyerAddress) {
      return FAIL;
    }
  }

  // Check 5: Receipt with correct invoice hash
  const receipt = findReceiptCall(ptb);
  if (receipt.invoiceHash !== sha256(invoiceJwt)) return FAIL;

  return PASS;
}
```

**This code is the same whether in widget or browser extension** - easy migration path.

---

## SLIDE 12: Use Cases

**Title:** "Who Needs Pay402?"

### Primary Use Cases

| Use Case              | Transaction Size | Volume         | Why x402                          |
| --------------------- | ---------------- | -------------- | --------------------------------- |
| **API Monetization**  | $0.01 - $1.00    | Very High      | Pay-per-request, no subscriptions |
| **AI Agent Commerce** | $0.001 - $0.10   | Extremely High | Programmatic, machine-readable    |
| **Premium Content**   | $0.10 - $5.00    | High           | Paywalls, articles, videos        |
| **Data Access**       | $0.05 - $2.00    | High           | Research, analytics, feeds        |

### Example Scenarios

**1. AI Research Agent**

```
Agent → "Find top 10 papers on quantum computing"
      → Hits API requiring $0.50 payment
      → Agent has USDC, signs PTB, receives data
      → All programmatic, zero human intervention
```

**2. Developer Testing API**

```
Dev → Needs to test payment API endpoint
    → No wallet, clicks "Sign in with Google"
    → Funded with test USDC, pays $0.01 per request
    → Tests API, debugs, iterates
    → Never touched MetaMask
```

**3. Content Creator Micropayments**

```
Reader → Wants to read $0.25 article
       → No crypto experience, signs in with Google
       → Pays 25 cents, reads article
       → Repeat visits take 2 seconds (cached session)
```

---

## SLIDE 13: Business Model

**Title:** "Economics"

### Fee Structure

**Fixed $0.01 per transaction** (not percentage-based)

| Payment Value | Facilitator Fee | Effective % |
| ------------- | --------------- | ----------- |
| $0.10         | $0.01           | 10%         |
| $1.00         | $0.01           | 1%          |
| $10.00        | $0.01           | 0.1%        |

**Why fixed?**

- Facilitator cost is fixed (gas ~$0.0003 + infra ~$0.002 = ~$0.0023)
- Micropayments need predictable, low fees
- Percentage-based would kill $0.10 use cases
- Fair for all transaction sizes

---

### Unit Economics

```
Revenue per tx:      $0.01
Cost per tx:        ~$0.0025 (gas + infrastructure + validation)
Profit per tx:      ~$0.0075

Break-even:         2,000 tx/day → $10/day → $3,650/year
Sustainable:       20,000 tx/day → $100/day → $36,500/year
Scale target:     200,000 tx/day → $1,000/day → $365,000/year
```

**Transparent fee split in PTB** - unique to Pay402, hard on EIP-3009

---

## SLIDE 14: Roadmap

**Title:** "What's Next"

### Completed (Hackathon)

- ✅ Move contract with generic `Coin<T>` settlement
- ✅ Facilitator backend (PTB construction, gas sponsorship, validation)
- ✅ Payment widget with zkLogin + PTB verification
- ✅ Optimistic + pessimistic settlement modes
- ✅ Testnet deployment with Circle USDC
- ✅ 276 automated tests, all passing

---

### Phase 1: Production Hardening (Q1 2026)

**Mainnet Deployment**

- Deploy to SUI mainnet
- Production monitoring + alerting
- Rate limiting + DDoS protection
- Multi-region facilitator nodes

**Browser Extension**

- Move PTB verifier to lightweight extension
- User installs once, works with all merchants
- **No signing keys in extension** (zkLogin handles that)
- Trust boundary moves fully to buyer side

---

### Phase 2: Merchant Adoption (Q2 2026)

**Embeddable Widget (like Stripe.js)**

```html
<!-- Merchant adds one script tag -->
<script src="https://cdn.pay402.io/widget.js"></script>
<script>
  Pay402.init({
    facilitatorUrl: "https://facilitator.pay402.io",
    merchantId: "your-merchant-id",
  });
</script>
```

**Merchant SDK**

- NPM package for invoice generation
- Webhook support for payment notifications
- Merchant dashboard (analytics, reconciliation)

---

### Phase 3: Cross-Chain (Q2 2026)

**Circle CCTP Integration**

```
User on Ethereum → CCTP bridge → SUI USDC → Pay402 → Merchant
```

**Enables:**

- Pay from any chain, settle on SUI
- Unified USDC liquidity
- Lower friction for existing crypto users

---

### Phase 4: Privacy Layer (Q3 2026)

**Escrow Pool for Privacy**

- Shared USDC pool across buyers
- ZK proofs for withdrawal authorization
- Unlinkability: merchant cannot tie payment to specific buyer address
- Still maintains EIP-3009-equivalent trust guarantees

**Trade-offs:**

- Adds shared state (coordination overhead)
- Slightly higher complexity
- Justifies for high-value or sensitive transactions

**Hackathon decision:** Direct ownership simpler, proves core x402 capabilities first

---

## SLIDE 15: Closing

**Title:** "Pay402 🐠"

### The Pitch

> **"We built the first x402 facilitator on SUI - and it's the best x402 facilitator, period."**

**Five unique advantages:**

1. **Seamless onboarding** - zkLogin (Google → Address)
2. **Massive parallelism** - Object model, no shared state
3. **Strong trust model** - PTB verification, buyer must sign
4. **Cheap receipts** - $0.0003 events enable micropayments
5. **Flexible extensions** - Transparent fees, customizable flows

**Why this matters:**

- x402 is emerging standard (Coinbase, PayAI, multiple chains)
- Micropayments unlock new business models (APIs, AI agents, paywalls)
- SUI's architecture enables superior implementation

---

### Try It

**Live Demo:** https://pay402.io  
**GitHub:** [repository link]  
**Documentation:** [docs link]

**Built for:** ETH Global HackMoney 2026  
**Targeting:** SUI Prize (Best Overall + Notable Projects)

---

## BACKUP SLIDES

_(For Q&A or extended reading)_

---

## BACKUP 1: x402 Protocol Details

**What is HTTP 402?**

Reserved in HTTP/1.1 (1999) for "Payment Required" - finally being used.

```http
GET /api/premium-data HTTP/1.1
Host: api.merchant.com

HTTP/1.1 402 Payment Required
X-402-Invoice: eyJhbGciOiJFZERTQSJ9...
Content-Type: application/json

{
  "error": "Payment required",
  "amount": "100000",
  "currency": "USDC",
  "facilitator_url": "https://pay402.io/pay",
  "merchant": "merchant.com"
}
```

### Invoice Structure (JWT)

```json
{
  "iss": "merchant.com",
  "aud": "pay402.io",
  "iat": 1738396800,
  "exp": 1738397400,
  "payment_id": "pmt_abc123",
  "amount": "100000",
  "asset_type": "0x...::usdc::USDC",
  "pay_to": "0x1234...merchant",
  "resource": "/api/premium-data"
}
```

**Signed by merchant** - Facilitator cannot alter terms.

---

## BACKUP 2: PTB Structure Example

**What the facilitator builds:**

```typescript
const ptb = new Transaction();

// 1. Find buyer's USDC coins
const coins = await suiClient.getCoins({
  owner: buyerAddress,
  coinType: USDC_TYPE,
});

// 2. Merge if needed
if (coins.length > 1) {
  ptb.mergeCoins(coins[0].objectId, coins.slice(1));
}

// 3. Split exact amount + fee
const [paymentCoin] = ptb.splitCoins(
  coins[0].objectId,
  [amount] // e.g., 100000 (0.10 USDC)
);
const [feeCoin] = ptb.splitCoins(
  coins[0].objectId,
  [facilitatorFee] // e.g., 10000 (0.01 USDC)
);

// 4. Transfer to merchant and facilitator
ptb.transferObjects([paymentCoin], merchantAddress);
ptb.transferObjects([feeCoin], facilitatorAddress);

// 5. Emit receipt
ptb.moveCall({
  target: `${packageId}::payment::emit_receipt`,
  arguments: [
    ptb.pure(payment_id),
    ptb.pure(invoiceHash),
    ptb.pure(amount),
    ptb.pure(facilitatorFee),
  ],
  typeArguments: [USDC_TYPE],
});

// 6. Gas sponsorship
ptb.setSender(buyerAddress);
ptb.setGasOwner(facilitatorAddress);
ptb.setGasPayment(facilitatorGasCoins);

// 7. Serialize and send to buyer for signing
const ptbBytes = await ptb.build();
```

**Buyer verifies these bytes before signing** - this is the trust boundary.

---

## BACKUP 3: Comparison with EIP-3009

**EIP-3009 (Ethereum):**

```solidity
function transferWithAuthorization(
    address from,
    address to,
    uint256 value,
    uint256 validAfter,
    uint256 validBefore,
    bytes32 nonce,
    bytes signature
) external;
```

**Properties:**

- ✅ Requires buyer signature per payment
- ✅ Nonce prevents replay
- ❌ Fixed transfer logic (hard to add facilitator fee)
- ❌ Expensive gas (~$0.50-$5.00)

---

**Pay402 Equivalent (SUI PTB):**

```move
// No single function - composed in PTB:
1. Split coin (amount + fee)
2. Transfer payment to merchant
3. Transfer fee to facilitator
4. Emit receipt event
```

**Properties:**

- ✅ Requires buyer signature per payment (PTB signature)
- ✅ Nonce implicit (SUI sequence number)
- ✅ Flexible composition (add fee, receipt, custom logic)
- ✅ Cheap (~$0.0003)

**Key difference:** EIP-3009 is a single function call; Pay402 uses PTBs for atomic multi-step logic.

---

## BACKUP 4: Gas Sponsorship Mechanics

**How it works on SUI:**

```typescript
// PTB has two "actors":
ptb.setSender(buyerAddress); // Who initiates (owns coins being spent)
ptb.setGasOwner(facilitatorAddress); // Who pays gas (owns SUI for fees)
```

**Why this is safe:**

- Buyer signature authorizes USDC spend (their coins)
- Facilitator signature authorizes SUI gas spend (their coins)
- Neither can spend the other's funds
- SUI's object model enforces ownership

**Economic attack vector:**

> "What if buyer signs malicious PTB that drains facilitator gas?"

**Mitigation:**

- Gas budget capped per tx (max ~0.1 SUI = ~$0.10)
- Facilitator rate-limits by address
- PTB verifier prevents complex/expensive calls (only template commands allowed)

---

## BACKUP 5: Receipt Architecture

**On-Chain Event Structure:**

```move
struct PaymentSettled has copy, drop {
    payment_id: vector<u8>,
    invoice_hash: vector<u8>,
    buyer: address,
    merchant: address,
    amount: u64,
    fee: u64,
    coin_type: TypeName,
    timestamp: u64
}
```

**Why events (not objects)?**

| Approach | Storage Cost          | Queryable     | Permanent           |
| -------- | --------------------- | ------------- | ------------------- |
| Events   | Free (~$0.0003 gas)   | Yes (indexed) | Yes                 |
| Objects  | ~$0.003 SUI (~$0.003) | Yes           | Yes (until deleted) |

**Events are 10x cheaper** - critical for micropayment economics.

---

**Merchant Verification:**

```typescript
// Query by payment_id
const tx = await suiClient.getTransactionBlock({
  digest: txDigest,
  options: { showEvents: true },
});

const receipt = tx.events.find((e) => e.type.includes("PaymentSettled"));

// Verify fields
assert(receipt.invoice_hash === expectedHash);
assert(receipt.amount === invoiceAmount);
assert(receipt.merchant === ourAddress);

// ✅ Payment confirmed - permanent on blockchain
```

---

## BACKUP 6: zkLogin Security Model

**Address Derivation:**

```
Address = Hash(
  OAuth_Provider +  // e.g., "google"
  User_ID +         // e.g., "123456789"
  Salt              // Managed by Enoki
)
```

**Properties:**

- ✅ **Deterministic:** Same Google account = same SUI address
- ✅ **Non-custodial:** User owns coins at that address
- ✅ **Private:** Google user ID never revealed on-chain (ZK proof)
- ⚠️ **Salt dependency:** If salt service fails, recovery complex

---

**Transaction Signing:**

```
1. User authenticates with Google → JWT
2. Enoki generates ephemeral keypair
3. Ephemeral key signs transaction
4. ZK proof proves: "I have valid JWT for this address"
5. SUI validators verify: ZK proof + ephemeral signature
```

**Trust assumptions:**

- ✅ SUI validators (same as any blockchain)
- ✅ zkLogin cryptography (audited by Mysten Labs)
- ⚠️ OAuth provider (Google can revoke access)
- ⚠️ Enoki salt service (address derivation depends on it)

**Compared to seed phrases:**

- Seed phrase: One compromise = permanent loss
- zkLogin: OAuth compromise = revoke & re-auth with new salt

---

_Presentation v2.0 - February 5, 2026_  
_Solo hacker submission for ETH Global HackMoney 2026_  
_Targeting: SUI Prize (Best Overall Project + Notable Projects)_
