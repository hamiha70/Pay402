# Pay402 - Hackathon Presentation

**Event:** ETH Global HackMoney January 2026  
**Project:** Pay402 🐠 - Zero-Friction x402 Payments on SUI  
**Duration:** 5 minutes (with backup slides for Q&A/extended reading)  
**Demo URL:** https://pay402.io (testnet)

---

## Presentation Structure

This presentation serves two purposes:

1. **Live delivery aid** - Key points for 5-minute pitch + demo
2. **Standalone document** - Self-contained explanation for judges reading submissions

---

## SLIDE 1: Title

**Title:** Pay402 🐠  
**Subtitle:** Zero-Friction Crypto Payments. No Wallet Required.

**Visual:** Banner image (gradient background with logo)

**Tagline:** "Google Login → Blockchain Payment. 3 Clicks."

---

## SLIDE 2: The Problem

**Title:** "Crypto Payments Have a UX Crisis"

### The Current State

**For users wanting to pay $0.10 for API access:**

| Step | Traditional Crypto            | Time     |
| ---- | ----------------------------- | -------- |
| 1    | Install wallet extension      | 2 min    |
| 2    | Write down seed phrase        | 3 min    |
| 3    | Create exchange account (KYC) | 1-3 days |
| 4    | Buy crypto                    | 5 min    |
| 5    | Transfer to wallet            | 10 min   |
| 6    | Connect wallet to site        | 1 min    |
| 7    | Approve transaction           | 30 sec   |
| 8    | Pay gas fees                  | -        |

**Total:** Days of setup for a $0.10 payment

### The Result

> "90%+ of potential users abandon at wallet installation"

**The irony:** Blockchain enables instant, global, permissionless payments... but onboarding takes days.

---

## SLIDE 3: The Solution

**Title:** "Pay402: 3 Clicks. No Wallet. Done."

### Pay402 Flow

| Step | Action             | Time  |
| ---- | ------------------ | ----- |
| 1    | Click payment link | 1 sec |
| 2    | Login with Google  | 3 sec |
| 3    | Confirm payment    | 1 sec |

**Total:** ~5 seconds (with funded account)

### What Makes This Possible

- **zkLogin** - Google OAuth creates a blockchain address
- **Gas Sponsorship** - Facilitator pays transaction fees
- **x402 Protocol** - HTTP native payment requests

**Screenshot placeholder:** `[x402_Payment-Request_2026-02-04.png]`

---

## SLIDE 4: How It Works (Architecture)

**Title:** "Under The Hood"

### System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        USER'S BROWSER                           │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  Pay402 Widget                                            │  │
│  │  • Detects HTTP 402 response                              │  │
│  │  • Triggers zkLogin (Google OAuth)                        │  │
│  │  • Verifies transaction before signing                    │  │
│  │  • Signs with ephemeral key (zkLogin)                     │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────┬─────────────────────────┬─────────────────┘
                      │                         │
                      ▼                         ▼
            ┌─────────────────┐       ┌─────────────────┐
            │    MERCHANT     │       │   FACILITATOR   │
            │                 │       │                 │
            │ • Issues 402    │       │ • Builds PTB    │
            │ • Signs invoice │       │ • Sponsors gas  │
            │ • Verifies pay  │       │ • Submits tx    │
            └────────┬────────┘       └────────┬────────┘
                     │                         │
                     └──────────┬──────────────┘
                                ▼
                      ┌─────────────────┐
                      │  SUI BLOCKCHAIN │
                      │                 │
                      │ • Settles USDC  │
                      │ • Emits receipt │
                      │ • Immutable log │
                      └─────────────────┘
```

### Key Innovation: Non-Custodial with Zero Friction

- User **owns** their coins (derived from Google identity)
- User **verifies** transaction before signing
- User **never** manages private keys
- Facilitator **cannot** spend user funds without user signature

---

## SLIDE 5: Why SUI & Move?

**Title:** "Built on SUI - And Here's Why"

### SUI-Specific Advantages for Pay402

| Feature             | SUI           | EVM (Ethereum)      | Why It Matters                  |
| ------------------- | ------------- | ------------------- | ------------------------------- |
| **zkLogin**         | Native        | Not available       | Google → Address without wallet |
| **PTBs**            | Native        | N/A                 | Atomic multi-step transactions  |
| **Object Model**    | Owned objects | Global state        | No frontrunning on user coins   |
| **Finality**        | ~400ms        | ~12 min             | Instant payment confirmation    |
| **Gas Sponsorship** | Built-in      | Complex workarounds | Facilitator pays, user doesn't  |
| **Generic Coins**   | `Coin<T>`     | Token-specific      | One contract, any stablecoin    |

### zkLogin: The Game Changer

```
Traditional:  Wallet Extension → Private Key → Address
zkLogin:      Google OAuth → ZK Proof → Deterministic Address
```

**Result:** Same security guarantees, zero user friction.

### Programmable Transaction Blocks (PTBs)

```move
// One atomic transaction:
1. Split user's USDC coin → exact payment amount
2. Transfer to merchant
3. Emit receipt event
4. Return change to user

// All or nothing. No partial state. No frontrunning.
```

**This architecture is only possible on SUI.**

---

## SLIDE 6: Live Demo

**Title:** "Let's See It Work"

**Demo URL:** https://pay402.io

### Demo Flow (Record This)

**Scenario:** User purchases premium API data for $0.10 USDC

1. **Visit merchant** → `https://pay402.io/demo`

   - Click "Get Premium Data ($0.10)"
   - **Screenshot:** `[x402_Payment-Request_2026-02-04.png]`

2. **HTTP 402 triggers widget**

   - Widget opens automatically
   - Shows: Merchant, Amount, Resource

3. **Sign in with Google**

   - Standard OAuth flow
   - Address derived: `0xabc...` (no wallet!)

4. **[First time only] Get test USDC**

   - Click "Fund (Demo Faucet)"
   - **Screenshot:** `[x402_Review-Payment_before-Faucet_2026-02-04.png]`
   - **Screenshot:** `[x402_Review-Payment_after-Faucet_2026-02-04.png]`

5. **Review & Verify Transaction**

   - Widget shows PTB verification:
     - ✅ Amount matches invoice
     - ✅ Recipient is merchant
     - ✅ No unauthorized transfers
     - ✅ Receipt will be emitted
   - **Screenshot:** `[x402_PTB-Verification-Passed_2026-02-04.png]`

6. **Confirm Payment**

   - One click to sign
   - Transaction submitted
   - **Screenshot:** `[x402_Payment-Succesful_2026-02-04.png]`

7. **Content Delivered**

   - Redirect to merchant
   - Premium data displayed
   - **Screenshot:** `[x402_Premium-Content_Pessimistic_2026-04-02.png]`

8. **On-chain proof**
   - Transaction visible on blockchain
   - **Screenshot:** `[x402_tx-block_local-blockchain_2026-02-04.png]`

### Key Demo Callouts

- "No wallet installed on this browser"
- "No seed phrase anywhere"
- "User pays zero gas"
- "Transaction verified before signing"
- "Receipt permanent on blockchain"

---

## SLIDE 7: Performance

**Title:** "How Fast Is It?"

### Measured Latency: Request → Content Delivered

| Mode            | Description                               | Latency | Use Case                  |
| --------------- | ----------------------------------------- | ------- | ------------------------- |
| **Optimistic**  | Deliver after submission, before finality | ~100ms  | Low-value, high-volume    |
| **Pessimistic** | Deliver after on-chain confirmation       | ~600ms  | Higher-value transactions |

### Optimistic Settlement Breakdown

```
[0ms]    User clicks "Pay"
[5ms]    Widget signs transaction (zkLogin)
[10ms]   POST to facilitator
[15ms]   Facilitator validates signature
[35ms]   Facilitator checks balance (RPC)
[45ms]   Facilitator submits to blockchain
[50ms]   HTTP response: "SAFE TO DELIVER"
[60ms]   Redirect to merchant
[70ms]   Content delivered ✅

[500ms]  Background: Transaction finalized
```

**Key insight:** Facilitator acts as guarantor. Merchant trusts facilitator's validation, delivers instantly.

### Return Visit (Funded User)

| Action                   | Time           |
| ------------------------ | -------------- |
| Click payment link       | 1 sec          |
| Sign with Google session | 0 sec (cached) |
| Confirm payment          | 1 sec          |
| Content delivered        | <1 sec         |

**Total:** ~2-3 seconds for repeat purchases

---

## SLIDE 8: Security Model

**Title:** "Trust, But Verify"

### Non-Custodial Design

| Property                 | Guarantee                                   |
| ------------------------ | ------------------------------------------- |
| **Coin Ownership**       | User owns coins at zkLogin-derived address  |
| **Transaction Signing**  | Only user can sign (zkLogin proof required) |
| **PTB Verification**     | Widget verifies transaction matches invoice |
| **Receipt Immutability** | On-chain event, permanent audit trail       |

### What The Facilitator CANNOT Do

- ❌ Spend user funds without signature
- ❌ Alter payment amount (PTB verified client-side)
- ❌ Redirect funds to wrong address (PTB verified)
- ❌ Deny payment happened (on-chain receipt)

### What The Facilitator CAN Do

- ✅ Refuse service (availability, not security)
- ✅ Construct PTB (but user verifies before signing)
- ✅ Sponsor gas (facilitator's cost)

### PTB Verification (Client-Side)

```typescript
// User's browser verifies BEFORE signing:
✓ Only allowed commands (Split, Transfer, MoveCall)
✓ Transfer amount matches invoice exactly
✓ Recipient matches merchant address
✓ No unauthorized transfers
✓ Receipt emission included
```

**Screenshot:** `[x402_PTB-Verification-Passed_2026-02-04.png]`

---

## SLIDE 9: Technical Implementation

**Title:** "What We Built"

### Components

| Component           | Tech Stack                   | Status              |
| ------------------- | ---------------------------- | ------------------- |
| **Smart Contract**  | SUI Move, generic `Coin<T>`  | ✅ 18 tests passing |
| **Facilitator API** | Node.js, TypeScript, Express | ✅ Complete         |
| **Payment Widget**  | React, Vite, Enoki SDK       | ✅ Complete         |
| **PTB Verifier**    | TypeScript, @mysten/sui      | ✅ 77 tests passing |
| **Demo Merchant**   | Node.js, Express             | ✅ Complete         |

### Move Contract: Generic Settlement

```move
public entry fun settle_payment<T>(
    payment_coin: Coin<T>,
    merchant: address,
    payment_id: vector<u8>,
    invoice_hash: vector<u8>,
    ctx: &mut TxContext
) {
    transfer::public_transfer(payment_coin, merchant);
    event::emit(ReceiptEmitted { ... });
}
```

**Works with any `Coin<T>`** - USDC, SUI, USDT, custom tokens.

### Facilitator API Endpoints

```
GET  /health           - Network status
POST /check-balance    - User USDC balance
POST /build-ptb        - Construct payment transaction
POST /submit-payment   - Submit signed transaction
POST /fund             - Demo faucet (testnet only)
```

### Test Coverage

- Facilitator: 181 tests
- Widget: 77 tests
- Move Contract: 18 tests
- **All passing on localnet and testnet**

---

## SLIDE 10: Business Model

**Title:** "Economics"

### Fee Structure

| Transaction Value | Facilitator Fee | Percentage |
| ----------------- | --------------- | ---------- |
| $0.10             | $0.01           | 10%        |
| $1.00             | $0.01           | 1%         |
| $10.00            | $0.01           | 0.1%       |

**Fixed $0.01 per transaction** - Fair for micropayments, trivial for larger amounts.

### Why Fixed Fee?

- Facilitator cost is fixed (gas ~$0.003 + overhead ~$0.002)
- Micropayments need predictable, low fees
- Percentage-based would kill $0.10 use cases

### Target Use Cases

| Use Case           | Transaction Size | Volume Potential |
| ------------------ | ---------------- | ---------------- |
| API monetization   | $0.01 - $1.00    | Very high        |
| Premium content    | $0.10 - $5.00    | High             |
| AI agent payments  | $0.001 - $0.10   | Extremely high   |
| Paywalled articles | $0.10 - $0.50    | High             |

### Unit Economics

```
Revenue per tx:      $0.01
Cost per tx:        ~$0.005 (gas + infrastructure)
Profit per tx:      ~$0.005

Break-even:          2,000 tx/day → $10/day
Sustainable:        20,000 tx/day → $100/day
```

---

## SLIDE 11: Roadmap

**Title:** "What's Next"

### Completed (Hackathon)

- ✅ Move contract with generic `Coin<T>` settlement
- ✅ Facilitator backend (PTB construction, gas sponsorship)
- ✅ Payment widget with zkLogin integration
- ✅ Client-side PTB verification
- ✅ Optimistic & pessimistic settlement modes
- ✅ Testnet deployment

### Next Steps (Post-Hackathon)

| Phase | Milestone                                          | Timeline |
| ----- | -------------------------------------------------- | -------- |
| 1     | Mainnet deployment                                 | Q1 2026  |
| 2     | Browser extension (Tier 2 verifier)                | Q1 2026  |
| 3     | CCTP integration (cross-chain from Base, Ethereum) | Q2 2026  |
| 4     | Merchant SDK (npm package)                         | Q2 2026  |
| 5     | AI agent API keys                                  | Q2 2026  |

### Cross-Chain Vision

```
User on Ethereum → CCTP bridge → SUI USDC → Pay402 → Merchant
```

**Circle CCTP enables:** Pay from any chain, settle on SUI.

---

## SLIDE 12: Closing

**Title:** "Pay402 🐠"

### The Pitch

> **"We made crypto payments feel like Stripe."**
>
> - No wallet
> - No seed phrase
> - No gas fees for users
> - 3 clicks to pay
>
> **Built on SUI because only SUI has zkLogin + PTBs + instant finality.**

### Try It

**Live Demo:** https://pay402.io  
**GitHub:** [repository link]  
**Contact:** [email/discord]

---

## BACKUP SLIDES

_(For Q&A or extended reading)_

---

## BACKUP: x402 Protocol Explained

**What is HTTP 402?**

```http
GET /premium-data HTTP/1.1
Host: api.merchant.com

HTTP/1.1 402 Payment Required
X-X402-Invoice-JWT: eyJhbGciOiJFZERTQSJ9...
Content-Type: application/json

{
  "error": "Payment required",
  "amount": "100000",
  "currency": "USDC",
  "facilitator_url": "https://pay402.io/pay"
}
```

**402 was reserved in HTTP/1.1 (1999) for "future use"** - we're finally using it.

### Invoice JWT Structure

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
  "resource": "/premium-data"
}
```

Signed by merchant → Facilitator cannot alter terms.

---

## BACKUP: zkLogin Deep Dive

### How zkLogin Works

```
1. User authenticates with Google
2. Google returns JWT with user ID (sub claim)
3. Enoki salt service provides deterministic salt
4. Address = Hash(provider + user_id + salt)
5. ZK proof proves: "I know the JWT that derives this address"
6. Blockchain verifies proof, executes transaction
```

### Security Properties

| Property          | Traditional Wallet  | zkLogin                               |
| ----------------- | ------------------- | ------------------------------------- |
| Key storage       | User responsibility | OAuth provider                        |
| Recovery          | Seed phrase         | OAuth re-auth                         |
| Address stability | Permanent           | Permanent (same OAuth = same address) |
| Compromise risk   | Seed phrase leak    | OAuth account compromise              |

**Trade-off:** Dependency on OAuth provider, but dramatically better UX.

---

## BACKUP: Competitor Comparison

| Feature         | Pay402       | Coinbase x402 | Stripe Crypto |
| --------------- | ------------ | ------------- | ------------- |
| Wallet required | No (zkLogin) | Yes           | Yes           |
| User gas fees   | None         | User pays     | User pays     |
| Chain           | SUI          | Base/Ethereum | Ethereum      |
| Settlement      | ~400ms       | ~12 min       | ~12 min       |
| Embeddable      | Yes          | Extension     | Limited       |
| Token support   | Any Coin<T>  | Specific      | Specific      |

**Pay402 is the only non-custodial solution with zero wallet friction.**

---

## BACKUP: PTB Verification Details

### Allowed PTB Commands

Only these commands are permitted in a payment PTB:

1. **SplitCoins** - Create exact payment amount from user's coin
2. **TransferObjects** - Send payment to merchant, change to user
3. **MoveCall** - Only to `payment::settle_payment` or `payment::emit_receipt`

### Verification Invariants

```typescript
function verifyPaymentPTB(ptbBytes, invoice): VerificationResult {
  // 1. Parse PTB from raw bytes (not facilitator summary!)
  const ptb = deserialize(ptbBytes);

  // 2. Only allowed commands
  for (cmd of ptb.commands) {
    if (!ALLOWED_COMMANDS.includes(cmd.type)) {
      return FAIL("Disallowed command");
    }
  }

  // 3. Exactly one transfer of exact amount to merchant
  const merchantTransfer = findTransfer(ptb, invoice.payTo, invoice.amount);
  if (!merchantTransfer) return FAIL("Payment transfer not found");

  // 4. No unauthorized transfers
  for (transfer of ptb.transfers) {
    if (transfer.to !== invoice.payTo && transfer.to !== buyerAddress) {
      return FAIL("Unauthorized transfer");
    }
  }

  // 5. Receipt emission with correct invoice hash
  const receipt = findReceiptCall(ptb);
  if (receipt.invoiceHash !== sha256(invoiceJwt)) {
    return FAIL("Invoice hash mismatch");
  }

  return PASS;
}
```

---

## BACKUP: Gas Sponsorship Explained

### How It Works

```typescript
// Facilitator builds PTB:
const ptb = new Transaction();

// Payment from buyer's coins
ptb.splitCoins(buyerCoin, [amount]);
ptb.transferObjects([paymentCoin], merchant);

// But gas comes from facilitator
ptb.setSender(buyerAddress); // Buyer initiates
ptb.setGasOwner(facilitatorAddress); // Facilitator pays gas
ptb.setGasPayment(facilitatorGasCoins);
```

### Why This Is Safe

- Buyer signature authorizes USDC spend (their coins)
- Facilitator signature authorizes SUI gas spend (their coins)
- Neither can spend the other's funds
- SUI's object model enforces ownership

---

## BACKUP: Receipt Architecture

### On-Chain Event

```move
struct PaymentSettled has copy, drop {
    payment_id: vector<u8>,
    invoice_hash: vector<u8>,
    buyer: address,
    merchant: address,
    amount: u64,
    coin_type: TypeName,
    timestamp: u64
}
```

### Why Events (not Objects)

| Approach | Storage Cost | Queryable     | Audit Trail |
| -------- | ------------ | ------------- | ----------- |
| Events   | Free         | Yes (indexed) | Permanent   |
| Objects  | ~0.003 SUI   | Yes           | Permanent   |

Events are cheaper and sufficient for merchant reconciliation.

### Merchant Verification

```typescript
// Merchant checks payment on-chain
const tx = await sui.getTransaction(digest);
const receipt = tx.events.find((e) => e.type.includes("PaymentSettled"));

// Verify: invoice hash, amount, recipient match
assert(receipt.invoice_hash === expectedHash);
assert(receipt.amount === invoiceAmount);
assert(receipt.merchant === ourAddress);

// ✅ Payment confirmed - deliver content
```

---

_Presentation v1.0 - February 5, 2026_  
_Solo hacker submission for ETH Global HackMoney 2026_
