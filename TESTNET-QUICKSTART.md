# Testnet Deployment - Quick Start Guide

**Status**: Ready to begin Phase 0 → 0.5  
**Estimated Total Time**: 10-12 hours  
**Current Milestone**: v0.1.0-localnet ✅ Complete

---

## 🚦 Implementation Phases

```
Phase 0   [30 min]  🐤 Fix failing tests (MANDATORY)
Phase 0.5 [3 hours] 🏗️ Network config foundation (DO BEFORE FEATURES)
Phase 1   [1 hour]  🔐 Setup deployer wallet + funding
Phase 2   [2 hours] 🔨 Use network config in code
Phase 3   [30 min]  🚀 Deploy contract to testnet
Phase 4   [2 hours] 🎨 UI updates (faucet, explorer links)
Phase 5   [2 hours] ✅ Comprehensive testing
Phase 6   [1 hour]  📚 Documentation & tagging
```

---

## 📋 Current Status

- [x] v0.1.0-localnet complete
- [x] Testnet deployment plan created
- [x] User feedback incorporated
- [ ] **NEXT**: Phase 0 - Fix failing tests

---

## 🎯 Phase 0: Fix Failing Tests (START HERE!)

**Time**: 30 minutes  
**Why**: Must have green tests before starting testnet work!

### Failures to Fix:

1. **Facilitator** (`src/__tests__/e2e-payment.test.ts:91`):
   ```typescript
   // Wrong:
   merchantAddress = payload.merchantRecipient;
   
   // Correct:
   merchantAddress = payload.payTo;
   ```

2. **Widget** (`src/lib/verifier.real-ptb.test.ts`):
   - 4 tests failing due to property name mismatches
   - Grep for `.split` errors
   - Update to use current JWT property names

### Commands:

```bash
# Run tests to see failures
npm test --prefix facilitator
npm test --prefix widget

# After fixing, verify all pass
npm test --prefix facilitator  # Should be 181/181 ✅
npm test --prefix widget        # Should be 77/77 ✅

# Commit
git add -A
git commit -m "fix: update property names in tests for consistency"
```

**GATE**: Do NOT proceed until all tests pass!

---

## 🏗️ Phase 0.5: Network Config Foundation

**Time**: 3 hours  
**Why**: Prove network switching works BEFORE building features!

### What You'll Build:

1. **Network Config Module** (`facilitator/src/config/networks.ts`)
   - Defines localnet/testnet configs
   - Includes timeout values (localnet fast, testnet slow)
   - Runtime validation

2. **Helper Functions** (`facilitator/src/utils/network-helpers.ts`)
   - `getCliCommand(digest)` → `lsui` or `tsui`
   - `getExplorerUrl(digest)` → suivision or null
   - `getFaucetInfo(hasUSDC)` → internal or Circle

3. **Comprehensive Tests** (`__tests__/networks.test.ts`)
   - Tagged with `@localnet`, `@testnet`, `@both`
   - Run subset: `npm test -- --grep @localnet`

4. **Validation Script** (`scripts/test-network-switch.sh`)
   - Starts facilitator on localnet
   - Starts facilitator on testnet
   - Verifies correct network config

### Success Criteria:

- [ ] `npm test -- networks.test.ts` passes
- [ ] `./scripts/test-network-switch.sh` passes
- [ ] **ALL existing localnet tests still pass**
- [ ] Can switch via: `NETWORK=testnet npm start`

**GATE**: Must prove switching works before proceeding!

---

## 🔐 Phase 1: Deployer Wallet Setup

**Time**: 1 hour  
**Requires**: Phase 0.5 complete

### Steps:

1. Generate deployer wallet:
   ```bash
   tsui client new-address ed25519
   # Save address and recovery phrase to .env.deployer
   ```

2. **USER ACTION**: Transfer funds
   - 20 SUI from `0xca0027...b0f37` (existing testnet wallet)
   - 20 USDC from https://faucet.circle.com

3. Create `.env.deployer`:
   ```bash
   DEPLOYER_PRIVATE_KEY=<key>
   DEPLOYER_ADDRESS=<address>
   DEPLOYER_RECOVERY_PHRASE="<12 words>"
   ```

4. Add to `.gitignore`:
   ```
   .env.deployer
   ```

**SECURITY**: Never commit deployer keys to git!

---

## 📊 Key Decisions Made

1. ✅ **Separate Wallets**: Deployer ≠ Facilitator (security)
2. ✅ **Circle Faucet**: Opens in new tab, only if USDC balance is zero
3. ✅ **Test Strategy**: Tagged tests (@localnet/@testnet/@both)
4. ✅ **Network Switching**: Both run simultaneously (no switching delay)
5. ✅ **Response Times**: Localnet ~50ms, Testnet ~1-2s (config-aware)

---

## 🚨 Critical Rules

1. **Always Test Localnet First**: Every change must work on localnet before testnet
2. **Fix Tests Immediately**: Don't proceed with failing tests
3. **Never Commit Keys**: Deployer keys stay in `.env.deployer` only
4. **Network-Aware Code**: Use `NETWORK_CONFIG` helpers, not hardcoded values
5. **Gate Checks**: Must pass criteria before moving to next phase

---

## 📞 Need Help?

- Full plan: `TESTNET-DEPLOYMENT-PLAN.md`
- Milestone docs: `MILESTONE-v0.1.0-localnet.md`
- Architecture: `.cursorrules`

---

**Ready?** Start with Phase 0! 🚀
