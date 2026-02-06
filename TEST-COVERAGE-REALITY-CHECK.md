# Test Coverage Reality Check: What We Actually Test vs. What We Need

## Executive Summary

**Current State:** We have solid backend payment infrastructure tests, but **ZERO zkLogin/Enoki integration tests**.

**Gap:** The core differentiator (Google login → blockchain payments) is **NOT tested at all**.

---

## What Our Tests ACTUALLY Cover

### ✅ Localnet Tests (176 passing)

#### 1. **Backend Payment Infrastructure** (96% coverage)

- PTB construction logic
- Transaction signing mechanics
- API endpoint validation
- Sponsored transaction flow
- Balance queries
- Network configuration

**What this means:**

- We can **build** payment transactions ✅
- We can **sign** transactions with Ed25519 keypairs ✅
- We can **submit** to blockchain ✅
- We can **verify** balances ✅

**What this does NOT mean:**

- ❌ No Google OAuth testing
- ❌ No zkLogin address derivation testing
- ❌ No Enoki flow testing
- ❌ No browser wallet integration testing
- ❌ No widget UI testing (beyond mock data)

---

#### 2. **Widget Logic Tests** (31 passing)

Located in: `widget/src/__tests__/PaymentPage.test.ts`

**What they test:**

```typescript
✓ Transaction data format conversion (Uint8Array ↔ Array)
✓ Request payload structure
✓ Response parsing (optimistic/pessimistic modes)
✓ Balance validation logic
✓ Invoice JWT parsing
✓ URL redirect construction
✓ Error message mapping
✓ Keypair generation (MOCK - not real Enoki)
✓ Balance display formatting
✓ UI state transitions
```

**What they DON'T test:**

```typescript
❌ Actual Google OAuth flow
❌ Real zkLogin address derivation
❌ Enoki API integration
❌ Browser wallet detection
❌ @mysten/dapp-kit components
❌ ConnectButton behavior
❌ useCurrentAccount hook
❌ Actual transaction signing in browser
❌ Widget rendering in real browser
```

**Critical insight:** These are **PURE LOGIC TESTS** - they test data structures, not integrations!

---

### ✅ Testnet Tests (180 passing)

**Additional coverage vs. localnet:**

- 4 e2e tests with **real USDC funding** from Treasury
- Real blockchain state validation
- Real transaction submission
- Real balance verification

**Still missing:**

- ❌ zkLogin integration (all tests use Ed25519 keypairs)
- ❌ Enoki flow
- ❌ Browser wallet context
- ❌ Google OAuth

---

## What Our Tests DON'T Cover (The Critical Gap)

### ❌ 1. zkLogin / Enoki Integration (0% coverage)

**What needs testing:**

#### **Google OAuth Flow**

```typescript
// UNTESTED:
1. User clicks "Login with Google"
2. Redirect to Google OAuth
3. Receive authorization code
4. Exchange for JWT
5. Derive SUI address from JWT
6. Store zkLogin credentials
```

**Why untested:**

- Requires Enoki API key
- Requires Google OAuth client ID
- Requires browser environment (not Node.js)
- Current stub: `throw new Error('Enoki sign-in not yet implemented')`

---

#### **Address Derivation**

```typescript
// UNTESTED:
const address = deriveAddressFromGoogleJWT(jwt);
// How is this deterministic?
// How do we verify it's correct?
// How do we test on testnet vs. mainnet?
```

**Current state:**

- `useEnokiAuth.ts` has empty stub functions
- No tests validate address derivation
- No tests validate JWT → address mapping

---

#### **Transaction Signing with zkLogin**

```typescript
// UNTESTED:
const signTransaction = async (tx: Transaction) => {
  // How does zkLogin sign transactions?
  // What's the signature format?
  // How does it differ from Ed25519?
  throw new Error("Enoki transaction signing not yet implemented");
};
```

**Current state:**

- All tests use `Ed25519Keypair.sign()`
- Zero tests use zkLogin signing
- Unknown how to test this without real Enoki setup

---

### ❌ 2. Browser Wallet Integration (0% coverage)

**What needs testing:**

#### **@mysten/dapp-kit Components**

```typescript
// UNTESTED:
<SuiClientProvider>
  <WalletProvider autoConnect>
    <ConnectButton />
    <PaymentPage />
  </WalletProvider>
</SuiClientProvider>
```

**Why untested:**

- React component tests run in Node.js (jsdom)
- `@mysten/dapp-kit` requires real browser environment
- No tests render actual widget components
- All widget tests are pure logic (no React rendering)

---

#### **Wallet Detection & Connection**

```typescript
// UNTESTED:
const wallets = useWallets();
const enokiWallets = wallets.filter(isEnokiWallet);
const googleWallet = getGoogleWallet(enokiWallets);
```

**Current state:**

- `ZkLoginTest.tsx` has this code
- But it's never tested automatically
- Only manual browser testing

---

### ❌ 3. Full E2E Browser Flow (0% coverage)

**What needs testing:**

```
1. User lands on widget (http://localhost:5173?invoice=...)
2. Widget detects no wallet connected
3. Shows "Login with Google" button
4. User clicks → OAuth redirect
5. Returns with zkLogin credentials
6. Widget derives address from JWT
7. Checks balance via facilitator API
8. Shows payment confirmation
9. User clicks "Pay"
10. zkLogin signs transaction
11. Widget submits to facilitator
12. Facilitator sponsors & submits
13. Widget shows success
14. Merchant delivers content
```

**Current coverage of this flow:** **0%**

**Why:**

- Requires real browser (Playwright/Cypress)
- Requires Enoki setup
- Requires Google OAuth client
- No automated tests exist

---

## What Each Network's Tests Are Foundation For

### Localnet Tests → Foundation for Backend Logic

**What they validate:**

```
✓ PTB construction is correct
✓ Coin splitting logic works
✓ Transfer destinations are correct
✓ Gas budgets are appropriate
✓ API contracts are stable
✓ Error handling is robust
```

**What they prepare you for:**

- Adding zkLogin doesn't break PTB building
- Switching from Ed25519 → zkLogin signature should work
- Backend can handle any valid signature

**Confidence level: 95%** ✅

- Backend payment logic is solid
- Safe to integrate zkLogin on top

---

### Testnet Tests → Foundation for Real Blockchain Validation

**What they validate:**

```
✓ Real USDC transfers work
✓ Real coin objects can be found
✓ Real transactions can be submitted
✓ Real balances can be queried
✓ Treasury funding works
✓ Network configuration is correct
```

**What they prepare you for:**

- zkLogin addresses will work with same APIs
- Real USDC funding will work for zkLogin users
- Transaction submission works (just need zkLogin signature)

**Confidence level: 90%** ✅

- Blockchain integration is solid
- Just need zkLogin signature format

---

### Widget Tests → Foundation for UI Logic

**What they validate:**

```
✓ Data structures are correct
✓ Payload formatting is correct
✓ Response parsing is correct
✓ Error handling is correct
✓ State transitions are correct
```

**What they DON'T prepare you for:**

- ❌ Will zkLogin wallet detection work?
- ❌ Will Google OAuth flow work?
- ❌ Will Enoki API work?
- ❌ Will widget render correctly in browser?

**Confidence level: 60%** ⚠️

- Logic is solid, but integration is UNTESTED

---

## What We DO NOT Know

### 🤷 1. zkLogin / Enoki API

**Unknowns:**

- ❓ How to get Enoki API key (where to register?)
- ❓ What's the correct Enoki initialization code?
- ❓ How to test zkLogin on testnet vs. mainnet?
- ❓ Does zkLogin work with our testnet contracts?
- ❓ What's the signature format from zkLogin?
- ❓ How to handle zkLogin session expiry?
- ❓ How to refresh zkLogin credentials?

**Current status:**

- `useEnokiAuth.ts` is a stub with `throw new Error()`
- `ZkLoginTest.tsx` exists but never tested
- Official docs read, but not validated

**Risk level:** 🔴 **HIGH** - Core feature is untested

---

### 🤷 2. Google OAuth Configuration

**Unknowns:**

- ❓ Where to create Google OAuth client ID?
- ❓ What redirect URIs to configure?
- ❓ What scopes to request?
- ❓ How to handle OAuth errors?
- ❓ Does localhost work or need production domain?
- ❓ How to test OAuth flow locally?

**Current status:**

- No Google Cloud project setup documented
- No `.env` variables for Google OAuth
- Docs mention it but don't specify values

**Risk level:** 🟡 **MEDIUM** - Standard OAuth, but unconfigured

---

### 🤷 3. Browser Environment Differences

**Unknowns:**

- ❓ Will `@mysten/dapp-kit` work in production build?
- ❓ Does zkLogin require specific browser features?
- ❓ How to test in different browsers (Chrome, Firefox, Safari)?
- ❓ Does mobile work (iOS Safari, Chrome Mobile)?
- ❓ What happens if JavaScript is disabled?
- ❓ What happens if cookies/localStorage blocked?

**Current status:**

- Manual testing in Chrome only
- No automated cross-browser tests
- No mobile testing

**Risk level:** 🟡 **MEDIUM** - Common web issues

---

### 🤷 4. zkLogin Address Derivation

**Unknowns:**

- ❓ Is address derivation deterministic? (Yes, per docs, but not verified)
- ❓ Same Google account → same address always?
- ❓ How is entropy generated?
- ❓ What if user logs out and back in?
- ❓ Can we pre-fund addresses before first login?
- ❓ How to map Google ID → SUI address in our DB?

**Current status:**

- Theoretical understanding from docs
- Zero practical validation
- No tests confirm determinism

**Risk level:** 🟡 **MEDIUM** - Documented but unvalidated

---

### 🤷 5. Error Recovery Flows

**Unknowns:**

- ❓ What if OAuth fails midway?
- ❓ What if zkLogin credentials expire during payment?
- ❓ What if user denies Google permissions?
- ❓ What if Enoki API is down?
- ❓ How to handle network timeouts?
- ❓ What's the UX for "sign in again"?

**Current status:**

- Backend error handling exists
- Frontend error handling exists
- But OAuth-specific errors NOT handled

**Risk level:** 🟡 **MEDIUM** - Needs user testing

---

### 🤷 6. Production Deployment

**Unknowns:**

- ❓ Does zkLogin work on testnet? (Docs say yes, but not verified)
- ❓ Same Enoki API key for testnet and mainnet?
- ❓ How to deploy widget to production?
- ❓ CORS configuration for widget iframe?
- ❓ CDN requirements for widget script?
- ❓ How to version widget updates?

**Current status:**

- Deployment scripts exist
- But zkLogin-specific deployment NOT tested

**Risk level:** 🟢 **LOW** - Standard deployment issues

---

## Confidence Levels Summary

| Component                          | Test Coverage | Confidence | Blocking Issue     |
| ---------------------------------- | ------------- | ---------- | ------------------ |
| **Backend PTB Building**           | 96%           | 95% ✅     | None               |
| **Backend API Endpoints**          | 100%          | 95% ✅     | None               |
| **Backend Blockchain Integration** | 90%           | 90% ✅     | None               |
| **Widget Data Logic**              | 100%          | 95% ✅     | None               |
| **Widget UI Components**           | 0%            | 60% ⚠️     | No browser tests   |
| **zkLogin Integration**            | 0%            | 20% 🔴     | No Enoki API key   |
| **Google OAuth Flow**              | 0%            | 30% 🔴     | No OAuth client ID |
| **E2E Browser Flow**               | 0%            | 10% 🔴     | No E2E tests       |
| **Cross-browser Compatibility**    | 0%            | 50% 🟡     | No testing         |
| **Mobile Support**                 | 0%            | 40% 🟡     | No testing         |

---

## What Tests We SHOULD Have (But Don't)

### Priority 1: zkLogin Integration Tests (CRITICAL)

```typescript
describe("zkLogin / Enoki Integration", () => {
  it("should initialize Enoki with API key", async () => {
    // Test Enoki setup
  });

  it("should create Google OAuth URL", async () => {
    // Test OAuth flow start
  });

  it("should exchange OAuth code for zkLogin credentials", async () => {
    // Test callback handling
  });

  it("should derive SUI address from JWT", async () => {
    // Test address derivation
  });

  it("should sign transaction with zkLogin", async () => {
    // Test signature format
  });

  it("should maintain session across page reloads", async () => {
    // Test persistence
  });
});
```

**Status:** 🔴 **DOES NOT EXIST**

---

### Priority 2: Browser E2E Tests (HIGH)

```typescript
describe("Full Payment Flow (Browser)", () => {
  it("should complete payment with Google login", async () => {
    // Playwright/Cypress test
    await page.goto("http://localhost:5173?invoice=...");
    await page.click('button:text("Login with Google")');
    // ... OAuth flow ...
    await page.click('button:text("Pay")');
    await expect(page.locator(".success")).toBeVisible();
  });
});
```

**Status:** 🔴 **DOES NOT EXIST**

---

### Priority 3: Component Integration Tests (MEDIUM)

```typescript
describe("Widget Components (React)", () => {
  it("should render PaymentPage with real dapp-kit", async () => {
    // Test with real providers
    render(
      <SuiClientProvider>
        <WalletProvider>
          <PaymentPage invoiceJWT="..." />
        </WalletProvider>
      </SuiClientProvider>
    );
  });
});
```

**Status:** 🔴 **DOES NOT EXIST**

---

## Recommendations

### Immediate Next Steps

1. **Get Enoki API Key** 🔴 BLOCKING

   - Register at Mysten Labs
   - Add to `.env.local`
   - Update `useEnokiAuth.ts` stub

2. **Get Google OAuth Client ID** 🔴 BLOCKING

   - Create Google Cloud project
   - Configure OAuth consent screen
   - Add redirect URIs

3. **Manual Browser Testing** 🟡 CRITICAL

   - Test zkLogin flow manually
   - Verify address derivation
   - Test payment with zkLogin signature

4. **Add E2E Tests** 🟡 HIGH PRIORITY

   - Set up Playwright or Cypress
   - Test full OAuth → payment flow
   - Run on CI

5. **Document What Works** ✅ ALWAYS
   - Keep updating docs as you test
   - Document every blocker
   - Document every workaround

---

## Bottom Line

**Current tests validate:**

- ✅ Backend payment infrastructure is SOLID
- ✅ Blockchain integration WORKS
- ✅ Widget logic is CORRECT

**Current tests DO NOT validate:**

- ❌ zkLogin integration (0% coverage)
- ❌ Google OAuth flow (0% coverage)
- ❌ Browser environment (0% coverage)
- ❌ E2E user experience (0% coverage)

**What this means for zkLogin:**

- Backend is READY for zkLogin signatures
- Widget logic is READY for zkLogin data
- But actual zkLogin integration is **UNTESTED**

**Risk:**

- Backend: LOW ✅ (well tested)
- zkLogin: HIGH 🔴 (not tested at all)

**Blocker:**

- Need Enoki API key to make ANY progress on zkLogin testing
