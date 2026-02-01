# Pay402 Demo Merchant

Demo merchant backend demonstrating HTTP 402 Payment Required pattern with Pay402.

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Generate keys (or use existing .env)
node setup-keys.js

# 3. Configure .env
cp .env.example .env
# Edit .env with your keys

# 4. Start merchant
npm run dev
```

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/` | Demo page with "Get Data" button |
| GET | `/health` | Health check |
| GET | `/api/premium-data` | Protected resource (returns 402 + invoice) |
| GET | `/api/verify-payment?paymentId=...` | Verify payment and return content |

## Configuration

### Required Environment Variables

```env
# Merchant identity
MERCHANT_ADDRESS=0x...          # Your SUI address for receiving payments
MERCHANT_PRIVATE_KEY=base64...  # Ed25519 private key for JWT signing

# Facilitator
FACILITATOR_ADDRESS=0x...       # Facilitator's SUI address
FACILITATOR_FEE=10000          # Fee in smallest unit (10000 = 0.01 USDC)

# Pricing
RESOURCE_PRICE=100000          # Price in smallest unit (100000 = 0.1 USDC)
```

### Optional Environment Variables

```env
PORT=3002                       # Server port (default: 3002)
MERCHANT_NAME=Premium Data Corp # Display name
SUI_NETWORK=localnet           # localnet, testnet, or mainnet
COIN_TYPE=0x2::sui::SUI        # Payment token type
INVOICE_EXPIRY_SECONDS=3600    # Invoice validity (default: 1 hour)
```

## Generate Keys

Run the key generation script:

```bash
node setup-keys.js
```

This will:
1. Generate an Ed25519 keypair
2. Display the SUI address (for receiving payments)
3. Display the private key (base64 encoded)
4. Show .env format

⚠️ **Keep the private key secure!** Never commit it to version control.

## HTTP 402 Payment Flow

### 1. Request Protected Resource

```bash
curl http://localhost:3002/api/premium-data
```

**Response: HTTP 402**
```json
{
  "error": "Payment Required",
  "message": "This resource requires payment",
  "invoice": "eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9...",
  "invoiceData": {
    "resource": "/api/premium-data",
    "amount": "100000",
    "merchantRecipient": "0x...",
    "facilitatorFee": "10000",
    "facilitatorRecipient": "0x...",
    "coinType": "0x2::sui::SUI",
    "expiry": 1738368000,
    "nonce": "1738364400-abc123"
  }
}
```

### 2. Complete Payment

Take the `invoice` JWT and:
1. Open Pay402 payment page
2. Sign in with zkLogin
3. Verify PTB
4. Sign and submit transaction
5. Receive transaction digest (payment ID)

### 3. Verify & Access Content

```bash
curl "http://localhost:3002/api/verify-payment?paymentId=<tx_digest>"
```

**Response: HTTP 200**
```json
{
  "success": true,
  "paymentVerified": true,
  "paymentId": "ABC123...",
  "content": {
    "title": "🎉 Premium Market Insights",
    "data": [...]
  }
}
```

## Invoice JWT Structure

The invoice is a signed JWT (EdDSA with Ed25519) containing:

```json
{
  "iss": "0x...",              // Issuer (merchant address)
  "sub": "/api/premium-data",   // Subject (resource path)
  "aud": "pay402",              // Audience
  "iat": 1738364400,            // Issued at (unix timestamp)
  "exp": 1738368000,            // Expiry (unix timestamp)
  "resource": "/api/premium-data",
  "amount": "100000",
  "merchantRecipient": "0x...",
  "facilitatorFee": "10000",
  "facilitatorRecipient": "0x...",
  "coinType": "0x2::sui::SUI",
  "nonce": "unique-id"
}
```

**Signature:** EdDSA (Ed25519) - same algorithm SUI uses

## Security

### JWT Signing

- **Algorithm:** EdDSA (Ed25519)
- **Key Format:** PKCS#8 PEM (generated from SUI keypair)
- **Signature:** Prevents invoice tampering

### Payment Verification

For hackathon demo: Simplified (accepts any payment ID)

For production:
1. Query SUI blockchain for transaction
2. Find `PaymentSettled` event
3. Verify `invoice_hash` matches our record
4. Verify amounts are correct
5. Check not already used (prevent replay)
6. Mark as paid in database

## Demo Page

Visit http://localhost:3002 for interactive demo:

- Click "Get Premium Data"
- See HTTP 402 response with invoice
- Instructions for completing payment

## Development

```bash
# Start with auto-reload
npm run dev

# Test health endpoint
curl http://localhost:3002/health

# Test 402 response
curl http://localhost:3002/api/premium-data

# Test verification
curl "http://localhost:3002/api/verify-payment?paymentId=test123"
```

## Architecture

```
Browser
  ↓
  GET /api/premium-data
  ↓
Merchant
  ├─ Generate invoice
  ├─ Sign JWT (EdDSA)
  └─ Return HTTP 402
  ↓
Browser → Pay402 Payment Page
  ├─ Verify invoice JWT
  ├─ Build PTB
  ├─ Verify PTB (amounts, recipients)
  ├─ Sign with zkLogin
  └─ Submit to facilitator
  ↓
Facilitator → SUI Blockchain
  ├─ Sponsor gas
  ├─ Call settle_payment()
  └─ Emit receipt event
  ↓
Browser → Merchant
  GET /api/verify-payment?paymentId=tx_digest
  ↓
Merchant
  ├─ Query blockchain
  ├─ Verify receipt
  └─ Return content (HTTP 200)
```

## Files

```
merchant/
├── src/
│   ├── index.js                 # Express server
│   ├── config.js                # Configuration
│   ├── controllers/
│   │   ├── health.js            # Health check
│   │   ├── premium-data.js      # HTTP 402 endpoint
│   │   └── verify-payment.js    # Payment verification
│   └── utils/
│       └── jwt.js               # JWT signing/verification
├── setup-keys.js                # Key generation script
├── .env                         # Configuration (DO NOT COMMIT)
├── .env.example                 # Configuration template
├── package.json
└── README.md
```

## Troubleshooting

### "MERCHANT_PRIVATE_KEY not configured"

Run `node setup-keys.js` and add the keys to `.env`

### "JWT signing failed"

Check that `MERCHANT_PRIVATE_KEY` is valid base64

### "Invoice expired"

Increase `INVOICE_EXPIRY_SECONDS` in `.env`

### Port already in use

Change `PORT` in `.env` to a different port

## Next Steps

1. ✅ Generate keys with `setup-keys.js`
2. ✅ Configure `.env`
3. ✅ Start merchant with `npm run dev`
4. 🔄 Start facilitator (port 3001)
5. 🔄 Start payment page (port 5173)
6. 🎉 Test full payment flow!
