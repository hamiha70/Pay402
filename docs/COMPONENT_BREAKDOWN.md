# Pay402 - Component Breakdown & Implementation Strategy

**Project:** Pay402  
**Purpose:** Break down implementation into components and integration levels  
**Date:** February 1, 2026  
**Status:** Ready for Implementation

---

## Implementation Philosophy

**Incremental Integration over Complete Components**

We build in **integration levels**, not component-by-component:
- ✅ Level 0: Each component's "hello world" works independently
- ✅ Level 1: Simple end-to-end flow (hardcoded values, minimal features)
- ✅ Level 2: Full features (dynamic data, error handling, edge cases)
- ✅ Level 3: Polish (attack demo, optimizations, monitoring)

**Why this approach:**
- Test integration points early (find bugs fast)
- Always have a working demo (even if simple)
- Easier to stabilize (one flow at a time)
- Better for hackathon (can stop at any level and still demo)

---

## Component Overview

```
┌─────────────────────────────────────────────────┐
│                Components                        │
├─────────────────────────────────────────────────┤
│                                                 │
│ 1. Move Contract          (✅ DONE)             │
│    └─ settle_payment<T>() + receipt emission    │
│                                                 │
│ 2. Facilitator Backend    (⚠️ PARTIAL)          │
│    ├─ /health             (✅ done)             │
│    ├─ /check-balance      (✅ done)             │
│    ├─ /settle-payment     (⚠️ needs PTB)        │
│    ├─ /submit-signature   (❌ new)              │
│    └─ /fund               (❌ new)              │
│                                                 │
│ 3. PTB Verifier           (❌ NEW, CRITICAL)    │
│    └─ Template verification logic               │
│                                                 │
│ 4. Payment Page           (❌ NEW)              │
│    ├─ zkLogin integration (Enoki)               │
│    ├─ Verification display                      │
│    └─ Payment flow UI                           │
│                                                 │
│ 5. Demo Merchant          (❌ NEW)              │
│    ├─ 402 endpoint                              │
│    ├─ Invoice JWT generation                    │
│    └─ Verification callback                     │
│                                                 │
└─────────────────────────────────────────────────┘
```

---

## Integration Levels

### Level 0: Component "Hello World" (Day 1 Morning)

**Goal:** Each component runs independently

**Tasks:**

**A. Move Contract** ✅ Done
- Already deployed to localnet
- Tests passing (13/13)

**B. Facilitator Backend** ⚠️ Extend
- [x] Health endpoint works
- [x] Check balance works
- [ ] Add stub `/submit-signature` (returns mock tx digest)
- [ ] Add stub `/fund` (returns mock success)

**C. PTB Verifier** (new module)
- [ ] Create `widget/src/verifier.ts`
- [ ] Implement basic structure (parse PTB, return mock result)
- [ ] Unit test: accepts valid mock PTB

**D. Payment Page** (new project)
- [ ] Setup React + Vite
- [ ] Create basic page that displays "Payment Page Works"
- [ ] Parse URL params (invoice_jwt, callback)
- [ ] Display invoice details (hardcoded for now)

**E. Demo Merchant** (new project)
- [ ] Setup Express
- [ ] Serve static HTML page with "Get Data" button
- [ ] Create hardcoded 402 endpoint (returns fixed JWT)
- [ ] Create stub verify endpoint (always returns success)

**Test:** Can open each component's URL and see it respond

---

### Level 1: Simple End-to-End Flow (Day 1 Afternoon - Day 2)

**Goal:** One complete payment flow with hardcoded/simplified logic

**Simplifications:**
- Hardcoded merchant JWT (no real signing yet)
- Skipped zkLogin (use pre-existing test address)
- Simplified verifier (check only one rule)
- Mock funding (assume address has USDC)
- No error handling yet

**Flow:**
```
1. Open demo merchant page
2. Click "Get Data"
3. See 402 response
4. Manually copy invoice JWT
5. Open payment page with JWT in URL
6. See invoice details
7. Click "Pay" (skips zkLogin, uses test address)
8. Facilitator constructs PTB
9. Verifier checks (one rule only)
10. Sign with test key
11. Facilitator submits
12. Redirect to merchant callback
13. Merchant verifies (checks tx exists)
14. Content displayed
```

**Tasks:**

**Facilitator:**
- [ ] Implement `/settle-payment` (constructs real PTB)
  - [ ] Query buyer coins
  - [ ] Select coins
  - [ ] Build PTB (split, transfer, emit receipt)
  - [ ] Return PTB bytes to payment page
- [ ] Implement `/submit-signature` (submits to SUI)
  - [ ] Accept signed PTB
  - [ ] Submit to localnet RPC
  - [ ] Return tx digest
- [ ] Add invoice JWT parsing
- [ ] Compute invoice hash

**PTB Verifier:**
- [ ] Implement core verification logic
  - [ ] Parse PTB bytes (use `Transaction.from()`)
  - [ ] Check: only allowed commands (template)
  - [ ] Check: exact amount to merchant
  - [ ] Return pass/fail + reason
- [ ] Unit tests (5-10 test cases)

**Payment Page:**
- [ ] Fetch balance from facilitator
- [ ] Request PTB from facilitator
- [ ] Display PTB summary
- [ ] Run verifier on PTB
- [ ] Display verification result
- [ ] Sign PTB (use test keypair for now, not zkLogin)
- [ ] Submit signature to facilitator
- [ ] Redirect to callback URL with tx digest

**Demo Merchant:**
- [ ] Generate real invoice JWT (EdDSA signing)
- [ ] Return JWT in 402 response
- [ ] Implement verify callback
  - [ ] Query SUI for transaction
  - [ ] Check receipt event
  - [ ] Verify invoice hash matches
  - [ ] Return content if verified

**Test:** Complete payment from merchant demo → payment page → on-chain → merchant callback

**Success Criteria:**
- See 402 response with JWT
- Payment page shows invoice
- Verifier shows "PASS"
- Transaction succeeds on localnet
- Merchant delivers content

---

### Level 2: Full Features (Day 2-3)

**Goal:** Add all core features (zkLogin, funding, error handling)

**Tasks:**

**Payment Page:**
- [ ] Integrate Enoki zkLogin
  - [ ] Setup Enoki client
  - [ ] Implement Google OAuth flow
  - [ ] Derive zkLogin address
  - [ ] Manage session (ephemeral key + proof)
- [ ] Handle funding flow
  - [ ] Check balance = 0
  - [ ] Show "Fund" button
  - [ ] Call facilitator `/fund`
  - [ ] Display new balance
- [ ] Error handling
  - [ ] Network errors (retry)
  - [ ] Verification failures (display clearly)
  - [ ] Transaction failures (show tx digest + error)
- [ ] UX polish
  - [ ] Loading states
  - [ ] Progress indicators
  - [ ] Success/failure animations

**Facilitator:**
- [ ] Implement `/fund` (real faucet)
  - [ ] Check if already funded (idempotency)
  - [ ] Transfer 2 USDC to address
  - [ ] Return tx digest
- [ ] Handle zkLogin signatures
  - [ ] Parse zkLogin signature bundle
  - [ ] Verify signature format
- [ ] Error handling
  - [ ] Insufficient buyer balance
  - [ ] RPC errors
  - [ ] Invalid PTB
- [ ] Logging (structured logs)

**PTB Verifier:**
- [ ] Complete all 6 invariant checks
  - [ ] Asset type match
  - [ ] Exact payment amount
  - [ ] No unauthorized transfers
  - [ ] Receipt emission correct
  - [ ] Expiry check (client-side)
  - [ ] Invoice hash match
- [ ] Comprehensive test suite (20+ test cases)
  - [ ] Valid PTBs (multiple variations)
  - [ ] Invalid PTBs (each rule violated)
  - [ ] Edge cases (zero amount, huge amount, etc.)

**Demo Merchant:**
- [ ] Multiple endpoints (different prices)
  - [ ] /api/premium-data ($0.01)
  - [ ] /api/ultra-premium ($0.10)
- [ ] Proper error handling
  - [ ] Invalid payment_id
  - [ ] TX not found
  - [ ] Receipt mismatch
- [ ] Store invoices (in-memory for demo)

**Test:** Complete flows including:
- First-time user (funding required)
- Repeat payment (no funding)
- Multiple resources (different prices)
- Error scenarios (insufficient balance, etc.)

**Success Criteria:**
- zkLogin works (Google login → address)
- Auto-funding works
- Multiple payments without re-setup
- Errors displayed clearly

---

### Level 3: Polish & Demo Features (Day 3-4)

**Goal:** Attack demo, optimizations, monitoring

**Tasks:**

**Attack Demo:**
- [ ] Add `DEMO_ATTACK_MODE` env var to facilitator
- [ ] When enabled: construct PTB with wrong amount
- [ ] Payment page verifier catches and blocks
- [ ] UI shows: "❌ Transaction rejected: Amount mismatch"
- [ ] Add toggle in demo merchant page to enable attack mode

**Optimizations:**
- [ ] Gas profiling (minimize SUI spent)
- [ ] PTB construction optimization (fewer steps)
- [ ] Frontend bundle size (code splitting)

**Monitoring:**
- [ ] Add request logging (facilitator)
- [ ] Add event tracking (payment success rate)
- [ ] Add RPC call metrics

**Demo Polish:**
- [ ] Landing page (explain Pay402)
- [ ] Demo walkthrough (step-by-step guide)
- [ ] Merchant "Audit" panel (show receipt on-chain)
- [ ] Visual improvements (animations, transitions)

**Deployment:**
- [ ] Deploy to Vercel
- [ ] Configure custom domain (pay402.io or pay402.vercel.app)
- [ ] Test deployed version
- [ ] Prepare demo script

**Success Criteria:**
- Attack demo works (impressive for judges)
- Deployed version accessible
- Demo script rehearsed (<90 seconds)

---

## Component Details

### 1. PTB Verifier (Critical New Component)

**Location:** `widget/src/verifier.ts`

**Exports:**
```typescript
export interface VerificationResult {
  pass: boolean;
  reason?: string;
}

export function verifyPaymentPTB(
  ptbBytes: Uint8Array,
  invoice: InvoiceJWT
): VerificationResult;
```

**Dependencies:**
- `@mysten/sui/transactions` (PTB parsing)
- `crypto-js` or `@noble/hashes` (SHA-256 for invoice hash)

**Test file:** `widget/src/verifier.test.ts`

**Priority:** HIGH (blocks payment page Level 1)

---

### 2. Payment Page (New React Project)

**Location:** `widget/` (rename from previous plans)

**Tech Stack:**
- React 18 + TypeScript
- Vite (dev server + build)
- Enoki SDK (zkLogin)
- Tailwind CSS (styling)

**Components:**
```
widget/src/
├── App.tsx                   # Main component
├── components/
│   ├── InvoiceSummary.tsx    # Display invoice details
│   ├── VerificationDisplay.tsx # Show verifier results
│   ├── SignInButton.tsx      # Google OAuth button
│   ├── FundingFlow.tsx       # Fund if needed
│   └── PaymentButton.tsx     # Sign and pay
├── hooks/
│   ├── useZkLogin.ts         # Enoki integration
│   └── useFacilitator.ts     # API calls
├── verifier.ts               # PTB verification
└── types.ts                  # TypeScript types
```

**Setup:**
```bash
cd Pay402
npm create vite@latest widget -- --template react-ts
cd widget
npm install @mysten/enoki @mysten/sui tailwindcss
npm install -D @types/node vitest
```

**Priority:** HIGH (core component)

---

### 3. Demo Merchant (New Express Project)

**Location:** `demo/` (new directory)

**Tech Stack:**
- Express 5 + TypeScript
- jsonwebtoken (JWT signing)
- @mysten/sui (RPC queries)

**Endpoints:**
```
GET /                    # Demo page HTML
GET /api/premium-data    # 402 endpoint ($0.01)
GET /api/verify          # Payment callback
```

**Setup:**
```bash
cd Pay402
mkdir demo && cd demo
npm init -y
npm install express jsonwebtoken @mysten/sui
npm install -D typescript tsx @types/express @types/jsonwebtoken
```

**Files:**
```
demo/
├── src/
│   ├── server.ts         # Express server
│   ├── invoice.ts        # JWT generation
│   └── verify.ts         # Payment verification
├── public/
│   └── index.html        # Demo page
├── package.json
└── tsconfig.json
```

**Priority:** MEDIUM (needed for Level 1 integration)

---

### 4. Facilitator Extensions

**New endpoints needed:**

**`POST /submit-signature`**
```typescript
interface SubmitSignatureRequest {
  ptbBytes: string;        // base64
  signature: string;
  zkProof?: string;        // For zkLogin
  ephemeralPublicKey?: string;
}

interface SubmitSignatureResponse {
  txDigest: string;
  receipt: ReceiptEvent;
}
```

**`POST /fund`**
```typescript
interface FundRequest {
  address: string;
  sessionId: string;  // For idempotency
}

interface FundResponse {
  funded: boolean;
  alreadyFunded?: boolean;
  amount: number;
  txDigest?: string;
  balance: number;
}
```

**Priority:** HIGH (needed for Level 1)

---

## Development Environment Setup

### Prerequisites

- ✅ Suibase installed and running
- ✅ Node.js 20+
- ✅ Move contract deployed to localnet

### Workspace Setup

```bash
cd Pay402

# Facilitator (already exists, extend)
cd facilitator
npm install

# Widget (new)
npm create vite@latest widget -- --template react-ts
cd widget
npm install @mysten/enoki @mysten/sui
npm install -D vitest

# Demo merchant (new)
mkdir demo && cd demo
npm init -y
npm install express jsonwebtoken @mysten/sui tsx
npm install -D typescript @types/express @types/jsonwebtoken
```

### Running All Components (tmux)

```bash
# Use the pay402-tmux.sh script, or manually:
tmux new -s pay402

# Pane 1: Facilitator
cd facilitator && npm run dev

# Pane 2: Widget
# (split) cd widget && npm run dev

# Pane 3: Demo merchant
# (split) cd demo && npm run dev

# Pane 4: Suibase
# (split) localnet status
```

---

## Testing Strategy Per Level

### Level 0 Tests
- [ ] Each component responds to HTTP requests
- [ ] Health checks pass
- [ ] No crashes on startup

### Level 1 Tests
- [ ] Can complete one payment end-to-end
- [ ] Transaction appears on localnet
- [ ] Merchant callback receives tx digest

### Level 2 Tests
- [ ] zkLogin address derivation works
- [ ] Funding works (idempotent)
- [ ] Verifier catches all invalid PTBs
- [ ] Error states display correctly

### Level 3 Tests
- [ ] Attack demo works
- [ ] Deployed version works
- [ ] Performance acceptable (< 5s per payment)

---

## Next Step: Generate TODOs

Ready to create detailed TODO lists for each level?

**Suggested format:**
- Separate TODO list per integration level
- Each TODO is small (< 1 hour work)
- Clear acceptance criteria
- Priority marked

Shall I proceed with TODO generation?

---

**Last Updated:** February 1, 2026  
**Version:** 1.0 (Initial)  
**Ready for:** Implementation
