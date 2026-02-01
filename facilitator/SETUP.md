# Pay402 Facilitator - Quick Setup Guide

## ✅ What's Been Built

The facilitator backend is complete with all 3 endpoints:

1. **GET /health** - Health check ✅
2. **POST /check-balance** - Coin discovery ✅  
3. **POST /settle-payment** - PTB construction & settlement ✅

## 🚀 Quick Start (Suibase + tmux)

### Option A: Automated Setup (Recommended)

```bash
# Launch complete dev environment with tmux
cd ~/Projects/ETHGlobal/HackMoney_Jan26/Pay402
./scripts/pay402-tmux.sh

# This creates 4 panes:
# - Pane 1 (top-left): Facilitator backend
# - Pane 2 (top-right): Move development
# - Pane 3 (bottom-left): Testing
# - Pane 4 (bottom-right): Suibase control

# In Pane 4: Start localnet (if not running)
localnet start

# In Pane 1: Start facilitator
npm run dev

# Navigate panes: Ctrl-b + arrow keys
# Quick reference: ./scripts/pay402-ref.sh
```

### Option B: Manual Setup

### 1. Start Suibase Localnet

```bash
# Start local SUI network (runs as daemon)
localnet start

# Verify it's running
localnet status
# Should show: localnet OK, all services running
```

### 2. Generate Facilitator Keypair

**For localnet:**
```bash
# Use Suibase's localnet-specific command
lsui client new-address ed25519

# Output shows address and recovery phrase (SAVE IT!)
# Suibase provides 15 pre-funded addresses (sb-1-ed25519, etc.)
# You can use those or create a new one
```

**For testnet:**
```bash
# Use Suibase's testnet-specific command
tsui client new-address ed25519
```

**Export the private key:**
```bash
# Localnet
lsui keytool export --key-identity 0xYOUR_ADDRESS --json

# Testnet
tsui keytool export --key-identity 0xYOUR_ADDRESS --json

# Output: {"key": "suiprivkey1...", ...}
# Copy the "key" value
```

### 3. Deploy Move Contract

**For localnet:**
```bash
cd ../move/payment
lsui client publish --gas-budget 100000000

# Package ID is automatically saved to Move.lock!
# Check it: cat Move.lock
# Look for: [env.localnet] original-published-id = "0x..."
```

**For testnet:**
```bash
cd ../move/payment
tsui client publish --gas-budget 100000000

# Package ID saved to Move.lock under [env.testnet]
```

### 4. Configure Environment

```bash
cd ../facilitator

# Create .env from example
cp .env.example .env

# Edit .env:
nano .env
```

**For localnet:**
```bash
PORT=3001
SUI_NETWORK=localnet
PACKAGE_ID=0x...           # From Move.lock [env.localnet]
FACILITATOR_PRIVATE_KEY=suiprivkey1...
FACILITATOR_FEE=10000
```

**For testnet:**
```bash
PORT=3001
SUI_NETWORK=testnet
PACKAGE_ID=0x...           # From Move.lock [env.testnet]
FACILITATOR_PRIVATE_KEY=suiprivkey1...
FACILITATOR_FEE=10000
```

### 5. Fund Facilitator Address (for gas sponsorship)

**For localnet:**
```bash
# Localnet has unlimited faucet access
lsui client faucet

# Or specify address
lsui client faucet --address 0xYOUR_ADDRESS
```

**For testnet:**
```bash
# Testnet faucet (limited, use sparingly!)
tsui client faucet

# Or via API
curl --location --request POST 'https://faucet.testnet.sui.io/gas' \
  --header 'Content-Type: application/json' \
  --data-raw '{"FixedAmountRequest": {"recipient": "YOUR_FACILITATOR_ADDRESS"}}'
```

### 5. Start Server

```bash
npm run dev
```

Server will start on `http://localhost:3001`

## 🧪 Testing the Endpoints

### 1. Health Check

```bash
curl http://localhost:3001/health
```

Expected response:
```json
{
  "status": "ok",
  "network": "localnet",
  "facilitator": "0x...",
  "gasPrice": "[object Object]",
  "timestamp": 1738392000000
}
```

### 2. Check Balance

```bash
curl -X POST http://localhost:3001/check-balance \
  -H "Content-Type: application/json" \
  -d '{
    "address": "0xf7ae71f84fabc58662bd4209a8893f462c60f247095bb35b19ff659ad0081462",
    "network": "localnet"
  }'

# Note: Use "localnet" or "testnet" for network
# coinType is optional, defaults to USDC
# Use lsui client addresses to get test addresses on localnet
```

Expected response:
```json
{
  "balance": "20000000",
  "coinType": "0xa1ec7fc00a6f40db9693ad1415d0c193ad3906494428cf252621037bd7117e29::usdc::USDC",
  "coins": [
    {
      "coinObjectId": "0x...",
      "balance": "20000000"
    }
  ],
  "coinCount": 1
}
```

**Note:** Endpoint defaults to USDC if no `coinType` specified. SUI is for gas only.

### 3. Settle Payment (requires funded address)

**⚠️ Testnet only: Use small amounts to preserve limited USDC supply (~20 USDC available)**  
**💡 Localnet: Test freely with unlimited faucet!**

```bash
# Test with 0.01 USDC payment + 0.01 USDC fee = 0.02 USDC total
curl -X POST http://localhost:3001/settle-payment \
  -H "Content-Type: application/json" \
  -d '{
    "buyerAddress": "0xBUYER_ADDRESS",
    "amount": "10000",
    "merchant": "0xMERCHANT_ADDRESS",
    "facilitatorFee": "10000",
    "paymentId": "payment_test_123",
    "coinType": "0xa1ec7fc00a6f40db9693ad1415d0c193ad3906494428cf252621037bd7117e29::usdc::USDC",
    "network": "localnet"
  }'

# Get test addresses: lsui client addresses
```

**Amount guidelines:**
- **Localnet:** Test with any amounts (unlimited faucet)
- **Testnet:** Keep amounts small (10000-100000 = 0.01-0.10 USDC)
- `facilitatorFee`: 10000 (0.01 USDC fixed)

Expected response:
```json
{
  "success": true,
  "transaction": { ... },
  "timestamp": 1738392000000
}
```

## 📝 Implementation Notes

### Tech Stack

- **Runtime:** Node.js + ES Modules
- **Framework:** Express 5
- **Language:** TypeScript (strict mode)
- **SDK:** @mysten/sui (gRPC client)
- **Dev Tool:** tsx (watch mode)

### Architecture

```
facilitator/
├── src/
│   ├── index.ts           # Express app + routes
│   ├── config.ts          # Environment configuration
│   ├── sui.ts             # SuiGrpcClient initialization
│   └── controllers/
│       ├── health.ts      # GET /health
│       ├── balance.ts     # POST /check-balance
│       └── payment.ts     # POST /settle-payment
├── package.json
├── tsconfig.json
└── .env                   # (create from .env.example)
```

### Key Implementation Details

1. **SuiGrpcClient** - Uses gRPC for better performance vs. JSON-RPC
2. **Coin Discovery** - `listCoins()` API discovers all coin objects by type
3. **PTB Construction** - Client-side transaction building (not in Move contract)
4. **Generic Coin Types** - Supports any `Coin<T>` (SUI, USDC, etc.)
5. **Gas Sponsorship** - Facilitator pays SUI gas for all transactions

### Coin Type Constants

```typescript
// SUI Native Token
"0x2::sui::SUI"

// USDC on Testnet
"0xa1ec7fc00a6f40db9693ad1415d0c193ad3906494428cf252621037bd7117e29::usdc::USDC"
```

## 🐛 Troubleshooting

### Issue: "Connection refused"

**Solution:** 
```bash
localnet status    # Check if localnet is running
localnet start     # Start if not running
```

### Issue: "FACILITATOR_PRIVATE_KEY not set"

**Solution:** 
1. Create `.env` file from `.env.example`
2. Add your private key in `suiprivkey1...` format
3. Generate new key: `lsui client new-address ed25519`
4. Export it: `lsui keytool export --key-identity 0xADDRESS --json`

### Issue: "No coins found"

**Solution:** 
```bash
# Localnet: Use faucet
lsui client faucet --address 0xBUYER_ADDRESS

# Testnet: Use faucet (limited!)
tsui client faucet --address 0xBUYER_ADDRESS
```

### Issue: "Insufficient balance"

**Solution:** Either:
1. Fund the buyer with more tokens (localnet: `lsui client faucet`)
2. Reduce the `amount` + `facilitatorFee` in the request

### Issue: "Transaction failed" or "Package ID mismatch"

**Solution:** Check:
1. Package ID matches Move.lock: `cat ../move/payment/Move.lock`
2. Update `.env` with correct PACKAGE_ID for your network
3. Facilitator has enough SUI for gas: `lsui client gas`
4. Restart facilitator after updating `.env`

### Issue: "Network not found" or wrong network

**Solution:**
1. Check SUI_NETWORK in `.env` matches your target (localnet/testnet)
2. Use correct command prefix: `lsui` for localnet, `tsui` for testnet
3. Restart facilitator after changing network

## 📚 Additional Resources

### Suibase Workflow
- **Complete Guide:** `~/Projects/ETHGlobal/HackMoney_Jan26/HackMoney_Research/SUI_Dev_Setup/SUIBASE_GUIDE.md`
- **Quick Reference:** `./scripts/pay402-ref.sh`
- **tmux Setup:** `./scripts/pay402-tmux.sh`

### Network-Specific Commands
```bash
# Localnet
lsui client addresses      # List addresses
lsui client gas            # Check balances
lsui client faucet         # Get test SUI
lsui move test             # Run Move tests
lsui client publish        # Deploy contracts

# Testnet (same commands, different prefix)
tsui client addresses
tsui client faucet
tsui client publish
```

### Key Differences: Localnet vs Testnet
| Aspect | Localnet | Testnet |
|--------|----------|---------|
| **Network** | SUI_NETWORK=localnet | SUI_NETWORK=testnet |
| **Package ID** | From Move.lock [env.localnet] | From Move.lock [env.testnet] |
| **Faucet** | Unlimited | Limited (use sparingly!) |
| **Persistence** | Yes (survives restarts) | N/A (remote network) |
| **Reset** | `localnet regen` | Cannot reset |
| **Command prefix** | `lsui` | `tsui` |

## ✅ Ready for Widget Integration

Once the facilitator is running and tested, you can proceed to build the browser widget that will:

1. Detect 402 responses
2. Trigger zkLogin (Google OAuth)
3. Call `/check-balance` to discover coins
4. Show payment confirmation UI
5. Call `/settle-payment` to submit PTB
6. Retry original request with payment token

See `HANDOFF_TYPESCRIPT.md` for widget implementation details.
