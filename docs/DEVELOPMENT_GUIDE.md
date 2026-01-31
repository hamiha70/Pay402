# Pay402 Development Guide

**Purpose:** Practical guide for building and testing Pay402  
**Audience:** Developers implementing the system  
**Companion to:** `ARCHITECTURE.md` (read that first for design decisions)

---

## 🎯 Development Philosophy

### Anti-Bloat Principles

**Code:**
- ✅ Write minimal code that works
- ✅ Delete unused code immediately
- ✅ One function, one purpose
- ❌ No premature abstraction
- ❌ No "just in case" features

**Documentation:**
- ✅ One topic, one file
- ✅ Single source of truth
- ✅ Update in place (don't create summaries)
- ❌ No duplicate information
- ❌ No divergent copies

**Testing:**
- ✅ Test what you build, when you build it
- ✅ Every function gets a test before moving on
- ✅ Integration tests for critical flows
- ❌ No untested code in commits
- ❌ No "I'll test it later"

---

## 🛠️ Tech Stack & Tooling

### Overview

```
┌─────────────────────────────────────────────────┐
│ Pay402 Technology Stack                         │
├─────────────────────────────────────────────────┤
│ Move Contract:   Sui Move (Move 2024 edition)   │
│ Facilitator:     TypeScript + Express + Vitest  │
│ Widget:          React + Vite + Vitest           │
│ Demo:            Plain HTML                      │
└─────────────────────────────────────────────────┘
```

### 1. Move Contract (Blockchain)

**Language:** Move 2024  
**Compiler:** `sui move build`  
**Testing:** `sui move test`  
**Network:** SUI Testnet (then Mainnet)

**No bundler needed** - Move compiler handles everything.

---

### 2. Facilitator (Backend API)

**Runtime:** Node.js  
**Language:** TypeScript  
**Framework:** Express  
**Build:** `tsc` (TypeScript compiler)  
**Dev Server:** `tsx` (TypeScript execution)  
**Testing:** Vitest  

**Setup:**
```bash
cd facilitator
npm init -y
npm install express @mysten/sui.js cors dotenv
npm install -D typescript @types/node @types/express tsx vitest
```

**Scripts:**
```json
{
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js",
    "test": "vitest"
  }
}
```

**Why this stack:**
- ✅ No bundler needed for Node.js (runs TS directly with `tsx`)
- ✅ Fast dev experience (tsx watch)
- ✅ Simple build (tsc outputs to dist/)
- ✅ Vitest for fast testing

---

### 3. Widget (React Component → JS Bundle)

**Framework:** React + TypeScript  
**Bundler:** Vite  
**Testing:** Vitest (included with Vite)  
**Output:** Single `widget.js` file (for CDN)

**Setup:**
```bash
cd widget
npm create vite@latest . -- --template react-ts
npm install @mysten/dapp-kit @mysten/sui.js
```

**Scripts:**
```json
{
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "test": "vitest"
  }
}
```

**Why Vite:**
- ✅ Fast HMR (Hot Module Replacement)
- ✅ Bundles React → single widget.js
- ✅ Tree-shaking (small bundle size)
- ✅ Vitest included
- ✅ Modern, actively developed

**Why NOT Next.js:**
- ❌ Overkill for embedded library
- ❌ No need for SSR/routing/API routes
- ❌ Larger bundle size
- ❌ More complexity

---

### 4. Demo Page (Test Site)

**Tech:** Plain HTML + JavaScript  
**Bundler:** None (or Vite dev server for convenience)  
**Testing:** Manual

**Setup:**
```html
<!-- demo/index.html -->
<script src="http://localhost:5173/widget.js"></script>
<script>
  Pay402.init({
    facilitatorUrl: 'http://localhost:3001',
    googleClientId: 'YOUR_CLIENT_ID'
  });
</script>
```

**Serve locally:**
```bash
npx serve demo/
# Or: python3 -m http.server 8000
```

---

### Testing Strategy

| Component | Tool | What to Test |
|-----------|------|--------------|
| **Move Contract** | `sui move test` | ✅ **COMPLETE** (13 tests) |
| **Facilitator** | Vitest | PTB construction, RPC calls |
| **Widget** | Vitest (optional) | Component logic |
| **E2E** | Manual (hackathon) | Full flow via demo page |

**Move Contract Test Coverage (DONE):**
- ✅ 7 tests with SUI native token
- ✅ 6 tests with MOCK_USDC (generic `Coin<T>`)
- ✅ Happy path, insufficient balance, edge cases
- ✅ Zero amounts, zero fees, large amounts
- ✅ All expected_failure tests use `location` parameter

**For Hackathon:**
- ✅ Move tests **COMPLETE** (production-ready)
- 🎯 Next: Facilitator integration tests
- ⚠️ Widget tests (optional, if time)
- ❌ E2E tests (manual testing faster)

---

### Development Servers (3 Terminals)

```bash
# Terminal 1: Facilitator
cd facilitator && npm run dev
# Runs on: http://localhost:3001

# Terminal 2: Widget
cd widget && npm run dev
# Runs on: http://localhost:5173

# Terminal 3: Demo page
cd demo && npx serve .
# Runs on: http://localhost:3000
```

---

### Production Build

```bash
# Build widget for CDN
cd widget
npm run build  # → dist/widget.js

# Build facilitator
cd facilitator
npm run build  # → dist/

# Deploy
# Widget: Upload to S3/Cloudflare
# Facilitator: Deploy to Railway/Fly.io/Vercel
```

---

## 🏗️ Development Workflow

### Phase 1: Local Development (Move Contract)

**Goal:** Build and test Move contract on local chain first

#### 1.1 Setup Local Chain

```bash
# Start local SUI node (runs on localhost:9000)
sui start --network local

# In another terminal, check it's running
sui client envs
# Should show: localnet (active)

# Get address
sui client active-address
# Save this - you'll need it for testing
```

**Why local first:**
- ✅ Instant finality (no waiting for testnet)
- ✅ Free gas (no faucet delays)
- ✅ Fast iteration (redeploy in seconds)
- ✅ Easy debugging (logs in terminal)

#### 1.2 Create Move Project

```bash
cd Pay402
mkdir -p move
cd move
sui move new payment
cd payment

# Verify structure
tree .
# payment/
# ├── Move.toml
# └── sources/
#     (empty - we'll add payment.move next)
```

#### 1.3 Build Incrementally (Test Each Function!)

**Step 1: Minimal Contract (no logic)**
```move
// sources/payment.move
module payment::payment {
    // Empty module - just test it compiles
}
```

```bash
sui move build
# Should succeed with no errors
```

**Commit immediately:**
```bash
git add move/
git commit -m "feat(move): add minimal payment module skeleton"
```

**Step 2: Add Types (no functions)**
```move
module payment::payment {
    use sui::coin::Coin;
    
    public struct EphemeralReceipt has drop {
        payment_id: vector<u8>,
        amount: u64,
    }
}
```

```bash
sui move build
# Should compile
```

**Commit:**
```bash
git add move/payment/sources/payment.move
git commit -m "feat(move): add EphemeralReceipt struct"
```

**Step 3: Add Simple Function**
```move
public fun create_receipt(
    payment_id: vector<u8>,
    amount: u64,
): EphemeralReceipt {
    EphemeralReceipt { payment_id, amount }
}
```

**Test immediately:**
```move
// sources/payment.move (add test module at bottom)
#[test_only]
module payment::payment_tests {
    use payment::payment;
    
    #[test]
    fun test_create_receipt() {
        let receipt = payment::create_receipt(b"test123", 1000);
        // Receipt created successfully
    }
}
```

```bash
sui move test
# Should pass: 1 test passed
```

**Commit:**
```bash
git add move/payment/sources/payment.move
git commit -m "feat(move): add create_receipt function with unit test"
```

**Step 4: Add Coin Split Logic**
```move
public fun settle_payment<T>(
    buyer_coin: &mut Coin<T>,
    amount: u64,
    merchant: address,
    ctx: &mut TxContext
): EphemeralReceipt {
    use sui::coin;
    use sui::transfer;
    
    let payment = coin::split(buyer_coin, amount, ctx);
    transfer::public_transfer(payment, merchant);
    
    create_receipt(b"test", amount)
}
```

**Test with mock:**
```move
#[test]
fun test_settle_payment() {
    use sui::test_scenario;
    use sui::coin;
    use sui::sui::SUI;
    
    let user = @0xA;
    let merchant = @0xB;
    
    let mut scenario = test_scenario::begin(user);
    {
        let mut coin = coin::mint_for_testing<SUI>(1000, scenario.ctx());
        let receipt = payment::settle_payment(
            &mut coin,
            100,
            merchant,
            scenario.ctx()
        );
        coin::burn_for_testing(coin);
    };
    scenario.end();
}
```

```bash
sui move test
# Should pass: 2 tests passed
```

**Commit:**
```bash
git add move/payment/sources/payment.move
git commit -m "feat(move): add settle_payment with coin split logic"
```

**Continue this pattern for each feature:**
- Add facilitator fee split → test → commit
- Add event emission → test → commit
- Add Clock timestamp → test → commit
- Add generic Coin<T> → test → commit

**Result: ~10-15 small commits, each tested!**

#### 1.4 Deploy to Local Chain

```bash
# Build final contract
sui move build

# Deploy to local network
sui client publish --gas-budget 100000000

# Save output (you'll see):
# - PackageID: 0x...
# - Transaction Digest: ...
```

**Test deployed contract:**
```bash
# Call settle_payment via CLI
sui client call \
  --package 0xPACKAGE_ID \
  --module payment \
  --function settle_payment \
  --type-args 0x2::sui::SUI \
  --args 0xCOIN_ID 100 0xMERCHANT_ADDRESS \
  --gas-budget 10000000

# Check transaction succeeded
sui client transaction 0xTX_DIGEST
```

**Commit:**
```bash
echo "0xPACKAGE_ID" > move/payment/.deploy-local
git add move/payment/.deploy-local
git commit -m "deploy(move): deploy payment contract to local network"
```

---

### Phase 2: Testnet Deployment (After Local Works!)

**Only deploy to testnet when:**
- ✅ All unit tests pass locally
- ✅ Integration test via CLI works locally
- ✅ Contract logic is finalized (no major changes expected)

#### 2.1 Switch to Testnet

```bash
# Add testnet environment
sui client new-env --alias testnet --rpc https://fullnode.testnet.sui.io:443

# Switch to testnet
sui client switch --env testnet

# Get testnet SUI from faucet
sui client faucet

# Verify balance
sui client gas
```

#### 2.2 Deploy to Testnet

```bash
cd move/payment

# Build (same as local)
sui move build

# Deploy to testnet
sui client publish --gas-budget 100000000

# Save PackageID
echo "0xTESTNET_PACKAGE_ID" > .deploy-testnet
```

**Commit:**
```bash
git add move/payment/.deploy-testnet
git commit -m "deploy(move): deploy payment contract to SUI testnet"
```

#### 2.3 Test on Testnet

```bash
# Get testnet USDC (Circle faucet)
# Visit: https://faucet.circle.com/
# Paste your SUI address
# Wait for 20 USDC

# Test settle_payment with real USDC
sui client call \
  --package 0xTESTNET_PACKAGE_ID \
  --module payment \
  --function settle_payment \
  --type-args 0xa1ec7fc00a6f40db9693ad1415d0c193ad3906494428cf252621037bd7117e29::usdc::USDC \
  --args 0xUSDC_COIN_ID 100000 0xMERCHANT_ADDRESS 10000 b"test123" 0x6 \
  --gas-budget 10000000

# Verify on explorer
# https://testnet.suivision.xyz/txblock/0xTX_DIGEST
```

---

### Phase 3: Facilitator Development

**Start AFTER Move contract works on testnet!**

#### 3.1 Setup Project

```bash
cd Pay402
mkdir -p facilitator
cd facilitator

# Initialize Node.js project
npm init -y

# Install dependencies
npm install express @mysten/sui.js cors dotenv
npm install -D typescript @types/node @types/express tsx

# Setup TypeScript
npx tsc --init
```

#### 3.2 Build Incrementally (Test Each Endpoint!)

**Step 1: Basic Server (no logic)**
```typescript
// src/index.ts
import express from 'express';

const app = express();
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.listen(3001, () => {
  console.log('Facilitator running on http://localhost:3001');
});
```

```bash
npx tsx src/index.ts
# Test: curl http://localhost:3001/health
# Should return: {"status":"ok"}
```

**Commit:**
```bash
git add facilitator/
git commit -m "feat(facilitator): add basic express server with health check"
```

**Step 2: Add SUI Client (no endpoints yet)**
```typescript
// src/sui-client.ts
import { SuiClient, getFullnodeUrl } from '@mysten/sui.js/client';

export const client = new SuiClient({ 
  url: getFullnodeUrl('testnet') 
});

// Test connection
export async function testConnection() {
  const version = await client.getRpcApiVersion();
  console.log('Connected to SUI RPC version:', version);
}
```

```bash
# Add test script
npx tsx -e "import('./src/sui-client.js').then(m => m.testConnection())"
# Should print: Connected to SUI RPC version: ...
```

**Commit:**
```bash
git add facilitator/src/sui-client.ts
git commit -m "feat(facilitator): add SUI client with connection test"
```

**Step 3: Add /check-balance endpoint**
```typescript
// src/api/check-balance.ts
app.post('/check-balance', async (req, res) => {
  const { address, coinType } = req.body;
  
  const coins = await client.getCoins({ owner: address, coinType });
  const total = coins.data.reduce((sum, c) => sum + BigInt(c.balance), 0n);
  
  res.json({
    balance: total.toString(),
    coinIds: coins.data.map(c => c.coinObjectId)
  });
});
```

**Test immediately:**
```bash
# Start server
npx tsx src/index.ts

# In another terminal, test endpoint
curl -X POST http://localhost:3001/check-balance \
  -H "Content-Type: application/json" \
  -d '{
    "address": "0xYOUR_ADDRESS",
    "coinType": "0x2::sui::SUI"
  }'

# Should return balance and coin IDs
```

**Commit:**
```bash
git add facilitator/src/api/check-balance.ts facilitator/src/index.ts
git commit -m "feat(facilitator): add check-balance endpoint with coin discovery"
```

**Continue for each endpoint:**
- `/verify-payment` → test with mock signature → commit
- `/settle-payment` → test PTB construction → commit
- `/verify-token` → test JWT validation → commit

**Result: ~8-12 commits, each endpoint tested individually!**

---

### Phase 4: Widget Development

**Start AFTER facilitator works!**

#### 4.1 Setup React + Webpack

```bash
cd Pay402
mkdir -p widget
cd widget

npm init -y
npm install react react-dom @mysten/dapp-kit @mysten/sui.js
npm install -D webpack webpack-cli typescript @types/react ts-loader
```

#### 4.2 Build Incrementally (Test Each Component!)

**Step 1: Minimal Widget (no UI)**
```typescript
// src/Pay402.ts
export class Pay402Widget {
  constructor() {
    console.log('Pay402 widget initialized');
  }
}

(window as any).Pay402 = Pay402Widget;
```

```bash
npx webpack --mode development

# Test in browser
# Create test.html:
# <script src="dist/widget.js"></script>
# <script>new Pay402Widget();</script>
# Open in browser, check console
```

**Commit:**
```bash
git add widget/
git commit -m "feat(widget): add minimal widget skeleton"
```

**Step 2: Add Fetch Interceptor (no payment logic)**
```typescript
interceptFetch() {
  const original = window.fetch;
  window.fetch = async (...args) => {
    const res = await original(...args);
    if (res.status === 402) {
      console.log('402 detected!', res.headers.get('WWW-Authenticate'));
    }
    return res;
  };
}
```

**Test:**
```bash
# Test 402 detection
curl https://x402.payai.network/echo?message=test
# Widget should log: "402 detected! x402 amount=..."
```

**Commit:**
```bash
git add widget/src/Pay402.ts
git commit -m "feat(widget): add fetch interceptor for 402 detection"
```

**Continue for each feature:**
- Modal container → test shows/hides → commit
- zkLogin integration → test Google OAuth → commit
- Payment flow → test end-to-end → commit

---

## 🧪 Testing Strategy

### Unit Tests (Per-Function)

**Move:**
```bash
# Test each function as you write it
sui move test

# Test specific function
sui move test test_settle_payment
```

**TypeScript:**
```bash
# Use Jest or Vitest
npm test

# Test specific file
npm test check-balance.test.ts
```

### Integration Tests (Per-Component)

**Move Contract:**
```bash
# Deploy to local network
sui client publish --gas-budget 100000000

# Call via CLI
sui client call --package 0x... --module payment --function settle_payment ...

# Verify transaction succeeded
sui client transaction 0xTX_DIGEST
```

**Facilitator:**
```bash
# Start server
npm run dev

# Test with curl
curl -X POST http://localhost:3001/check-balance -d '{"address":"0x..."}'

# Test settlement flow
curl -X POST http://localhost:3001/verify-payment -d '{...}'
```

**Widget:**
```bash
# Build widget
npm run build

# Open demo page in browser
open demo/index.html

# Test payment flow manually:
# 1. Click "Get Data"
# 2. See 402 modal
# 3. Login with Google
# 4. Confirm payment
# 5. Verify content delivered
```

### End-to-End Test (Full Flow)

**After all components work individually:**

```bash
# Terminal 1: Start local SUI node
sui start --network local

# Terminal 2: Start facilitator
cd facilitator && npm run dev

# Terminal 3: Start widget dev server
cd widget && npm run dev

# Terminal 4: Start demo page
cd demo && python3 -m http.server 8000

# Browser: http://localhost:8000
# Test full flow:
# 1. Click button
# 2. 402 returned
# 3. Widget shows modal
# 4. zkLogin works
# 5. Payment settles
# 6. Content delivered
```

**Only commit when this works end-to-end!**

---

## 🧪 Move Testing Best Practices

### Test Organization

**Current Implementation:**
```
move/payment/
├── sources/
│   └── payment.move          # Contract logic
└── tests/
    └── payment_tests.move     # 13 comprehensive tests
```

### Testing Generic Coin<T>

**Always test with mock tokens** to prove generics work:

```move
// Define test-only token
#[test_only]
public struct MOCK_USDC has drop {}

#[test]
fun test_mock_usdc_payment() {
    let mut coin = coin::mint_for_testing<MOCK_USDC>(1000, ctx);
    // Test with mock token, not just SUI
}
```

**Why:** Catches type parameter bugs early, before testnet.

### Expected Failure Tests

**ALWAYS use `location` parameter** for framework errors:

```move
// ❌ BAD: Ambiguous (any module can abort with code 2)
#[expected_failure(abort_code = 2)]

// ✅ GOOD: Precise (must be from sui::balance)
#[expected_failure(abort_code = 2, location = sui::balance)]
```

**Rule:** If error originates in Sui framework (coin, balance, etc.), specify `location`.

### Test Coverage Strategy

**Minimum for production:**
1. ✅ Happy path (all parties receive correct amounts)
2. ✅ Insufficient balance (expected failure)
3. ✅ Edge cases (zero amount, zero fee, large amounts)
4. ✅ Generic token (prove `Coin<T>` works)

**Our implementation:**
- 7 SUI tests + 6 MOCK_USDC tests = 13 total
- Covers all edge cases and failure modes
- All warnings suppressed (idiomatic code)

### Running Tests

```bash
# Run all tests
sui move test --path move/payment

# Run specific test
sui move test --path move/payment test_insufficient_balance

# With gas tracking
sui move test --path move/payment -s
```

**Expected output:**
```
Test result: OK. Total tests: 13; passed: 13; failed: 0
```

---

## 📊 Testing Checklist

### Move Contract (Local)
- [x] Compiles without errors ✅
- [x] All unit tests pass (`sui move test`) ✅ **13/13 passing**
- [x] Generic `Coin<T>` tested with mock tokens ✅
- [x] Expected failures use `location` parameter ✅
- [ ] Deploys to local network
- [ ] Can call via CLI
- [ ] Event emitted correctly
- [ ] Receipt returned correctly

### Move Contract (Testnet)
- [ ] Deploys successfully
- [ ] Works with real USDC
- [ ] Gas costs acceptable (<0.01 SUI)
- [ ] Transaction visible on explorer

### Facilitator API
- [ ] `/health` returns 200
- [ ] `/check-balance` discovers coins
- [ ] `/verify-payment` validates signatures
- [ ] `/settle-payment` submits PTB
- [ ] `/verify-token` validates JWT
- [ ] Gas sponsorship works
- [ ] Error handling works

### Widget
- [ ] Loads without errors
- [ ] Intercepts 402 responses
- [ ] Shows modal overlay
- [ ] zkLogin flow works
- [ ] Balance check works
- [ ] Payment confirmation works
- [ ] Retry with token works
- [ ] Modal closes on success

### End-to-End
- [ ] Full payment flow (local)
- [ ] Full payment flow (testnet)
- [ ] Works with x402 Echo
- [ ] Transaction settles on-chain
- [ ] Content delivered to user
- [ ] No race conditions
- [ ] No front-running possible

---

## 🚨 Common Pitfalls

### 1. Testing on Testnet Too Early
**Problem:** Deploy broken code to testnet, waste gas debugging  
**Solution:** Test thoroughly on local network first

### 2. Not Testing Each Function
**Problem:** Write 10 functions, test at end, everything breaks  
**Solution:** Test each function immediately after writing

### 3. Not Committing Frequently
**Problem:** Massive commit with 500 lines, hard to review  
**Solution:** Commit after each working feature (every 30-60 min)

### 4. Ignoring Gas Costs
**Problem:** Contract uses 100 SUI per call  
**Solution:** Check gas usage on local network before testnet

### 5. Not Handling Edge Cases
**Problem:** Works with 1 coin, breaks with multiple coins  
**Solution:** Test with various scenarios (0 coins, 1 coin, many coins)

---

## 📝 Development Checklist

### Before Starting
- [ ] Read `ARCHITECTURE.md` completely
- [ ] Understand PTB mental model
- [ ] Understand widget deployment model
- [ ] Have SUI CLI installed (`sui --version`)
- [ ] Have Node.js installed (`node --version`)

### During Development
- [ ] Test each function before moving on
- [ ] Commit every 30-60 minutes
- [ ] Use semantic commit messages
- [ ] Start with local network
- [ ] Deploy to testnet only when local works
- [ ] Document complex logic in code comments
- [ ] Delete unused code immediately

### Before Hackathon Submission
- [ ] All tests pass
- [ ] Demo works end-to-end
- [ ] README has clear instructions
- [ ] Video recorded
- [ ] Code pushed to GitHub
- [ ] Contracts deployed to testnet
- [ ] No hardcoded secrets in repo

---

## 🎯 Success Criteria

### Move Contract
- Compiles without warnings
- All tests pass
- Gas cost < 0.01 SUI per call
- Works with any Coin<T>

### Facilitator
- Handles 100 req/sec
- Response time < 200ms
- No memory leaks
- Proper error handling

### Widget
- Bundle size < 200 KB
- Works in Chrome, Firefox, Safari
- No console errors
- Mobile-responsive

### Overall
- Full payment flow < 15 seconds
- No user installation required
- Works with Google OAuth
- Transaction settles on-chain

---

**Remember:** Build incrementally, test constantly, commit frequently! 🚀
