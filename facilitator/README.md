# Pay402 Facilitator Backend

TypeScript backend API for Pay402 x402 payment facilitator on SUI blockchain.

## Features

- ✅ **GET /health** - Health check endpoint
- ✅ **POST /check-balance** - Discover coins and check balance
- ✅ **POST /settle-payment** - Construct PTB and settle payment on-chain

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment

Copy `.env.example` to `.env` and fill in the values:

```bash
cp .env.example .env
```

Required environment variables:

- `PORT` - Server port (default: 3001)
- `SUI_NETWORK` - Network (testnet or mainnet)
- `PACKAGE_ID` - Deployed Move contract package ID
- `FACILITATOR_PRIVATE_KEY` - Facilitator's SUI private key
- `FACILITATOR_FEE` - Fixed fee in microUSDC (default: 10000 = 0.01 USDC)

### 3. Generate Facilitator Keypair

```bash
sui client new-address ed25519
```

Copy the private key to `.env` as `FACILITATOR_PRIVATE_KEY`.

### 4. Deploy Move Contract

```bash
cd ../move/payment
sui client publish --gas-budget 100000000
```

Copy the package ID to `.env` as `PACKAGE_ID`.

### 5. Fund Facilitator Address

The facilitator needs SUI tokens for gas sponsorship:

```bash
# Get facilitator address
sui client active-address

# Fund from faucet (testnet)
curl --location --request POST 'https://faucet.testnet.sui.io/gas' \
  --header 'Content-Type: application/json' \
  --data-raw '{"FixedAmountRequest": {"recipient": "YOUR_FACILITATOR_ADDRESS"}}'
```

## Development

Start the development server with auto-reload:

```bash
npm run dev
```

The server will start on `http://localhost:3001`.

## API Endpoints

### GET /health

Health check endpoint.

**Response:**

```json
{
  "status": "ok",
  "network": "testnet",
  "facilitator": "0x...",
  "epoch": "123",
  "timestamp": 1738392000000
}
```

### POST /check-balance

Check buyer's balance and discover coin objects.

**Request:**

```json
{
  "address": "0xABC...DEF",
  "network": "sui:testnet",
  "coinType": "0xa1ec7fc00a6f40db9693ad1415d0c193ad3906494428cf252621037bd7117e29::usdc::USDC"
}
```

**Response:**

```json
{
  "balance": "20000000",
  "coinType": "0xa1ec7fc00a6f40db9693ad1415d0c193ad3906494428cf252621037bd7117e29::usdc::USDC",
  "coins": [
    {
      "coinObjectId": "0xCOIN1...",
      "balance": "10000000"
    },
    {
      "coinObjectId": "0xCOIN2...",
      "balance": "10000000"
    }
  ],
  "coinCount": 2
}
```

**Note:** Defaults to USDC if `coinType` not specified. **Do not use SUI for payments on testnet** - SUI is reserved for gas only due to limited supply.

### POST /settle-payment

Settle payment on-chain via PTB.

**Request:**

```json
{
  "buyerAddress": "0xBUYER...",
  "amount": "10000",
  "merchant": "0xMERCHANT...",
  "facilitatorFee": "10000",
  "paymentId": "payment_abc123",
  "coinType": "0xa1ec7fc00a6f40db9693ad1415d0c193ad3906494428cf252621037bd7117e29::usdc::USDC",
  "network": "sui:testnet"
}
```

**Amount guidelines for testing:**

- Use small amounts: 10000-100000 micro-USDC (0.01-0.10 USDC)
- Preserves limited testnet USDC supply (~20 USDC available)
- Each test costs ~0.02-0.11 USDC total (amount + fee)

**Note:** Use USDC for payments. SUI is for gas sponsorship only (even more limited).

**Response:**

```json
{
  "success": true,
  "digest": "0xTXHASH...",
  "effects": { ... },
  "events": [ ... ],
  "timestamp": 1738392000000
}
```

## Testing

Run all tests:

```bash
npm test
```

Test suites:

- `src/__tests__/build-ptb.test.ts` - PTB construction
- `src/__tests__/api-integration.test.ts` - HTTP endpoints
- `src/__tests__/ptb-codec.test.ts` - PTB encoding/decoding
- `src/__tests__/state-consistency.test.ts` - Blockchain state

## Troubleshooting

### Connection Refused

Check if localnet is running:

```bash
localnet status
localnet start  # if not running
```

### "No coins found for buyer"

Buyer address needs USDC:

```bash
# Localnet (unlimited):
curl -X POST http://localhost:3001/fund \
  -H "Content-Type: application/json" \
  -d '{"address": "0xBUYER_ADDRESS", "amount": "20000000"}'

# Testnet (limited):
# Use Circle faucet for USDC
```

### Package ID Not Found

Redeploy contract:

```bash
cd ../move/payment
sui client publish --gas-budget 100000000
# Update PACKAGE_ID in .env
```

### Tests Failing

Ensure active address is funded:

```bash
sui client active-address  # Check current address
localnet start             # Ensure network running
```

## Production Build

```bash
npm run build
npm start
```

## Architecture

```
facilitator/
├── src/
│   ├── index.ts           # Express app + routes
│   ├── config.ts          # Environment config
│   ├── sui.ts             # SuiGrpcClient (gRPC, not JSON-RPC)
│   ├── controllers/
│   │   ├── health.ts      # GET /health
│   │   ├── balance.ts     # POST /check-balance (coin discovery)
│   │   └── payment.ts     # POST /settle-payment (PTB construction)
│   └── __tests__/         # Test suites (vitest)
├── package.json
└── .env                   # (create from .env.example)
```

**Key Details:**

- Uses gRPC client (@mysten/sui) for better performance
- Generic `Coin<T>` support (SUI, USDC, any token)
- Facilitator sponsors gas for all transactions
- Client-side PTB construction (not in Move contract)

## License

MIT
