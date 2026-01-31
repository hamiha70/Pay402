# Handoff: TypeScript Facilitator Backend

**Date:** January 31, 2026  
**Status:** Move Contract COMPLETE ✅ → Ready for TypeScript Backend  

---

## 🎯 Current State

### What's DONE ✅

**Move Contract (`move/payment/sources/payment.move`):**
- ✅ Generic `Coin<T>` support (SUI, USDC, any token)
- ✅ `settle_payment<T>()` function implemented
- ✅ Anti-front-running via `&mut Coin<T>`
- ✅ Fee model: amount + fee (additive, not subtractive)
- ✅ Ephemeral receipts (zero storage)
- ✅ Event emission (`PaymentSettled`)

**Test Coverage (13 tests, 100% passing):**
- ✅ 7 tests with SUI native token
- ✅ 6 tests with MOCK_USDC (proves generics work)
- ✅ Happy path, insufficient balance, zero amounts, large amounts
- ✅ All `expected_failure` tests use `location` parameter (idiomatic)

**Documentation:**
- ✅ `ARCHITECTURE.md` - Updated with actual implementation
- ✅ `DEVELOPMENT_GUIDE.md` - Move testing best practices added
- ✅ `.cursorrules` - Source of truth hierarchy clarified

**Git Status:**
- 3 commits pushed to main
- All code tested and documented
- Ready for TypeScript phase

---

## 🚀 Next Steps: TypeScript Facilitator

### Goal
Build the facilitator backend API that orchestrates payments via PTBs (Programmable Transaction Blocks).

### Tech Stack
- **Runtime:** Node.js
- **Framework:** Express
- **Language:** TypeScript
- **SDK:** `@mysten/sui.js`
- **Dev Tool:** `tsx` (TypeScript execution)
- **Testing:** Vitest

### API Endpoints to Implement

#### 1. `GET /health`
- Simple health check
- Returns `{ status: "ok" }`

#### 2. `POST /check-balance`
```typescript
Request: {
  address: string,      // zkLogin-derived address
  network: string,      // "sui:testnet"
  coinType?: string     // Optional, default to SUI
}

Response: {
  balance: string,      // In smallest units
  coins: Array<{
    coinObjectId: string,
    balance: string
  }>
}
```

**Implementation:**
- Use `client.getCoins()` from `@mysten/sui.js`
- Filter by coin type
- Return suitable coins for payment

#### 3. `POST /settle-payment`
```typescript
Request: {
  buyerAddress: string,
  amount: string,           // u64 as string
  merchant: string,         // Merchant SUI address
  facilitatorFee: string,   // u64 as string
  paymentId: string,
  coinType: string,         // Full type path
  network: string
}

Response: {
  success: boolean,
  digest: string,           // Transaction digest
  effects: object
}
```

**Implementation:**
```typescript
import { Transaction } from '@mysten/sui.js/transactions';

// 1. Get suitable coin
const coins = await client.getCoins({ owner: buyerAddress, coinType });
const suitableCoin = coins.data.find(c => c.balance >= totalAmount);

// 2. Create PTB
const tx = new Transaction();
tx.moveCall({
  target: `${PACKAGE_ID}::payment::settle_payment`,
  typeArguments: [coinType],
  arguments: [
    tx.object(suitableCoin.coinObjectId),  // &mut Coin<T>
    tx.pure.u64(amount),
    tx.pure.address(merchant),
    tx.pure.u64(facilitatorFee),
    tx.pure.vector('u8', Array.from(Buffer.from(paymentId))),
    tx.object(CLOCK_OBJECT_ID)  // Shared clock object
  ]
});

// 3. Sign and execute (facilitator sponsors gas)
const result = await client.signAndExecuteTransaction({
  transaction: tx,
  signer: facilitatorKeypair,
  options: { showEffects: true }
});
```

---

## 📁 Project Structure

Create this structure:
```
Pay402/
├── facilitator/
│   ├── package.json
│   ├── tsconfig.json
│   ├── src/
│   │   ├── index.ts           # Express app + routes
│   │   ├── config.ts          # Environment config
│   │   ├── sui.ts             # SUI client initialization
│   │   └── controllers/
│   │       ├── health.ts
│   │       ├── balance.ts
│   │       └── payment.ts
│   └── tests/
│       └── payment.test.ts    # Vitest tests
```

---

## 🔧 Setup Steps

### 1. Initialize TypeScript Project
```bash
cd Pay402
mkdir facilitator
cd facilitator

npm init -y
npm install express @mysten/sui.js dotenv
npm install -D typescript tsx @types/express @types/node vitest
```

### 2. Create `tsconfig.json`
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ES2022",
    "moduleResolution": "bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "outDir": "./dist"
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules"]
}
```

### 3. Create `.env` (DO NOT COMMIT!)
```bash
# Facilitator private key (testnet)
FACILITATOR_PRIVATE_KEY=suiprivkey1...

# SUI network
SUI_NETWORK=testnet

# Deployed package ID (will fill after deployment)
PACKAGE_ID=

# Port
PORT=3001
```

### 4. Create `package.json` Scripts
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

---

## 🎯 Implementation Order

### Phase 1: Basic Setup (1-2 hours)
1. ✅ Create project structure
2. ✅ Initialize Express server
3. ✅ Add `/health` endpoint
4. ✅ Test with `curl`

### Phase 2: Balance Check (2-3 hours)
1. ✅ Initialize SUI client
2. ✅ Implement `/check-balance`
3. ✅ Test with actual testnet address
4. ✅ Write Vitest test

### Phase 3: Payment Settlement (3-4 hours)
1. ✅ Implement PTB construction
2. ✅ Add `/settle-payment`
3. ✅ Test on testnet with real coins
4. ✅ Write integration test

### Phase 4: Error Handling (1-2 hours)
1. ✅ Handle insufficient balance
2. ✅ Handle coin discovery failures
3. ✅ Add proper HTTP status codes
4. ✅ Add logging

---

## 🚨 Critical Notes

### Move Contract Constants
```typescript
// Will need after deployment
const PACKAGE_ID = "0x...";  // From sui client publish
const CLOCK_OBJECT_ID = "0x0000000000000000000000000000000000000000000000000000000000000006";  // Shared clock
```

### Coin Type Formats
```typescript
// SUI native
"0x2::sui::SUI"

// USDC on testnet
"0xa1ec7fc00a6f40db9693ad1415d0c193ad3906494428cf252621037bd7117e29::usdc::USDC"
```

### PTB Argument Types
```typescript
// CRITICAL: Match Move function signature exactly!
tx.pure.u64(amount)           // u64 in Move
tx.pure.address(merchant)     // address in Move
tx.pure.vector('u8', bytes)   // vector<u8> in Move
tx.object(coinId)             // &mut Coin<T> in Move
```

---

## 📚 Resources

**Sui TypeScript SDK:**
- Docs: https://sdk.mystenlabs.com/typescript
- Examples: https://github.com/MystenLabs/sui/tree/main/sdk/typescript/examples

**PTB Construction:**
- Guide: https://docs.sui.io/concepts/transactions/prog-txn-blocks
- TypeScript Examples: https://sdk.mystenlabs.com/typescript/transaction-building

**Testing:**
- Vitest: https://vitest.dev/
- Use testnet for integration tests (local too slow for client)

---

## ✅ Definition of Done

**Facilitator backend is DONE when:**
1. ✅ All 3 endpoints work (health, check-balance, settle-payment)
2. ✅ Can discover coins for a given address
3. ✅ Can construct and submit PTB to testnet
4. ✅ Transaction settles on-chain (verify on explorer)
5. ✅ Merchant and facilitator receive correct amounts
6. ✅ At least 1 integration test passes
7. ✅ Code committed with semantic commit messages

---

## 🎯 Handoff Prompt for New Chat

**Paste this into the new chat:**

```
Context: Pay402 Move contract is complete and tested (13/13 passing).
Next task: Build TypeScript facilitator backend.

Current Status:
- ✅ Move contract: settle_payment<T>() with generic Coin<T>
- ✅ Tests: 7 SUI + 6 MOCK_USDC (all edge cases covered)
- ✅ Docs: ARCHITECTURE.md and DEVELOPMENT_GUIDE.md updated
- 📍 YOU ARE HERE: Ready to build facilitator API

Goal: Implement facilitator backend with 3 endpoints:
1. GET /health
2. POST /check-balance (discover coins via SUI RPC)
3. POST /settle-payment (construct PTB, submit to chain)

Tech Stack:
- Node.js + Express
- TypeScript (strict mode)
- @mysten/sui.js SDK
- tsx for development
- Vitest for testing

Reference: See HANDOFF_TYPESCRIPT.md for full implementation plan.

Let's start with basic Express setup and /health endpoint.
```

---

**Ready to start new chat!** 🚀
