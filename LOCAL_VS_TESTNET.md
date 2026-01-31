# SUI Local vs Testnet Development Model

## Foundry/Anvil Mental Model vs SUI

### Foundry/Anvil Approach (EVM)
```
Deployment Scripts + Config Files
├── scripts/
│   ├── Deploy.s.sol          # Deployment script
│   ├── DeployLocal.s.sol     # Local-specific
│   └── DeployTestnet.s.sol   # Testnet-specific
├── config/
│   ├── local.json            # Local addresses/params
│   └── testnet.json          # Testnet addresses/params
└── Mocks/
    └── MockUSDC.sol          # Local-only mocks

Different addresses per network → Manual management in config files
Different contracts per network → Scripts decide what to deploy
Forking possible → Test against mainnet state locally
```

### SUI Approach (Object-Based)
```
Automated Address Management + Environment Switching
├── Move.toml                 # Package definition (address = "0x0")
├── Move.lock                 # AUTO-GENERATED per-network addresses
│   [env.localnet]
│   chain-id = "localnet"
│   original-published-id = "0xABC..."
│   [env.testnet]
│   chain-id = "4c78adac"
│   original-published-id = "0xDEF..."
└── sources/
    └── payment.move          # SAME code for all networks

Single source of truth → No deployment scripts needed
Auto-tracked addresses → Move.lock manages per-network IDs
No mocks needed → Use generic Coin<T> for any token
No forking → Sui has no global state to fork
```

## Key Differences

### 1. Address Management

**Foundry (Manual):**
```solidity
// hardhat.config.ts
networks: {
  local: { url: "http://127.0.0.1:8545", chainId: 31337 },
  sepolia: { url: "...", chainId: 11155111 }
}

// After deploy: manually record addresses in config
{
  "USDC": {
    "local": "0x1234...",  // Mock USDC
    "sepolia": "0x5678..." // Real USDC
  }
}
```

**SUI (Automatic):**
```bash
# Switch environment
sui client switch --env localnet
sui client publish

# Move.lock automatically updated:
[env.localnet]
original-published-id = "0xABC..."

# Switch to testnet
sui client switch --env testnet
sui client publish

# Move.lock automatically updated:
[env.testnet]
original-published-id = "0xDEF..."
```

### 2. Mocks vs Generics

**Foundry (Needs Mocks):**
```solidity
// MockUSDC.sol - Only for local testing
contract MockUSDC is ERC20 {
  function mint(address to, uint amount) public {
    _mint(to, amount);
  }
}

// scripts/DeployLocal.s.sol
usdc = new MockUSDC(); // Deploy mock locally

// scripts/DeployTestnet.s.sol
usdc = IERC20(0xRealUSDCAddress); // Use real USDC on testnet
```

**SUI (No Mocks Needed):**
```move
// payment.move - Works with ANY Coin<T>
public fun settle_payment<T>(
    buyer_coin: &mut Coin<T>,  // Generic!
    // ...
)

// Local: Use Coin<SUI> (already available)
// Testnet: Use Coin<USDC> (from Circle)
// Mainnet: Use any Coin<T>
// NO separate mock contract needed!
```

### 3. Network Configuration

**Foundry (Manual Config):**
```javascript
// Different config per network
const config = {
  local: {
    USDC: "0xMockUSDC",
    router: "0xMockRouter",
    oracle: "0xMockOracle"
  },
  sepolia: {
    USDC: "0xRealUSDC",
    router: "0xRealRouter",
    oracle: "0xRealOracle"
  }
}
```

**SUI (Environment Switching):**
```bash
# No config files needed!
# Just switch environment:
sui client switch --env localnet   # Uses localnet addresses
sui client switch --env testnet    # Uses testnet addresses

# CLI automatically knows:
# - Which RPC to use (local vs remote)
# - Which addresses to use (from Move.lock)
# - Which keystore to use (~/.sui/sui_config/)
```

### 4. Deployment Process

**Foundry:**
```bash
# Local
anvil                           # Start local chain
forge script scripts/DeployLocal.s.sol --rpc-url http://localhost:8545 --broadcast

# Testnet
forge script scripts/DeployTestnet.s.sol --rpc-url $SEPOLIA_RPC --broadcast --verify

# Must update config files with new addresses!
```

**SUI:**
```bash
# Local
sui start --with-faucet                    # Start local network
sui client switch --env localnet
sui client publish                         # Publish (Move.lock updated)

# Testnet
sui client switch --env testnet
sui client publish                         # Publish (Move.lock updated)

# Move.lock automatically tracks addresses - no manual config!
```

## SUI Local Network Deep Dive

### Starting Local Network

```bash
# Option 1: Fresh start (no state persistence)
sui start --with-faucet --force-regenesis

# Option 2: Persistent state
sui start --with-faucet

# Option 3: With all services (indexer, GraphQL, etc)
sui start --with-faucet --with-indexer --with-graphql --force-regenesis
```

**Key Features:**
- Runs on `http://127.0.0.1:9000` (default)
- Includes local faucet on port `9123`
- Can enable indexer + GraphQL for testing
- `--force-regenesis`: Fresh state each time (like Anvil)
- No flag: Persistent state (like Hardhat node)

### Connecting to Local Network

```bash
# Create local environment
sui client new-env --alias localnet --rpc http://127.0.0.1:9000

# Switch to it
sui client switch --env localnet

# Verify
sui client active-env
# Output: localnet
```

### Getting Test Tokens

```bash
# Get SUI from local faucet (automatic)
sui client faucet

# Check balance
sui client gas

# For USDC testing on local:
# Option 1: Deploy mock USDC coin (Move contract)
# Option 2: Just use SUI as payment token locally
```

### Key Differences from Anvil

| Feature | Anvil (Foundry) | SUI Local Network |
|---------|----------------|-------------------|
| State | Ephemeral (default) | Configurable |
| Forking | ✅ Can fork mainnet | ❌ No forking |
| Mocking | Deploy mock contracts | Use generic types |
| Accounts | 10 pre-funded accounts | 15 pre-funded addresses |
| RPC | JSON-RPC (Ethereum) | gRPC (SUI-specific) |
| Explorer | External tools | Built-in (port 44380) |

## How Pay402 Should Work

### Current Implementation Status

Our implementation is **already correct** for the SUI model:

1. **Move.toml:** Address set to `0x0` ✅
2. **No deployment scripts:** Move contract is same for all networks ✅
3. **Generic Coin<T>:** Works with any token ✅
4. **No mocks needed:** Can use SUI locally, USDC on testnet ✅

### What We Need to Do

**1. Switch Tests to Localnet**

```typescript
// tests/facilitator.test.ts
const USE_TESTNET = false; // ← Change to false

// Will use:
// - RPC: http://127.0.0.1:9000
// - Network: localnet
// - Tokens: Coin<SUI> (from local faucet)
```

**2. Start Local Network**

```bash
# Terminal 1: Start local network
sui start --with-faucet --force-regenesis

# Terminal 2: Connect CLI
sui client new-env --alias localnet --rpc http://127.0.0.1:9000
sui client switch --env localnet
```

**3. Publish to Local Network**

```bash
cd move/payment
sui client publish --gas-budget 100000000

# Move.lock will automatically update with localnet address
```

**4. Configure Facilitator**

```bash
cd ../../facilitator
cp .env.example .env

# Edit .env:
SUI_NETWORK=localnet
PACKAGE_ID=<from publish output>
FACILITATOR_PRIVATE_KEY=<generate with sui client new-address>
```

**5. Run Tests**

```bash
# TypeScript tests (will use localnet)
npm test

# Move tests (network-agnostic)
cd ../move/payment
sui move test
```

## Idiomatic SUI Workflow

### For Development (Recommended)

```bash
# 1. Start local network
sui start --with-faucet --force-regenesis

# 2. Switch CLI to localnet
sui client switch --env localnet

# 3. Get test funds
sui client faucet

# 4. Develop & test Move code
cd move/payment
sui move test           # Unit tests
sui move build          # Check compilation

# 5. Publish to localnet
sui client publish

# 6. Test facilitator
cd ../../facilitator
npm test                # Integration tests
npm run dev            # Start API server

# 7. Test manually
curl http://localhost:3001/health
```

### For Testnet Deployment

```bash
# 1. Switch to testnet
sui client switch --env testnet

# 2. Verify environment
sui client active-env
# Output: testnet

# 3. Publish (Move.lock tracks separately!)
cd move/payment
sui client publish --gas-budget 100000000

# 4. Update facilitator config
cd ../../facilitator
# Edit .env:
SUI_NETWORK=testnet
PACKAGE_ID=<new testnet address>

# 5. Run tests against testnet
npm test

# 6. Deploy API server
npm run dev
```

## Summary

**Foundry Mental Model:**
- Manual address management
- Deployment scripts per network
- Mock contracts for local testing
- Config files with network-specific addresses

**SUI Mental Model:**
- Automatic address tracking (Move.lock)
- Same code for all networks
- Generic types (no mocks)
- Environment switching (sui client)

**Pay402 Implementation:**
- ✅ Already follows SUI idioms
- ✅ Generic Coin<T> (no mocks)
- ✅ Move.toml with address = "0x0"
- 🔧 Need to: Switch tests to localnet
- 🔧 Need to: Start local network for testing
- 🔧 Need to: Publish to localnet
- 🔧 Need to: Update facilitator config for localnet

**Next Steps:**
1. Start `sui start --with-faucet`
2. Switch tests to localnet
3. Publish Move contract to localnet
4. Run full test suite locally
