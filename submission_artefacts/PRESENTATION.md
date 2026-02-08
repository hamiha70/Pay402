# Pay402 - Hackathon Presentation

**Event:** ETH Global HackMoney January 2026  
**Project:** Pay402 🐠 - First x402 Facilitator on SUI  
**Duration:** Under 4 minutes  
**Demo URL:** https://merchant-production-0255.up.railway.app (testnet)

**Related Documentation:**

- [Problem Statement](../docs/PROBLEM_STATEMENT.md) - Market context and Pay402's value proposition
- [Architecture](../docs/ARCHITECTURE.md) - System architecture with Mermaid diagrams
- [Trust Model](../docs/TRUST_MODEL.md) - Security model and threat analysis

---

## SLIDE 1: x402 - Already a Reality

**Title:** "x402: Micropayments Are Here"

**Content:**

### HTTP 402 "Payment Required"

```http
GET /api/data HTTP/1.1

HTTP/1.1 402 Payment Required
X-402-Invoice: eyJhbGciOiJFZERTQSJ9...
```

**Machine-readable payment requests for:**

- API monetization ($0.01-$1.00 per request)
- Premium content paywalls
- AI agent commerce

### Currently Live

| Chain       | Facilitator       | Status            |
| ----------- | ----------------- | ----------------- |
| **Base**    | Coinbase x402 SDK | ✅ Live, mainnet  |
| **Solana**  | PayAI             | ✅ Live, mainnet  |
| **Polygon** | Coinbase SDK      | ✅ Live           |
| **SUI**     | ❌ None           | **← We're first** |

**Key Message:** x402 is proven technology. Coinbase, Circle, and multiple teams are shipping implementations.

---

## SLIDE 2: Pay402 - First x402 on SUI

**Title:** "Pay402 🐠 - First Ever Facilitator on SUI"

**Subtitle:** Built for ETH Global HackMoney 2026

### What We Built

**First x402 payment facilitator on SUI blockchain** - enabling micropayments with zero friction.

### SUI Unlocks Novel Features

| Feature                         | Technology                             | What It Enables                                 |
| ------------------------------- | -------------------------------------- | ----------------------------------------------- |
| **Onboarding Non-Crypto Users** | zkLogin + Enoki                        | Google OAuth → Blockchain address               |
| **No Browser Wallet**           | Gas Sponsorship                        | Facilitator pays gas, user needs only USDC      |
| **Low Latency**                 | Sub-second Finality                    | 600-700ms blockchain settlement (testnet)       |
| **Audit & Conflict Resolution** | Cheap On-Chain Events                  | Permanent receipts at ~$0.0003 per payment      |
| **Flexible Extensions**         | Programmable Transaction Blocks (PTBs) | Atomic multi-step: split, pay, emit receipt     |
| **Massive Scaling**             | Object Model (Owned Objects)           | Parallel execution, no shared state bottlenecks |

**Core Message:** Not just "first on SUI" - these capabilities are **difficult or impossible** on EVM/Solana.

---

## SLIDE 3: Live Demo (2 minutes)

**Title:** "See It Work"

**Demo URL:** https://merchant-production-0255.up.railway.app

### Simplified Payment Flow

```
┌──────────────────────────────────────────────────────────┐
│                    USER'S BROWSER                        │
│                                                          │
│  1. Visit Merchant                                       │
│     → Click "Get Premium Data ($0.10)"                   │
│     → HTTP 402 Payment Required                          │
│                                                          │
│  2. Payment Widget Opens                                 │
│     → Shows: Merchant, Amount, Resource                  │
│     → Click "Sign in with Google"                        │
│                                                          │
│  3. zkLogin Authentication                               │
│     → Google OAuth (familiar login)                      │
│     → SUI address derived: 0xabc...                      │
│     → No wallet installed!                               │
│                                                          │
│  4. [First Time] Fund USDC                               │
│     → Balance: 0 USDC                                    │
│     → Click "Get Test USDC"                              │
│     → Balance: 20 USDC                                   │
│                                                          │
│  5. PTB Verification                                     │
│     → Widget verifies transaction:                       │
│       ✓ Amount: 0.10 USDC (matches invoice)             │
│       ✓ Recipient: Merchant address                      │
│       ✓ No unauthorized transfers                        │
│     → Click "Confirm & Pay"                              │
│                                                          │
│  6. Transaction Signed & Submitted                       │
│     → zkLogin signature (1 click)                        │
│     → Facilitator sponsors gas                           │
│     → Submitted to SUI blockchain                        │
│                                                          │
│  7. Content Delivered                                    │
│     → Payment confirmed                                  │
│     → Premium content displayed                          │
│     → Receipt on blockchain                              │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

### Demo Callouts (While Showing)

- "No wallet extension installed"
- "Google login created blockchain address"
- "User paid zero gas fees"
- "Transaction verified before signing"
- "Content delivered in seconds"
- "Receipt permanent on blockchain"

**Live proof:** [Show transaction on SuiScan during demo]

---

## SLIDE 4: How We Built It

**Title:** "Technology Stack"

### On-Chain Components

**Smart Contract (SUI Move)**

- Generic `Coin<T>` payment settlement
- Validates buyer identity, atomically splits coins
- Emits on-chain receipt events
- 18 passing tests

**Blockchain Interaction**

- SUI testnet deployment
- Circle USDC (native stablecoin)
- Sub-second finality (600-700ms measured)
- Gas sponsored by facilitator

---

### Off-Chain Components

**Facilitator API (Node.js + TypeScript)**

- PTB construction matching invoice terms
- Gas sponsorship (facilitator pays SUI fees)
- Balance checking and validation
- Optimistic + pessimistic settlement modes
- 181 passing tests

**Payment Widget (React + Vite)**

- zkLogin integration (Enoki SDK)
- Client-side PTB verification
- Payment UI and flow management
- 77 passing tests

**Demo Merchant (Node.js + Express)**

- Invoice generation (JWT signed)
- HTTP 402 response pattern
- Payment verification
- Content delivery

---

### Key Architecture

**3-Party System:**

1. **Merchant** - Issues invoice, verifies payment, delivers content
2. **Facilitator** - Builds PTB, sponsors gas, submits to blockchain
3. **Buyer** - Signs transaction via zkLogin, owns USDC

**Trust Boundary:** Widget verifies PTB before buyer signs (buyer doesn't trust facilitator)

---

## SLIDE 5: Implementation Status & Roadmap

**Title:** "What We've Built & What's Next"

### Hackathon Achievements

| Feature                    | Status |
| -------------------------- | ------ |
| **OAuth Login**            | ✅     |
| **Gas Sponsorship**        | ✅     |
| **PTB Validation**         | ✅     |
| **zkLogin Signing**        | ✅     |
| **Optimistic Settlement**  | ✅     |
| **Pessimistic Settlement** | ✅     |
| **USDC Persistence**       | ✅     |
| **Merchant Onboarding**    | ✅     |
| **On-Chain Receipts**      | ✅     |

**Total:** 276 automated tests, all passing  
**Deployed:** Live on Railway (testnet)  
**Proof:** [Transaction link shown in demo]

---

### Next Steps

| Milestone                          | Status |
| ---------------------------------- | ------ |
| **Mainnet Deployment**             | 🔄     |
| **Browser Extension**              | 🔄     |
| **Production Monitoring**          | 🔄     |
| **Multi-Region Nodes**             | 🔄     |
| **Embeddable Widget**              | 🔄     |
| **Merchant SDK (NPM)**             | 🔄     |
| **CCTP Integration (Cross-Chain)** | 🔄     |
| **Merchant Dashboard**             | 🔄     |

**Key Next Step:** Browser extension with PTB verifier (no signing keys needed - zkLogin handles that)

---

## SLIDE 6: Closing

**Title:** "Pay402 🐠"

### The Pitch

> **"We built the first x402 facilitator on SUI - and SUI's unique capabilities make it the best x402 facilitator, period."**

**Six unique advantages:**

1. **Onboarding non-crypto users** - Google → Blockchain
2. **No browser wallet** - Gas sponsored, USDC only
3. **Low latency** - Sub-second settlement
4. **Audit & conflict resolution** - Cheap on-chain receipts
5. **Flexible extensions** - PTBs enable transparent fees
6. **Massive scaling** - Parallel execution, no shared state

**Why this matters:**

- x402 is emerging standard (proven on Base/Solana)
- Micropayments unlock new business models
- SUI's architecture enables superior implementation
- First x402 that Web2 users can actually use

### Try It

**Live Demo:** https://merchant-production-0255.up.railway.app  
**GitHub:** https://github.com/hamiha70/Pay402  
**Documentation:** See README.md

**Built for:** ETH Global HackMoney 2026  
**Solo Hacker Submission**

---

## BACKUP SLIDES

_(For Q&A)_

---

## BACKUP 1: Trust Model & PTB Verification

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

**Equivalent to EIP-3009 guarantees** - buyer must sign, transaction is verifiable.

---

## BACKUP 2: Why SUI? (Detailed Comparison)

**Title:** "SUI-Specific Advantages vs EVM/Solana"

### Feature Comparison

| Feature             | SUI                 | Solana                    | EVM (Base)                       | Why It Matters                                |
| ------------------- | ------------------- | ------------------------- | -------------------------------- | --------------------------------------------- |
| **zkLogin**         | Native              | ❌ Not available          | ⚠️ Social recovery wallets exist | Google → Address, no wallet                   |
| **PTBs**            | Native              | ⚠️ Versioned transactions | ❌ Single-call only              | Atomic multi-step: split, transfer, receipt   |
| **Object Model**    | Owned objects       | Account-based             | Account-based                    | Parallel execution, massive scalability       |
| **Finality**        | 600-700ms (testnet) | ~400ms                    | ~12 min (L1), ~2s (L2)           | Sub-second payment confirmation               |
| **Gas Sponsorship** | Built-in            | Supported                 | ⚠️ Complex (EIP-4337)            | Facilitator pays, user doesn't need gas token |
| **Generic Coins**   | `Coin<T>`           | Token Program             | Token-specific contracts         | One contract, any stablecoin                  |
| **Receipt Events**  | ~$0.0003            | ~$0.00025                 | ~$0.50-$5.00                     | Cheap audit trails enable micropayments       |

**Key Insight:** Not "only possible on SUI" - but **dramatically simpler and better**.

---

## BACKUP 3: zkLogin Deep Dive

**Title:** "No Wallet Required - How zkLogin Works"

### Traditional vs zkLogin

**Traditional Crypto Payment:**

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

**Pay402 with zkLogin:**

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

**Key Properties:**

- ✅ No private key storage
- ✅ Same address on every login (deterministic)
- ✅ Non-custodial (user owns coins)
- ✅ Can sign any PTB (full transaction expressiveness)

**Powered by Enoki:** Infrastructure layer for zkLogin (session management, proof generation, gas sponsorship)

---

## BACKUP 4: Gas Sponsorship Mechanics

**Title:** "How Facilitator Pays Gas"

### How It Works on SUI

```typescript
// PTB has two "actors":
ptb.setSender(buyerAddress); // Who initiates (owns USDC)
ptb.setGasOwner(facilitatorAddress); // Who pays gas (owns SUI)
```

**Why This Is Safe:**

- Buyer signature authorizes USDC spend (their coins)
- Facilitator signature authorizes SUI gas spend (their coins)
- Neither can spend the other's funds
- SUI's object model enforces ownership

### Economic Attack Vector

**Question:** "What if buyer signs malicious PTB that drains facilitator gas?"

**Mitigation:**

- Gas budget capped per tx (max ~0.1 SUI = ~$0.10)
- Facilitator rate-limits by address
- PTB verifier prevents complex/expensive calls (only template commands allowed)

**Cost per Transaction:**

- Gas: ~0.001 SUI (~$0.002)
- Facilitator fee: $0.01
- Net profit: ~$0.008 per transaction

---

_Presentation Final Version - February 8, 2026_  
_Solo hacker submission for ETH Global HackMoney 2026_
