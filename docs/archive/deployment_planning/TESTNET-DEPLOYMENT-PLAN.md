# Testnet Deployment Implementation Plan

**Version**: v0.2.0-testnet  
**Status**: PLANNING  
**Prerequisites**: v0.1.0-localnet ✅ Complete

---

## Phase 0: Fix Living Canary 🐤 (MANDATORY)

**Status**: ⚠️ MUST DO FIRST  
**Estimated Time**: 30 minutes  
**Rationale**: Cannot start testnet work with failing tests - no baseline!

**Priority**: BLOCKING - nothing proceeds until green tests!

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

## Phase 0.5: Network Config Foundation 🏗️ (CRITICAL)

**Status**: ⚠️ DO BEFORE ANY FEATURE WORK  
**Estimated Time**: 3 hours  
**Rationale**: Prove network switching works BEFORE building testnet-specific features!

### Why This Phase is Critical

**Problem**: If we build testnet features without proven network switching, we risk:
- Config inconsistencies that break localnet
- Inability to test changes on localnet first
- Wasted time debugging network issues mixed with feature bugs

**Solution**: Build and test network switching infrastructure FIRST, then use it!

### 0.5.1 Create Network Config Module

**File**: `facilitator/src/config/networks.ts`

```typescript
export type Network = 'localnet' | 'testnet' | 'mainnet';

export interface NetworkConfig {
  network: Network;
  rpcUrl: string;
  packageId: string;
  usdcType: string;
  usdcDecimals: number;
  cliCommand: 'lsui' | 'tsui' | 'sui';
  explorerBaseUrl: string | null;
  faucetUrl: string | null;
  faucetType: 'internal' | 'circle' | null;
  // Network-specific timeouts (CRITICAL!)
  expectedConfirmationTime: number; // ms
  optimisticTimeout: number; // ms
  pessimisticTimeout: number; // ms
}

export function getNetworkConfig(networkOverride?: Network): NetworkConfig {
  const network = (networkOverride || process.env.NETWORK || 'localnet') as Network;
  
  switch (network) {
    case 'localnet':
      return {
        network: 'localnet',
        rpcUrl: 'http://127.0.0.1:9000',
        packageId: process.env.PACKAGE_ID!,
        usdcType: process.env.USDC_TYPE!,
        usdcDecimals: 6,
        cliCommand: 'lsui',
        explorerBaseUrl: null,
        faucetUrl: null,
        faucetType: 'internal',
        // Localnet is FAST
        expectedConfirmationTime: 50,
        optimisticTimeout: 100,
        pessimisticTimeout: 500,
      };
    
    case 'testnet':
      return {
        network: 'testnet',
        rpcUrl: 'https://fullnode.testnet.sui.io:443',
        packageId: process.env.PACKAGE_ID!,
        usdcType: process.env.USDC_TYPE!,
        usdcDecimals: 6,
        cliCommand: 'tsui',
        explorerBaseUrl: 'https://testnet.suivision.xyz',
        faucetUrl: 'https://faucet.circle.com',
        faucetType: 'circle',
        // Testnet is SLOWER
        expectedConfirmationTime: 1500,
        optimisticTimeout: 2000,
        pessimisticTimeout: 5000,
      };
    
    case 'mainnet':
      throw new Error('Mainnet not yet supported');
      
    default:
      throw new Error(`Unknown network: ${network}`);
  }
}

// Runtime validation (catches config errors early!)
export function validateNetworkConfig(config: NetworkConfig): void {
  const errors: string[] = [];
  
  if (!config.packageId) {
    errors.push(`PACKAGE_ID not set for ${config.network}`);
  }
  if (!config.usdcType) {
    errors.push(`USDC_TYPE not set for ${config.network}`);
  }
  if (!config.rpcUrl) {
    errors.push(`RPC_URL not set for ${config.network}`);
  }
  
  if (errors.length > 0) {
    throw new Error(
      `Network config validation failed for ${config.network}:\n` +
      errors.map(e => `  - ${e}`).join('\n')
    );
  }
}

// Export singleton instance (validated at startup)
export const NETWORK_CONFIG = (() => {
  const config = getNetworkConfig();
  validateNetworkConfig(config);
  return config;
})();
```

### 0.5.2 Create Helper Functions

**File**: `facilitator/src/utils/network-helpers.ts`

```typescript
import { NETWORK_CONFIG, type Network } from '../config/networks';

export function getCliCommand(digest: string): string {
  return `${NETWORK_CONFIG.cliCommand} client tx-block ${digest}`;
}

export function getExplorerUrl(digest: string): string | null {
  if (!NETWORK_CONFIG.explorerBaseUrl) return null;
  return `${NETWORK_CONFIG.explorerBaseUrl}/txblock/${digest}`;
}

export interface FaucetInfo {
  url: string | null;
  type: 'internal' | 'circle' | null;
  instructions: string;
  shouldOpenInNewTab: boolean;
  requiresManualAction: boolean;
}

export function getFaucetInfo(buyerHasUSDC: boolean): FaucetInfo {
  // If buyer already has USDC, don't show faucet (Circle rate limit)
  if (buyerHasUSDC && NETWORK_CONFIG.faucetType === 'circle') {
    return {
      url: null,
      type: null,
      instructions: 'You already have USDC. Circle faucet limit: 1 request per address per 2 hours.',
      shouldOpenInNewTab: false,
      requiresManualAction: false,
    };
  }
  
  if (NETWORK_CONFIG.faucetType === 'internal') {
    return {
      url: '/fund',
      type: 'internal',
      instructions: 'Click to instantly receive 50 MOCK_USDC (localnet only)',
      shouldOpenInNewTab: false,
      requiresManualAction: false,
    };
  }
  
  if (NETWORK_CONFIG.faucetType === 'circle') {
    return {
      url: 'https://faucet.circle.com',
      type: 'circle',
      instructions: 'Opens Circle faucet in new tab. You will receive 20 USDC. Limit: once per address per 2 hours.',
      shouldOpenInNewTab: true,
      requiresManualAction: true,
    };
  }
  
  return {
    url: null,
    type: null,
    instructions: 'No faucet available',
    shouldOpenInNewTab: false,
    requiresManualAction: false,
  };
}

// Network-aware timeout helper
export function getNetworkTimeout(operation: 'optimistic' | 'pessimistic'): number {
  return operation === 'optimistic'
    ? NETWORK_CONFIG.optimisticTimeout
    : NETWORK_CONFIG.pessimisticTimeout;
}
```

### 0.5.3 Copy Module to Widget and Merchant

**IMPORTANT**: Widget and merchant need the SAME network config logic!

```bash
# Create shared config (isomorphic)
cp facilitator/src/config/networks.ts widget/src/lib/networks.ts
cp facilitator/src/utils/network-helpers.ts widget/src/lib/network-helpers.ts

# merchant uses JavaScript, so create .js version
# (manually convert or use build tool)
```

### 0.5.4 Create Simple Tests for Network Config

**File**: `facilitator/src/config/__tests__/networks.test.ts`

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { getNetworkConfig, validateNetworkConfig } from '../networks';

describe('@both Network Configuration', () => {
  const originalEnv = process.env.NETWORK;
  
  afterEach(() => {
    process.env.NETWORK = originalEnv;
  });
  
  it('should default to localnet when NETWORK not set', () => {
    delete process.env.NETWORK;
    const config = getNetworkConfig();
    expect(config.network).toBe('localnet');
    expect(config.cliCommand).toBe('lsui');
  });
  
  it('should use testnet when NETWORK=testnet', () => {
    process.env.NETWORK = 'testnet';
    const config = getNetworkConfig();
    expect(config.network).toBe('testnet');
    expect(config.cliCommand).toBe('tsui');
    expect(config.explorerBaseUrl).toContain('suivision');
  });
  
  it('should have faster timeouts for localnet', () => {
    const localnet = getNetworkConfig('localnet');
    const testnet = getNetworkConfig('testnet');
    
    expect(localnet.expectedConfirmationTime).toBeLessThan(100);
    expect(testnet.expectedConfirmationTime).toBeGreaterThan(1000);
  });
  
  it('should validate required fields', () => {
    const invalidConfig = {
      network: 'localnet' as const,
      packageId: '', // Missing!
      usdcType: 'test',
      rpcUrl: 'http://test',
      // ... other fields
    };
    
    expect(() => validateNetworkConfig(invalidConfig as any)).toThrow('PACKAGE_ID');
  });
});

describe('@localnet Network Helpers - Localnet', () => {
  beforeEach(() => {
    process.env.NETWORK = 'localnet';
  });
  
  it('should generate lsui command', () => {
    const cmd = getCliCommand('ABC123');
    expect(cmd).toBe('lsui client tx-block ABC123');
  });
  
  it('should return null for explorer URL', () => {
    const url = getExplorerUrl('ABC123');
    expect(url).toBeNull();
  });
  
  it('should show internal faucet info', () => {
    const info = getFaucetInfo(false);
    expect(info.type).toBe('internal');
    expect(info.shouldOpenInNewTab).toBe(false);
  });
});

describe('@testnet Network Helpers - Testnet', () => {
  beforeEach(() => {
    process.env.NETWORK = 'testnet';
  });
  
  it('should generate tsui command', () => {
    const cmd = getCliCommand('ABC123');
    expect(cmd).toBe('tsui client tx-block ABC123');
  });
  
  it('should return explorer URL', () => {
    const url = getExplorerUrl('ABC123');
    expect(url).toContain('suivision.xyz');
    expect(url).toContain('ABC123');
  });
  
  it('should show Circle faucet when no USDC', () => {
    const info = getFaucetInfo(false); // No USDC yet
    expect(info.type).toBe('circle');
    expect(info.shouldOpenInNewTab).toBe(true);
    expect(info.url).toContain('circle.com');
  });
  
  it('should NOT show faucet if buyer has USDC (rate limit)', () => {
    const info = getFaucetInfo(true); // Already has USDC
    expect(info.url).toBeNull();
    expect(info.instructions).toContain('already have USDC');
  });
});
```

### 0.5.5 Test Network Switching with Real Services

**Test Script**: `facilitator/scripts/test-network-switch.sh`

```bash
#!/bin/bash
set -e

echo "🧪 Testing Network Configuration Switching"
echo "=========================================="

# Test 1: Localnet config
echo ""
echo "Test 1: Localnet configuration"
NETWORK=localnet node -e "
  const { NETWORK_CONFIG } = require('./dist/config/networks.js');
  console.log('Network:', NETWORK_CONFIG.network);
  console.log('CLI:', NETWORK_CONFIG.cliCommand);
  console.log('RPC:', NETWORK_CONFIG.rpcUrl);
  console.log('Timeouts:', NETWORK_CONFIG.expectedConfirmationTime + 'ms');
  if (NETWORK_CONFIG.network !== 'localnet') process.exit(1);
  if (NETWORK_CONFIG.cliCommand !== 'lsui') process.exit(1);
"
echo "✅ Localnet config correct"

# Test 2: Testnet config
echo ""
echo "Test 2: Testnet configuration"
NETWORK=testnet node -e "
  const { NETWORK_CONFIG } = require('./dist/config/networks.js');
  console.log('Network:', NETWORK_CONFIG.network);
  console.log('CLI:', NETWORK_CONFIG.cliCommand);
  console.log('RPC:', NETWORK_CONFIG.rpcUrl);
  console.log('Timeouts:', NETWORK_CONFIG.expectedConfirmationTime + 'ms');
  if (NETWORK_CONFIG.network !== 'testnet') process.exit(1);
  if (NETWORK_CONFIG.cliCommand !== 'tsui') process.exit(1);
"
echo "✅ Testnet config correct"

# Test 3: Start facilitator on localnet
echo ""
echo "Test 3: Starting facilitator on localnet..."
NETWORK=localnet npm start &
LOCALNET_PID=$!
sleep 3

# Check health endpoint
HEALTH=$(curl -s http://localhost:3001/health | jq -r '.network')
if [ "$HEALTH" != "localnet" ]; then
  echo "❌ Facilitator reported wrong network: $HEALTH"
  kill $LOCALNET_PID
  exit 1
fi
echo "✅ Facilitator running on localnet"

# Stop localnet
kill $LOCALNET_PID
sleep 1

echo ""
echo "=========================================="
echo "✅ All network switching tests passed!"
```

### 0.5.6 Success Criteria for Phase 0.5

**MUST PASS BEFORE PROCEEDING**:

- [ ] Network config module compiles (TypeScript)
- [ ] All network config tests pass (`npm test -- networks.test.ts`)
- [ ] Can switch between localnet/testnet via `NETWORK` env var
- [ ] Helper functions return correct values per network
- [ ] Timeout values differ correctly (localnet fast, testnet slow)
- [ ] Faucet logic respects buyer USDC balance
- [ ] Test script `test-network-switch.sh` passes
- [ ] Facilitator starts on localnet with correct config
- [ ] Facilitator starts on testnet with correct config (after Phase 3)
- [ ] **ALL EXISTING LOCALNET TESTS STILL PASS**

**Critical**: If any existing localnet functionality breaks, STOP and fix before proceeding!

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
export type Network = "localnet" | "testnet" | "mainnet";

export interface NetworkConfig {
  network: Network;
  rpcUrl: string;
  packageId: string;
  usdcType: string;
  cliCommand: "lsui" | "tsui" | "sui";
  explorerBaseUrl: string | null;
  faucetUrl: string | null;
  faucetType: "internal" | "circle" | null;
}

export function getNetworkConfig(network: Network): NetworkConfig {
  switch (network) {
    case "localnet":
      return {
        network: "localnet",
        rpcUrl: "http://127.0.0.1:9000",
        packageId: process.env.PACKAGE_ID_LOCALNET!,
        usdcType: "<MOCK_USDC_TYPE>",
        cliCommand: "lsui",
        explorerBaseUrl: null,
        faucetUrl: null,
        faucetType: "internal", // Uses /fund endpoint
      };

    case "testnet":
      return {
        network: "testnet",
        rpcUrl: "https://fullnode.testnet.sui.io:443",
        packageId: process.env.PACKAGE_ID_TESTNET!,
        usdcType: "<TESTNET_USDC_TYPE>",
        cliCommand: "tsui",
        explorerBaseUrl: "https://testnet.suivision.xyz",
        faucetUrl: "https://faucet.circle.com",
        faucetType: "circle", // Manual, rate-limited
      };

    case "mainnet":
      throw new Error("Mainnet not yet supported");
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

export function getExplorerUrl(
  network: Network,
  digest: string
): string | null {
  const config = getNetworkConfig(network);
  if (!config.explorerBaseUrl) return null;
  return `${config.explorerBaseUrl}/txblock/${digest}`;
}

export function getFaucetInfo(network: Network): {
  url: string | null;
  type: "internal" | "circle" | null;
  instructions: string;
} {
  const config = getNetworkConfig(network);

  if (config.faucetType === "internal") {
    return {
      url: "/fund",
      type: "internal",
      instructions: "Click to instantly receive 50 MOCK_USDC (localnet only)",
    };
  }

  if (config.faucetType === "circle") {
    return {
      url: "https://faucet.circle.com",
      type: "circle",
      instructions:
        "Visit Circle faucet (opens in new tab). Limit: 20 USDC every 2 hours.",
    };
  }

  return { url: null, type: null, instructions: "No faucet available" };
}
```

### 2.3 Test Strategy: Tagged Tests

**Approach**: Use test tags (@localnet, @testnet, @both)

**Example**:

```typescript
// src/__tests__/payment.test.ts

describe("Payment Flow", () => {
  describe("@both - Invoice Validation", () => {
    it("should reject expired invoices", () => {
      // Works on both networks
    });
  });

  describe("@localnet - Internal Faucet", () => {
    it("should fund wallet instantly", async () => {
      // Only on localnet
    });
  });

  describe("@testnet - Circle Faucet", () => {
    it("should display Circle faucet URL", async () => {
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
    testMatch: ["**/src/**/*.test.ts", "**/src/**/__tests__/**/*.ts"],
    setupFiles: ["./test/setup.ts"],
  },
});
```

**Setup File**:

```typescript
// test/setup.ts
import { beforeAll } from "vitest";

beforeAll(() => {
  const network = process.env.NETWORK || "localnet";
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
- **Faucet**: https://faucet.circle.com
- **Rate Limit**: 20 USDC per address per 2 hours ⚠️

**Update Config**:

```bash
# facilitator/.env.testnet
USDC_TYPE=<circle-testnet-usdc-type>
USDC_DECIMALS=6

# merchant/.env.testnet
USDC_TYPE=<circle-testnet-usdc-type>
RESOURCE_PRICE=100000  # 0.10 USDC
```

### 3.3 Setup Testnet "Internal Faucet" for E2E Tests

**Purpose**: Pre-funded wallet to distribute smaller USDC amounts in automated tests

**Why Needed**: 
- Circle faucet gives 20 USDC (too much per test, wastes quota)
- Circle faucet is manual browser-based (can't automate HTTPS call)
- Circle faucet has rate limits (blocks continuous testing)

**Solution**: Deployer/faucet wallet holds USDC, distributes small amounts to test wallets

**User Action Required**:
1. User manually visits https://faucet.circle.com
2. Requests 20 USDC to deployer wallet address (will be created in Phase 1)
3. This USDC is used for ALL automated E2E tests
4. Each test gets small amount (e.g., 0.50 USDC), not full 20 USDC

**Implementation** (in facilitator `/fund` endpoint):
```typescript
// facilitator/src/controllers/fund.ts

export async function fundWallet(address: string, amount: number) {
  if (NETWORK_CONFIG.network === 'localnet') {
    // Existing: mint MOCK_USDC
    return mintMockUSDC(address, amount);
  }
  
  if (NETWORK_CONFIG.network === 'testnet') {
    // NEW: Transfer from pre-funded deployer wallet
    const balance = await getUSDCBalance(DEPLOYER_ADDRESS);
    
    if (balance < amount) {
      throw new Error(
        `Testnet faucet exhausted!\n` +
        `Balance: ${balance / 1_000_000} USDC\n` +
        `Requested: ${amount / 1_000_000} USDC\n` +
        `Please refund from https://faucet.circle.com`
      );
    }
    
    // Transfer small test amount (NOT 20 USDC!)
    return transferUSDC(DEPLOYER_ADDRESS, address, amount);
  }
}
```

### 3.4 Fund Facilitator Wallet

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

{
  faucetInfo.type === "internal" ? (
    <button onClick={handleInternalFaucet}>Get 50 USDC (Instant)</button>
  ) : (
    <a href={faucetInfo.url} target="_blank">
      Get 20 USDC from Circle Faucet (opens in new tab)
      <small>{faucetInfo.instructions}</small>
    </a>
  );
}
```

**Success Screen** (`widget/src/components/PaymentPage.tsx`):

```typescript
const cliCommand = getCliCommand(invoice.network, paymentId);
const explorerUrl = getExplorerUrl(invoice.network, paymentId);

{
  explorerUrl ? (
    <a href={explorerUrl} target="_blank">
      View on Explorer
    </a>
  ) : (
    <div>
      <code>{cliCommand}</code>
      <button onClick={() => copyCommand(cliCommand)}>Copy</button>
    </div>
  );
}
```

### 4.2 Merchant Changes

**Success Screen** (`merchant/src/controllers/verify-payment.js`):

```javascript
const network = invoice.network.split(":")[1]; // 'localnet' | 'testnet'
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

### Step 0.5: Network Config Foundation (3 hours) 🏗️ **DO BEFORE FEATURE WORK**

1. Create `facilitator/src/config/networks.ts` with timeout configs
2. Create `facilitator/src/utils/network-helpers.ts`
3. Add comprehensive network config tests with tags
4. Copy modules to widget (`widget/src/lib/networks.ts`)
5. Create merchant JS version (or TypeScript)
6. Install dependencies: `npm install --save-dev cross-env dotenv-cli`
7. Create `.env.localnet` and `.env.testnet` skeleton files
8. Create `test-network-switch.sh` validation script
9. Run: `npm test -- networks.test.ts` (must pass!)
10. Run: `./scripts/test-network-switch.sh` (must pass!)
11. **CRITICAL**: Run ALL existing localnet tests (must still pass!)
12. Commit: "feat: network configuration foundation with proven switching"

**GATE CHECK**: Do NOT proceed until:
- [ ] Network config module tests pass
- [ ] Network switch script passes
- [ ] **ALL existing localnet tests pass** (no regressions!)
- [ ] Can start facilitator with `NETWORK=localnet npm start`
- [ ] Config validation catches missing env vars

### Step 1: Infrastructure (1 hour) 🔐

1. Generate deployer wallet with: `tsui client new-address ed25519`
2. Transfer 20 SUI from existing testnet wallet (USER ACTION)
3. Create `.env.deployer` (add to `.gitignore`)
4. **USER**: Manually visit https://faucet.circle.com and send 20 USDC to deployer
5. Verify deployer balance: `tsui client balance --address $DEPLOYER_ADDRESS`
6. Document deployer address in team notes (NOT git)
7. Commit: "chore: setup deployer wallet for testnet (keys not committed)"

### Step 2: Use Network Config in Code (2 hours) 🔨

1. Update facilitator to use `NETWORK_CONFIG` singleton
2. Update merchant to use network helpers
3. Update widget to use network helpers  
4. Replace hardcoded values with `getCliCommand(digest)`
5. Replace hardcoded URLs with `getExplorerUrl(digest)`
6. Add network-aware faucet logic
7. **CRITICAL**: Test on localnet - verify nothing broke!
8. Commit: "refactor: use network config throughout codebase"

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

## Decisions Made ✅

1. **✅ Deployer vs Facilitator**: **SEPARATE wallets** (security isolation approved)
2. **✅ Circle Faucet UX**: **New tab with balance check** - only open if USDC balance is zero
3. **✅ Test Isolation**: 
   - **UI E2E**: Opens Circle faucet in new tab (manual, once per address)
   - **Automated E2E**: Uses pre-funded "testnet faucet" wallet with smaller amounts
   - **User funds deployer/faucet wallet manually** from Circle faucet
4. **✅ Network Detection**: **Env var + runtime validation** (hybrid approach approved)
5. **✅ Network Switching**: **Both can run simultaneously** (localnet:9000, testnet:443)
   - No switching time - it's a configuration selection issue
   - ⚠️ **CRITICAL**: Response times differ! Localnet ~50ms, Testnet ~1-2s

---

## ⚠️ CRITICAL NEW REQUIREMENT: Response Time Differences

**Localnet**: ~20-50ms transaction finality  
**Testnet**: ~500-2000ms transaction finality  

**Impact**:
- Optimistic mode timing expectations
- UI loading states and timeouts
- Test assertions (timing-dependent)
- User experience (perceived performance)

**Mitigation Strategy**:
- Network-aware timeout configs
- Separate performance assertions per network
- UI shows network-specific latency hints
- Document expected response times per network

---

**Status**: ✅ APPROVED - Ready to begin implementation!
