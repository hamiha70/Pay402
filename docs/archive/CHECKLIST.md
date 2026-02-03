# Pay402 - Implementation Checklist

**Status:** Ready to Build  
**Current Commits:** 7  
**Target Commits:** 50-100+  
**Time Budget:** 24 hours

---

## 📋 Phase 1: Move Contract (4-6 hours)

### Setup (30 min)
- [ ] `cd contracts && sui move new payment`
- [ ] **COMMIT:** `feat(contract): initialize Move project structure`
- [ ] Create `sources/payment.move`
- [ ] **COMMIT:** `feat(contract): create payment module skeleton`
- [ ] Add Move.toml dependencies
- [ ] **COMMIT:** `chore(contract): configure Move.toml dependencies`

### Struct Definitions (30 min)
- [ ] Define `EphemeralReceipt` struct (with `drop` ability)
- [ ] **COMMIT:** `feat(contract): add EphemeralReceipt struct definition`
- [ ] Define `PaymentSettled` event (with `copy, drop`)
- [ ] **COMMIT:** `feat(contract): add PaymentSettled event structure`

### Core Function (2 hours)
- [ ] Create `settle_payment<T>` function signature
- [ ] **COMMIT:** `feat(contract): add settle_payment function signature with generic Coin<T>`
- [ ] Implement coin splitting logic
- [ ] **COMMIT:** `feat(contract): implement coin splitting for merchant payment`
- [ ] Implement facilitator fee extraction
- [ ] **COMMIT:** `feat(contract): add facilitator fee splitting logic`
- [ ] Add transfer logic (merchant + facilitator)
- [ ] **COMMIT:** `feat(contract): implement atomic transfers to merchant and facilitator`
- [ ] Add event emission
- [ ] **COMMIT:** `feat(contract): emit PaymentSettled event with full details`
- [ ] Return ephemeral receipt
- [ ] **COMMIT:** `feat(contract): return ephemeral receipt (zero storage cost)`

### Testing (1 hour)
- [ ] Create `tests/payment_tests.move`
- [ ] **COMMIT:** `test(contract): add test module skeleton`
- [ ] Test with USDC
- [ ] **COMMIT:** `test(contract): add basic USDC settlement test`
- [ ] Test with SUI
- [ ] **COMMIT:** `test(contract): add SUI coin settlement test`
- [ ] Test fee calculation
- [ ] **COMMIT:** `test(contract): verify correct fee calculation`
- [ ] Test edge cases (zero amount, insufficient balance)
- [ ] **COMMIT:** `test(contract): add edge case tests`
- [ ] Run all tests: `sui move test`
- [ ] **COMMIT:** `test(contract): all tests passing`

### Deployment (30 min)
- [ ] Build: `sui move build`
- [ ] **COMMIT:** `build(contract): successful build with zero warnings`
- [ ] Deploy to testnet: `sui client publish`
- [ ] **COMMIT:** `deploy(contract): deploy to SUI testnet`
- [ ] Document package ID
- [ ] **COMMIT:** `docs(contract): add deployment info and package ID`

**Phase 1 Commits:** ~15  
**Running Total:** 22

---

## 📋 Phase 2: Facilitator API (8-10 hours)

### Project Setup (30 min)
- [ ] `cd facilitator && npm init -y`
- [ ] **COMMIT:** `feat(facilitator): initialize Node.js project`
- [ ] Set up TypeScript: `npm install -D typescript @types/node`
- [ ] **COMMIT:** `chore(facilitator): add TypeScript configuration`
- [ ] Create `tsconfig.json`
- [ ] **COMMIT:** `chore(facilitator): configure strict TypeScript settings`
- [ ] Install dependencies
- [ ] **COMMIT:** `chore(facilitator): install core dependencies (express, sui.js, bull)`

### Types & Constants (30 min)
- [ ] Create `src/types/index.ts`
- [ ] **COMMIT:** `feat(facilitator): define TypeScript interfaces for API`
- [ ] Create `src/constants.ts`
- [ ] **COMMIT:** `feat(facilitator): add constants (fee, RPC URLs, etc.)`
- [ ] Create `src/config.ts` (environment variables)
- [ ] **COMMIT:** `feat(facilitator): add environment configuration`

### SUI Client Service (1 hour)
- [ ] Create `src/services/sui-client.ts`
- [ ] **COMMIT:** `feat(facilitator): create SUI client service skeleton`
- [ ] Implement `getCoins()` wrapper
- [ ] **COMMIT:** `feat(facilitator): implement coin discovery by address`
- [ ] Implement `devInspectTransactionBlock()` wrapper
- [ ] **COMMIT:** `feat(facilitator): add balance checking via devInspect`
- [ ] Add error handling
- [ ] **COMMIT:** `fix(facilitator): add comprehensive error handling to SUI client`

### Balance Check Endpoint (1 hour)
- [ ] Create `src/api/check-balance.ts`
- [ ] **COMMIT:** `feat(facilitator): create check-balance endpoint skeleton`
- [ ] Implement coin type validation
- [ ] **COMMIT:** `feat(facilitator): validate coin type against x402 request`
- [ ] Implement balance aggregation
- [ ] **COMMIT:** `feat(facilitator): aggregate balances across coin objects`
- [ ] Return coin IDs for PTB
- [ ] **COMMIT:** `feat(facilitator): include coin object IDs in response`
- [ ] Add input validation
- [ ] **COMMIT:** `fix(facilitator): add request validation for check-balance`

### Signature Verification (1.5 hours)
- [ ] Create `src/services/signature-verifier.ts`
- [ ] **COMMIT:** `feat(facilitator): create signature verification service`
- [ ] Implement nonce tracking (in-memory Set)
- [ ] **COMMIT:** `feat(facilitator): add nonce tracking to prevent replay attacks`
- [ ] Implement signature verification
- [ ] **COMMIT:** `feat(facilitator): implement cryptographic signature verification`
- [ ] Add timestamp expiration check
- [ ] **COMMIT:** `feat(facilitator): add payment token expiration (5 min TTL)`

### Payment Verification Endpoint (1.5 hours)
- [ ] Create `src/api/verify-payment.ts`
- [ ] **COMMIT:** `feat(facilitator): create verify-payment endpoint skeleton`
- [ ] Implement signature verification call
- [ ] **COMMIT:** `feat(facilitator): integrate signature verification`
- [ ] Implement balance re-check
- [ ] **COMMIT:** `feat(facilitator): re-check balance before issuing token`
- [ ] Generate JWT payment token
- [ ] **COMMIT:** `feat(facilitator): generate signed JWT payment tokens`
- [ ] Queue settlement job
- [ ] **COMMIT:** `feat(facilitator): queue async settlement via Bull`

### Settlement Worker (2 hours)
- [ ] Create `src/services/settlement-queue.ts`
- [ ] **COMMIT:** `feat(facilitator): create settlement job queue`
- [ ] Implement PTB construction
- [ ] **COMMIT:** `feat(facilitator): implement PTB construction for settlement`
- [ ] Add generic type argument handling
- [ ] **COMMIT:** `feat(facilitator): add generic Coin<T> type argument to PTB`
- [ ] Implement gas sponsorship
- [ ] **COMMIT:** `feat(facilitator): implement gas sponsorship by facilitator`
- [ ] Add transaction submission
- [ ] **COMMIT:** `feat(facilitator): submit signed PTB to SUI network`
- [ ] Implement retry logic
- [ ] **COMMIT:** `feat(facilitator): add exponential backoff retry for failed settlements`
- [ ] Add merchant webhook notification
- [ ] **COMMIT:** `feat(facilitator): notify merchant on settlement completion`

### Token Verification Endpoint (30 min)
- [ ] Create `src/api/verify-token.ts`
- [ ] **COMMIT:** `feat(facilitator): create verify-token endpoint for merchants`
- [ ] Implement JWT verification
- [ ] **COMMIT:** `feat(facilitator): verify JWT signature and expiration`
- [ ] Return payment details
- [ ] **COMMIT:** `feat(facilitator): return decoded payment details`

### Express Server (30 min)
- [ ] Create `src/index.ts`
- [ ] **COMMIT:** `feat(facilitator): create Express server with CORS`
- [ ] Mount all routes
- [ ] **COMMIT:** `feat(facilitator): mount all API endpoints`
- [ ] Add error handling middleware
- [ ] **COMMIT:** `feat(facilitator): add global error handling middleware`
- [ ] Add request logging
- [ ] **COMMIT:** `feat(facilitator): add request logging for debugging`

### Testing (1 hour)
- [ ] Test `/check-balance` locally
- [ ] **COMMIT:** `test(facilitator): verify check-balance endpoint works`
- [ ] Test `/verify-payment` locally
- [ ] **COMMIT:** `test(facilitator): verify payment verification flow`
- [ ] Test settlement worker
- [ ] **COMMIT:** `test(facilitator): verify settlement PTB submission`
- [ ] Test end-to-end flow
- [ ] **COMMIT:** `test(facilitator): successful end-to-end API test`

**Phase 2 Commits:** ~32  
**Running Total:** 54

---

## 📋 Phase 3: Widget (8-10 hours)

### Project Setup (30 min)
- [ ] `cd widget && npm init -y`
- [ ] **COMMIT:** `feat(widget): initialize widget project`
- [ ] Install React + TypeScript
- [ ] **COMMIT:** `chore(widget): add React and TypeScript`
- [ ] Install SUI SDK
- [ ] **COMMIT:** `chore(widget): add @mysten/dapp-kit and sui.js`
- [ ] Install x402 client
- [ ] **COMMIT:** `chore(widget): add @x402/fetch for 402 detection`
- [ ] Configure webpack for browser bundle
- [ ] **COMMIT:** `chore(widget): configure webpack for UMD bundle`

### zkLogin Manager (3 hours)
- [ ] Create `src/ZkLoginManager.ts`
- [ ] **COMMIT:** `feat(widget): create ZkLoginManager class skeleton`
- [ ] Implement Google OAuth redirect
- [ ] **COMMIT:** `feat(widget): implement Google OAuth flow initiation`
- [ ] Implement callback handling
- [ ] **COMMIT:** `feat(widget): handle OAuth callback and JWT extraction`
- [ ] Integrate Mysten salt service
- [ ] **COMMIT:** `feat(widget): integrate Mysten salt service for address derivation`
- [ ] Implement ZK proof fetching
- [ ] **COMMIT:** `feat(widget): fetch ZK proof from Mysten prover`
- [ ] Implement address derivation
- [ ] **COMMIT:** `feat(widget): derive SUI address from JWT + salt`
- [ ] Implement session storage
- [ ] **COMMIT:** `feat(widget): persist zkLogin session in localStorage`
- [ ] Implement signature generation
- [ ] **COMMIT:** `feat(widget): implement payment signing with ephemeral key`

### Main Widget Class (2 hours)
- [ ] Create `src/Pay402.ts`
- [ ] **COMMIT:** `feat(widget): create Pay402 main widget class`
- [ ] Implement fetch interception
- [ ] **COMMIT:** `feat(widget): intercept fetch calls to detect 402 responses`
- [ ] Implement 402 header parsing
- [ ] **COMMIT:** `feat(widget): parse WWW-Authenticate header for payment details`
- [ ] Integrate zkLogin manager
- [ ] **COMMIT:** `feat(widget): integrate zkLogin for authentication`
- [ ] Implement balance checking
- [ ] **COMMIT:** `feat(widget): check balance via facilitator API`
- [ ] Implement payment flow orchestration
- [ ] **COMMIT:** `feat(widget): orchestrate complete payment flow`

### React Components (3 hours)
- [ ] Create `src/components/Modal.tsx`
- [ ] **COMMIT:** `feat(widget): create modal container component`
- [ ] Create `LoginStep.tsx`
- [ ] **COMMIT:** `feat(widget): create Google login step component`
- [ ] Create `BalanceStep.tsx`
- [ ] **COMMIT:** `feat(widget): create balance checking step component`
- [ ] Create `FaucetStep.tsx`
- [ ] **COMMIT:** `feat(widget): create faucet guidance step component`
- [ ] Create `ConfirmStep.tsx`
- [ ] **COMMIT:** `feat(widget): create payment confirmation step component`
- [ ] Create `ProcessingStep.tsx`
- [ ] **COMMIT:** `feat(widget): create processing/loading step component`
- [ ] Create `SuccessStep.tsx`
- [ ] **COMMIT:** `feat(widget): create success step with tx link`
- [ ] Create `ErrorStep.tsx`
- [ ] **COMMIT:** `feat(widget): create error handling step component`

### Styling (1 hour)
- [ ] Create `src/styles/modal.css`
- [ ] **COMMIT:** `style(widget): add modal base styles`
- [ ] Add component-specific styles
- [ ] **COMMIT:** `style(widget): add component styles for all steps`
- [ ] Add responsive design
- [ ] **COMMIT:** `style(widget): make widget mobile-responsive`

### Build & Export (30 min)
- [ ] Configure webpack output
- [ ] **COMMIT:** `build(widget): configure UMD output for CDN`
- [ ] Build for production
- [ ] **COMMIT:** `build(widget): successful production build`
- [ ] Test in browser
- [ ] **COMMIT:** `test(widget): verify widget loads in browser`

**Phase 3 Commits:** ~25  
**Running Total:** 79

---

## 📋 Phase 4: Demo Page (2 hours)

### Setup (30 min)
- [ ] Create `demo/index.html`
- [ ] **COMMIT:** `feat(demo): create demo page HTML structure`
- [ ] Add styling
- [ ] **COMMIT:** `style(demo): add demo page styles`
- [ ] Embed widget script
- [ ] **COMMIT:** `feat(demo): embed Pay402 widget`

### Configuration (30 min)
- [ ] Configure x402 Echo merchant
- [ ] **COMMIT:** `feat(demo): configure x402 Echo as test merchant`
- [ ] Set up Google OAuth credentials
- [ ] **COMMIT:** `chore(demo): add Google OAuth client ID`
- [ ] Initialize Pay402 widget
- [ ] **COMMIT:** `feat(demo): initialize widget with facilitator URL`

### Testing (1 hour)
- [ ] Test complete flow locally
- [ ] **COMMIT:** `test(demo): verify end-to-end payment flow works`
- [ ] Fix any issues
- [ ] **COMMIT:** `fix(demo): resolve [specific issue]`
- [ ] Test in multiple browsers
- [ ] **COMMIT:** `test(demo): verify cross-browser compatibility`

**Phase 4 Commits:** ~8  
**Running Total:** 87

---

## 📋 Phase 5: Testing & Polish (4 hours)

### Bug Fixes (2 hours)
- [ ] Fix any deployment issues
- [ ] **COMMIT:** `fix: resolve [specific issue]`
- [ ] Improve error messages
- [ ] **COMMIT:** `fix: add user-friendly error messages`
- [ ] Handle edge cases
- [ ] **COMMIT:** `fix: handle edge case [description]`

### Enhancements (2 hours)
- [ ] Add loading indicators
- [ ] **COMMIT:** `feat: add loading spinners to all async operations`
- [ ] Add transaction links
- [ ] **COMMIT:** `feat: add SUI explorer links to success page`
- [ ] Improve UI polish
- [ ] **COMMIT:** `style: polish UI with better spacing and colors`

**Phase 5 Commits:** ~6  
**Running Total:** 93

---

## 📋 Phase 6: Demo Prep (2 hours)

### Documentation (30 min)
- [ ] Update README with deployment info
- [ ] **COMMIT:** `docs: update README with testnet deployment details`
- [ ] Create DEMO.md
- [ ] **COMMIT:** `docs: add demo script and recording instructions`

### Demo Video (1 hour)
- [ ] Record demo video (60 seconds)
- [ ] **COMMIT:** `docs: add demo video link to README`
- [ ] Create slides
- [ ] **COMMIT:** `docs: add presentation slides`

### Submission (30 min)
- [ ] Deploy to public URL (if possible)
- [ ] **COMMIT:** `deploy: deploy demo page to [hosting service]`
- [ ] Final README polish
- [ ] **COMMIT:** `docs: final README polish for submission`
- [ ] Prepare pitch
- [ ] **COMMIT:** `docs: add 30-second pitch to README`

**Phase 6 Commits:** ~6  
**Running Total:** 99

---

## ✅ Success Metrics

### Commit Count
- **Target:** 50-100+
- **Projected:** 99 commits
- **Status:** ✅ EXCEEDS TARGET

### Functionality
- [ ] Move contract deployed and working
- [ ] Facilitator API running
- [ ] Widget integrated with zkLogin
- [ ] Demo page functional
- [ ] End-to-end payment completes

### Documentation
- [x] Architecture complete ✅
- [x] README comprehensive ✅
- [ ] Demo video recorded
- [ ] API docs (nice to have)

### Demo Quality
- [ ] 60-second video
- [ ] Clear pitch
- [ ] Working live demo
- [ ] Git history shows process

---

## 🎯 Commit Frequency Reminder

**EVERY 30-60 minutes, commit!**

After each:
- Struct/interface definition
- Function implementation
- Test addition
- Bug fix
- Style change
- Documentation update

**Make git history tell your story!**

---

## 📊 Progress Tracking

Use this checklist during hackathon. Check off items and make commits as you go.

**Current Status:**
- [x] Planning: 100% ✅
- [ ] Implementation: 0%
- [ ] Testing: 0%
- [ ] Demo: 0%

**Next Step:** Start Phase 1 - Move Contract

```bash
cd contracts
sui move new payment
```

**First Implementation Commit:**
```bash
git add contracts/
git commit -m "feat(contract): initialize Move project structure"
```

---

**Good luck! Remember: Small commits, frequent commits, descriptive commits!** 🚀
