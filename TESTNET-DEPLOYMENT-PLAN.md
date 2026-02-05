# Testnet Deployment Implementation Plan

**Version**: v0.2.0-testnet  
**Status**: PLANNING  
**Prerequisites**: v0.1.0-localnet ✅ Complete

---

## Phase 0: Fix Living Canary 🐤 (MANDATORY)

**Status**: ⚠️ MUST DO FIRST  
**Estimated Time**: 30 minutes  
**Rationale**: Cannot start testnet work with failing tests - no baseline!

### Failing Tests to Fix:

#### Facilitator (1 failure):
- **File**: `src/__tests__/e2e-payment.test.ts:91-93`
- **Issue**: Uses `payload.merchantRecipient` but JWT has `payTo`
- **Fix**: Change to `payload.payTo` or add fallback
- **Lines**: 91, 93 (possibly more)

#### Widget (4 failures):
- **File**: `src/lib/verifier.real-ptb.test.ts`
- **Issue**: Property name mismatches in PTB parsing
- **Lines**: ~127, ~145, ~162 (grep for `.split` errors)

### Success Criteria:
```bash
✅ npm test --prefix facilitator  # All 181 tests pass
✅ npm test --prefix widget        # All 77 tests pass
✅ Manual E2E on localnet          # Still works after fixes
```

**DO NOT PROCEED until all tests pass!**

---

## Phase 1: Secure Testnet Infrastructure 🔐

### 1.1 Create Deployer/Faucet Wallet

**Purpose**: Permanent wallet for contract deployment and facilitator funding

**Steps**:
1. Generate new Ed25519 keypair for Sui
2. Transfer 20 SUI from existing testnet wallet (CONFIDENTIAL):
   - From: `0xca0027e5a2a47e748fef3845bd3ed51852fe30af40832d7a952eacc71eab0f37`
   - To: New deployer wallet
   - Amount: 20 SUI
3. Store in `Pay402/.env.deployer` (NEVER commit):
   ```bash
   DEPLOYER_PRIVATE_KEY=<new-key>
   DEPLOYER_ADDRESS=<new-address>
   DEPLOYER_RECOVERY_PHRASE="<12-words>"
   ```
4. Add `.env.deployer` to `.gitignore`

**Security Requirements**:
- ❌ NEVER write deployer keys to docs
- ❌ NEVER commit .env.deployer
- ❌ NEVER write deployer keys to git logs
- ✅ Only reference in uncommitted .env files
- ✅ Use for contract deployment only
- ✅ Use to fund facilitator wallet (not for daily ops)

### 1.2 Network Configuration Strategy

**Decision**: Hybrid approach with separate .env files + runtime validation

**File Structure**:
```
Pay402/
├── .env.localnet          # Localnet config
├── .env.testnet           # Testnet config
├── .env.deployer          # Deployer keys (NEVER commit)
├── facilitator/
│   ├── .env.localnet      # Facilitator localnet
│   ├── .env.testnet       # Facilitator testnet
├── merchant/
│   ├── .env.localnet      # Merchant localnet
│   ├── .env.testnet       # Merchant testnet
└── widget/
    └── .env               # Widget (no secrets)
```

**Package.json Scripts** (all packages):
```json
{
  "scripts": {
    "dev:localnet": "cross-env NETWORK=localnet dotenv -e .env.localnet -- npm run dev",
    "dev:testnet": "cross-env NETWORK=testnet dotenv -e .env.testnet -- npm run dev",
    "test:localnet": "cross-env NETWORK=localnet dotenv -e .env.localnet -- npm test -- --grep '@localnet|@both'",
    "test:testnet": "cross-env NETWORK=testnet dotenv -e .env.testnet -- npm test -- --grep '@testnet|@both'",
    "test:all": "npm run test:localnet && npm run test:testnet"
  }
}
```

**Dependencies to Add**:
```bash
npm install --save-dev cross-env dotenv-cli
```

---

## Phase 2: Testnet-Aware Code Architecture 🏗️

### 2.1 Network Configuration Module

**File**: `facilitator/src/config/networks.ts`

```typescript
export type Network = 'localnet' | 'testnet' | 'mainnet';

export interface NetworkConfig {
  network: Network;
  rpcUrl: string;
  packageId: string;
  usdcType: string;
  cliCommand: 'lsui' | 'tsui' | 'sui';
  explorerBaseUrl: string | null;
  faucetUrl: string | null;
  faucetType: 'internal' | 'circle' | null;
}

export function getNetworkConfig(network: Network): NetworkConfig {
  switch (network) {
    case 'localnet':
      return {
        network: 'localnet',
        rpcUrl: 'http://127.0.0.1:9000',
        packageId: process.env.PACKAGE_ID_LOCALNET!,
        usdcType: '<MOCK_USDC_TYPE>',
        cliCommand: 'lsui',
        explorerBaseUrl: null,
        faucetUrl: null,
        faucetType: 'internal', // Uses /fund endpoint
      };
    
    case 'testnet':
      return {
        network: 'testnet',
        rpcUrl: 'https://fullnode.testnet.sui.io:443',
        packageId: process.env.PACKAGE_ID_TESTNET!,
        usdcType: '<TESTNET_USDC_TYPE>',
        cliCommand: 'tsui',
        explorerBaseUrl: 'https://testnet.suivision.xyz',
        faucetUrl: 'https://faucet.circle.com',
        faucetType: 'circle', // Manual, rate-limited
      };
    
    case 'mainnet':
      throw new Error('Mainnet not yet supported');
  }
}

// Runtime validation
export function validateNetworkConfig(config: NetworkConfig): void {
  if (!config.packageId) {
    throw new Error(`PACKAGE_ID not set for ${config.network}`);
  }
  // Add more validations...
}
```

### 2.2 Helper Functions

```typescript
// facilitator/src/utils/network-helpers.ts

export function getCliCommand(network: Network, digest: string): string {
  const config = getNetworkConfig(network);
  return `${config.cliCommand} client tx-block ${digest}`;
}

export function getExplorerUrl(network: Network, digest: string): string | null {
  const config = getNetworkConfig(network);
  if (!config.explorerBaseUrl) return null;
  return `${config.explorerBaseUrl}/txblock/${digest}`;
}

export function getFaucetInfo(network: Network): {
  url: string | null;
  type: 'internal' | 'circle' | null;
  instructions: string;
} {
  const config = getNetworkConfig(network);
  
  if (config.faucetType === 'internal') {
    return {
      url: '/fund',
      type: 'internal',
      instructions: 'Click to instantly receive 50 MOCK_USDC (localnet only)',
    };
  }
  
  if (config.faucetType === 'circle') {
    return {
      url: 'https://faucet.circle.com',
      type: 'circle',
      instructions: 'Visit Circle faucet (opens in new tab). Limit: 20 USDC every 2 hours.',
    };
  }
  
  return { url: null, type: null, instructions: 'No faucet available' };
}
```

### 2.3 Test Strategy: Tagged Tests

**Approach**: Use test tags (@localnet, @testnet, @both)

**Example**:
```typescript
// src/__tests__/payment.test.ts

describe('Payment Flow', () => {
  describe('@both - Invoice Validation', () => {
    it('should reject expired invoices', () => {
      // Works on both networks
    });
  });
  
  describe('@localnet - Internal Faucet', () => {
    it('should fund wallet instantly', async () => {
      // Only on localnet
    });
  });
  
  describe('@testnet - Circle Faucet', () => {
    it('should display Circle faucet URL', async () => {
      // Only on testnet
    });
  });
});
```

**Vitest Config**:
```typescript
// vitest.config.ts
export default defineConfig({
  test: {
    testMatch: [
      '**/src/**/*.test.ts',
      '**/src/**/__tests__/**/*.ts'
    ],
    setupFiles: ['./test/setup.ts'],
  },
});
```

**Setup File**:
```typescript
// test/setup.ts
import { beforeAll } from 'vitest';

beforeAll(() => {
  const network = process.env.NETWORK || 'localnet';
  console.log(`\n🌐 Running tests on: ${network.toUpperCase()}\n`);
  
  // Validate network config exists
  const config = getNetworkConfig(network as Network);
  validateNetworkConfig(config);
});
```

---

## Phase 3: Deploy to Testnet 🚀

### 3.1 Contract Deployment

**Pre-deployment Checklist**:
- [ ] Deployer wallet has ≥5 SUI
- [ ] Move code updated for testnet (if needed)
- [ ] Faucet wallet has ≥20 SUI
- [ ] All localnet tests passing

**Deployment Steps**:
```bash
# 1. Switch to testnet
export SUI_NETWORK=testnet

# 2. Check deployer balance
tsui client balance --address $DEPLOYER_ADDRESS

# 3. Deploy contract
cd Pay402/contracts
tsui move publish --gas-budget 50000000

# 4. Save PACKAGE_ID
echo "PACKAGE_ID_TESTNET=<new-package-id>" >> ../facilitator/.env.testnet
echo "PACKAGE_ID_TESTNET=<new-package-id>" >> ../merchant/.env.testnet
```

**Post-deployment**:
- [ ] Verify contract on Sui Explorer
- [ ] Test `settle_payment` function manually
- [ ] Confirm PaymentSettled event structure

### 3.2 Configure Testnet USDC

**Circle Testnet USDC**:
- Chain: Sui Testnet
- Decimals: 6
- Type: `<will-be-provided-by-circle>`

**Update Config**:
```bash
# facilitator/.env.testnet
USDC_TYPE=<circle-testnet-usdc-type>
USDC_DECIMALS=6

# merchant/.env.testnet
USDC_TYPE=<circle-testnet-usdc-type>
RESOURCE_PRICE=100000  # 0.10 USDC
```

### 3.3 Fund Facilitator Wallet

**From Deployer to Facilitator**:
```bash
# Generate new facilitator testnet wallet
facilitator_address=$(tsui client new-address ed25519)

# Fund from deployer (5 SUI for gas)
tsui client pay-sui \
  --recipients $facilitator_address \
  --amounts 5000000000 \
  --gas-budget 10000000

# Save facilitator keys
echo "FACILITATOR_KEY=<private-key>" >> facilitator/.env.testnet
echo "FACILITATOR_ADDRESS=$facilitator_address" >> facilitator/.env.testnet
```

---

## Phase 4: Update UI for Network Switching 🎨

### 4.1 Widget Changes

**Faucet Button** (`widget/src/components/PaymentPage.tsx`):
```typescript
const faucetInfo = getFaucetInfo(invoice.network);

{faucetInfo.type === 'internal' ? (
  <button onClick={handleInternalFaucet}>
    Get 50 USDC (Instant)
  </button>
) : (
  <a href={faucetInfo.url} target="_blank">
    Get 20 USDC from Circle Faucet (opens in new tab)
    <small>{faucetInfo.instructions}</small>
  </a>
)}
```

**Success Screen** (`widget/src/components/PaymentPage.tsx`):
```typescript
const cliCommand = getCliCommand(invoice.network, paymentId);
const explorerUrl = getExplorerUrl(invoice.network, paymentId);

{explorerUrl ? (
  <a href={explorerUrl} target="_blank">View on Explorer</a>
) : (
  <div>
    <code>{cliCommand}</code>
    <button onClick={() => copyCommand(cliCommand)}>Copy</button>
  </div>
)}
```

### 4.2 Merchant Changes

**Success Screen** (`merchant/src/controllers/verify-payment.js`):
```javascript
const network = invoice.network.split(':')[1]; // 'localnet' | 'testnet'
const cliCommand = getCliCommand(network, txDigest);
const explorerUrl = getExplorerUrl(network, txDigest);

// Render appropriate link/command
```

---

## Phase 5: Testing & Validation ✅

### 5.1 Test Execution Order

**CRITICAL**: Run tests in this order, fix failures before proceeding!

```bash
# 1. Localnet tests (ensure we didn't break anything)
npm run test:localnet --prefix facilitator
npm run test:localnet --prefix widget

# 2. Testnet tests (new functionality)
npm run test:testnet --prefix facilitator
npm run test:testnet --prefix widget

# 3. Combined (all tests)
npm run test:all --prefix facilitator
npm run test:all --prefix widget

# 4. Manual E2E on localnet
npm run dev:localnet --prefix merchant &
npm run dev:localnet --prefix facilitator &
npm run dev:localnet --prefix widget &

# 5. Manual E2E on testnet
npm run dev:testnet --prefix merchant &
npm run dev:testnet --prefix facilitator &
npm run dev:testnet --prefix widget &
```

### 5.2 Testnet E2E Test Checklist

- [ ] Merchant page displays HTTP 402
- [ ] Widget opens with invoice
- [ ] Faucet button shows Circle URL
- [ ] User can request 20 USDC from Circle
- [ ] Balance check works with testnet USDC
- [ ] PTB builds with testnet config
- [ ] Transaction signs and submits
- [ ] Optimistic mode works (~50ms)
- [ ] Pessimistic mode works (~1-2s on testnet)
- [ ] Explorer link opens on suivision.xyz
- [ ] `tsui client tx-block` command works
- [ ] Merchant success page loads
- [ ] Premium content displays

---

## Phase 6: Documentation & Git Tagging 📚

### 6.1 Update Documentation

**Files to Update**:
- [ ] `README.md` - Add testnet instructions
- [ ] `ARCHITECTURE.md` - Network switching details
- [ ] `DEPLOYMENT.md` - Testnet deployment guide
- [ ] `TESTING.md` - Tagged test strategy

### 6.2 Create Milestone

```bash
git tag -a v0.2.0-testnet -m "
Milestone: Testnet Deployment with Network Switching

✅ Core Features:
- Dual network support (localnet + testnet)
- Smart contract deployed to Sui testnet
- Circle testnet USDC integration
- Network-aware CLI commands (lsui vs tsui)
- Explorer links for testnet (suivision.xyz)
- Tagged test strategy (@localnet, @testnet, @both)
- Environment-based configuration
- Secure deployer wallet management

✅ Test Results:
- Facilitator: All tests pass on both networks
- Widget: All tests pass on both networks
- Manual E2E: ✅ Localnet + ✅ Testnet

🎯 Next: Production mainnet deployment
"
```

---

## Risk Assessment & Mitigation 🛡️

### High-Priority Risks:

1. **Network Config Drift**
   - **Risk**: .env.localnet and .env.testnet diverge, confusion
   - **Mitigation**: Shared config module validates all networks at startup

2. **Test Pollution**
   - **Risk**: Localnet tests accidentally run on testnet, unexpected costs
   - **Mitigation**: Tag system + explicit network env var checks

3. **Deployer Key Leakage**
   - **Risk**: Deployer keys committed to git
   - **Mitigation**: .gitignore + pre-commit hook + regular audits

4. **Circle Faucet Rate Limits**
   - **Risk**: Users can't get USDC for testing
   - **Mitigation**: Clear instructions + fallback to funded test wallet

5. **Gas Price Fluctuations**
   - **Risk**: Testnet gas exhaustion
   - **Mitigation**: Monitor facilitator balance, alert at <1 SUI

---

## Implementation Order (Detailed Steps)

### Step 0: Fix Tests (30 min) 🐤
1. Fix `merchantRecipient` → `payTo` in facilitator e2e test
2. Fix property name issues in widget PTB tests
3. Run all tests, verify green
4. Commit: "fix: update property names in tests for consistency"

### Step 1: Infrastructure (1 hour) 🔐
1. Generate deployer wallet
2. Transfer 20 SUI from existing testnet wallet
3. Create .env.deployer (add to .gitignore)
4. Commit: "chore: setup deployer wallet for testnet"

### Step 2: Network Config (2 hours) 🏗️
1. Create network config module
2. Add helper functions
3. Install cross-env + dotenv-cli
4. Create .env.localnet and .env.testnet for all packages
5. Update package.json scripts
6. Commit: "feat: add network configuration system"

### Step 3: Test Tags (1 hour) ✅
1. Add test tags (@localnet, @testnet, @both)
2. Update vitest config
3. Create test setup file
4. Run tagged tests, verify isolation
5. Commit: "feat: implement tagged test strategy"

### Step 4: Deploy Contract (30 min) 🚀
1. Deploy to testnet
2. Update PACKAGE_ID in .env.testnet
3. Verify on explorer
4. Commit: "deploy: publish contract to Sui testnet"

### Step 5: USDC Config (30 min) 💰
1. Get Circle testnet USDC type
2. Update config files
3. Fund test wallet with Circle faucet
4. Test balance check
5. Commit: "feat: integrate Circle testnet USDC"

### Step 6: UI Updates (2 hours) 🎨
1. Update faucet buttons
2. Update CLI commands
3. Update explorer links
4. Test network switching
5. Commit: "feat: add network-aware UI components"

### Step 7: Testing (2 hours) ✅
1. Run all localnet tests
2. Run all testnet tests
3. Manual E2E both networks
4. Fix any issues
5. Commit: "test: verify all tests pass on both networks"

### Step 8: Documentation (1 hour) 📚
1. Update README
2. Create deployment guide
3. Document network switching
4. Commit: "docs: add testnet deployment documentation"

### Step 9: Milestone (15 min) 🏁
1. Create v0.2.0-testnet tag
2. Update changelog
3. Push to remote

**Total Estimated Time**: 10-12 hours

---

## Success Criteria (Definition of Done)

- [ ] Phase 0: All tests pass (living canary alive!)
- [ ] Phase 1: Deployer wallet funded, .env files configured
- [ ] Phase 2: Network config module complete
- [ ] Phase 3: Contract deployed to testnet
- [ ] Phase 4: UI shows correct network info
- [ ] Phase 5: All tests pass on both networks
- [ ] Phase 6: Documentation complete, tag created
- [ ] Manual verification: Can switch between localnet/testnet seamlessly
- [ ] No deployer keys in git history or docs
- [ ] CI/CD ready for automated testing

---

## Open Questions for Discussion

1. **Deployer vs Facilitator**: Same wallet or separate? (My vote: separate for security)
2. **Circle Faucet UX**: Auto-redirect or manual instructions? (My vote: manual with clear instructions)
3. **Test Isolation**: Should localnet and testnet use different test data? (My vote: yes, separate test wallets)
4. **Network Detection**: Runtime vs env var? (My vote: env var with runtime validation)
5. **Fallback Strategy**: What if testnet is down? (My vote: graceful degradation to localnet)

---

**Status**: Ready for review and approval before implementation begins.
