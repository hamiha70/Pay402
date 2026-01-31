# Pay402 Facilitator - Quick Setup Guide

## ✅ What's Been Built

The facilitator backend is complete with all 3 endpoints:

1. **GET /health** - Health check ✅
2. **POST /check-balance** - Coin discovery ✅  
3. **POST /settle-payment** - PTB construction & settlement ✅

## 🚀 Next Steps to Run

### 1. Generate Facilitator Keypair

```bash
# Generate new ed25519 keypair
sui client new-address ed25519

# Output will show:
# ╭─────────────────────────────────────────────────────────────────────────────────────────────────╮
# │ Created new keypair and saved it to keystore.                                                  │
# ├────────────────┬────────────────────────────────────────────────────────────────────────────────┤
# │ address        │ 0xYOUR_ADDRESS_HERE                                                            │
# │ keyScheme      │ ed25519                                                                        │
# │ recoveryPhrase │ word1 word2 word3 ... (SAVE THIS!)                                            │
# └────────────────┴────────────────────────────────────────────────────────────────────────────────┘

# Export the private key
sui keytool export --key-identity YOUR_ADDRESS_HERE --json

# Output: {"key": "suiprivkey1...", ...}
# Copy the "key" value
```

### 2. Deploy Move Contract

```bash
cd ../move/payment
sui client publish --gas-budget 100000000

# Output will show:
# ----- Transaction Digest ----
# ...
# ----- Transaction Data ----
# ...
# ╭─────────────────────────────────────────────────────────────────────────────────────╮
# │ Object Changes                                                                      │
# ├─────────────────────────────────────────────────────────────────────────────────────┤
# │ Created Objects:                                                                    │
# │  ┌──                                                                                │
# │  │ ObjectID: 0xPACKAGE_ID_HERE  ← COPY THIS!
# │  │ Sender: 0x...                                                                    │
# │  │ Owner: Immutable                                                                 │
# │  │ ObjectType: 0x2::package::UpgradeCap                                            │
# │  │ Version: 1                                                                       │
# │  │ Digest: ...                                                                      │
# │  └──                                                                                │
# └─────────────────────────────────────────────────────────────────────────────────────┘

# Copy the Package ID (0xPACKAGE_ID_HERE)
```

### 3. Configure Environment

```bash
cd ../facilitator
cp .env.example .env

# Edit .env and add:
FACILITATOR_PRIVATE_KEY=suiprivkey1...  # From step 1
PACKAGE_ID=0x...                        # From step 2
```

### 4. Fund Facilitator Address (for gas sponsorship)

```bash
# Get your facilitator address
sui client active-address

# Fund from faucet
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
  "network": "testnet",
  "facilitator": "0x...",
  "gasPrice": "1000",
  "timestamp": 1738392000000
}
```

### 2. Check Balance

```bash
curl -X POST http://localhost:3001/check-balance \
  -H "Content-Type: application/json" \
  -d '{
    "address": "0xYOUR_ADDRESS",
    "network": "sui:testnet",
    "coinType": "0xa1ec7fc00a6f40db9693ad1415d0c193ad3906494428cf252621037bd7117e29::usdc::USDC"
  }'
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

```bash
curl -X POST http://localhost:3001/settle-payment \
  -H "Content-Type: application/json" \
  -d '{
    "buyerAddress": "0xBUYER_ADDRESS",
    "amount": "100000",
    "merchant": "0xMERCHANT_ADDRESS",
    "facilitatorFee": "10000",
    "paymentId": "payment_test_123",
    "coinType": "0x2::sui::SUI",
    "network": "sui:testnet"
  }'
```

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

### Issue: "FACILITATOR_PRIVATE_KEY not set"

**Solution:** Create `.env` file from `.env.example` and add your private key.

### Issue: "No coins found"

**Solution:** Fund the buyer address with the requested coin type (SUI or USDC).

### Issue: "Insufficient balance"

**Solution:** Either:
1. Fund the buyer with more tokens
2. Reduce the `amount` + `facilitatorFee` in the request

### Issue: "Transaction failed"

**Solution:** Check:
1. Package ID is correct in `.env`
2. Coin type matches the contract generic type
3. Facilitator has enough SUI for gas

## ✅ Ready for Widget Integration

Once the facilitator is running and tested, you can proceed to build the browser widget that will:

1. Detect 402 responses
2. Trigger zkLogin (Google OAuth)
3. Call `/check-balance` to discover coins
4. Show payment confirmation UI
5. Call `/settle-payment` to submit PTB
6. Retry original request with payment token

See `HANDOFF_TYPESCRIPT.md` for widget implementation details.
