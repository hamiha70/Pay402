# Testnet Deployment Guide

## Overview

This guide covers deploying the Pay402 payment system to Sui Testnet. The deployment consists of:

1. Move smart contract deployment
2. Facilitator backend configuration
3. Widget frontend configuration

## Prerequisites

- Sui CLI installed (`sui` and `tsui` commands available)
- Node.js and npm installed
- Access to Sui Testnet faucet
- Enoki API key (for zkLogin support)

## Deployed Contracts (Testnet)

### Pay402 Payment Contract

- **Package ID**: `0x29993321fbc54723dfca3ed38d7ce3b18ec2df97a7e1048c2932b022e47193eb`
- **Network**: Sui Testnet
- **Explorer**: https://suiscan.xyz/testnet/object/0x29993321fbc54723dfca3ed38d7ce3b18ec2df97a7e1048c2932b022e47193eb

### Circle USDC (Official Testnet)

- **Type**: `0xa1ec7fc00a6f40db9693ad1415d0c193ad3906494428cf252621037bd7117e29::usdc::USDC`
- **Decimals**: 6
- **Faucet**: https://faucet.circle.com/ (requires Google Sign-In)

## Step 1: Create and Fund Testnet Wallet

```bash
# Create new testnet wallet
sui client new-address ed25519

# Switch to testnet
sui client switch --env testnet

# Set active address (replace with your wallet alias)
sui client switch --address <your-wallet-alias>

# Get SUI from testnet faucet
sui client faucet

# Verify balance
sui client balance

# Export private key for facilitator (KEEP SECURE!)
sui keytool export --key-identity <your-wallet-alias>
```

**Important**: Store the exported private key securely. You'll need it for the facilitator configuration.

## Step 2: Get USDC from Circle Faucet

1. Visit https://faucet.circle.com/
2. Sign in with Google
3. Select "Sui Testnet" network
4. Enter your wallet address
5. Request USDC (you'll receive 10 USDC)

Verify USDC balance:

```bash
sui client balance
```

## Step 3: Deploy Move Contract (Already Done)

The contract is already deployed. If you need to redeploy:

```bash
cd move/payment
sui move build
sui client publish --gas-budget 100000000
```

Save the `PackageID` from the deployment output.

## Step 4: Configure Facilitator Backend

Create `.env.testnet` in the `facilitator/` directory:

```bash
cd facilitator
cp .env.testnet.example .env.testnet
```

Edit `.env.testnet` with your values:

```env
PORT=3001
SUI_NETWORK=testnet

# Deployed Contract
PACKAGE_ID=0x29993321fbc54723dfca3ed38d7ce3b18ec2df97a7e1048c2932b022e47193eb

# Circle USDC on Sui Testnet (official)
USDC_TYPE=0xa1ec7fc00a6f40db9693ad1415d0c193ad3906494428cf252621037bd7117e29::usdc::USDC

# Your Testnet Wallet
FACILITATOR_PRIVATE_KEY=<your-private-key-from-step-1>
FACILITATOR_ADDRESS=<your-wallet-address>

# Fee (0.01 USDC = 10000 with 6 decimals)
FACILITATOR_FEE=10000

# Note: No treasury owner on testnet (using real Circle USDC, not MockUSDC)
```

**Copy to active .env**:

```bash
cp .env.testnet .env
```

**Validate configuration**:

```bash
npm run validate-network
```

You should see:

```
✓ Network: Testnet
✓ Package ID configured
✓ USDC Type configured
✓ Facilitator keypair valid
✓ Security: blockSuiPayments ENABLED (SUI payments blocked)
```

## Step 5: Configure Widget Frontend

Create `.env.testnet` in the `widget/` directory:

```bash
cd ../widget
cp .env.testnet.example .env.local
```

Edit `.env.local`:

```env
# Enoki Configuration (REQUIRED for zkLogin)
# Get from https://portal.enoki.mystenlabs.com
VITE_ENOKI_API_KEY=<your-enoki-api-key>

# Facilitator Backend (Testnet)
VITE_FACILITATOR_URL=http://localhost:3001

# SUI Network (testnet required for zkLogin)
VITE_SUI_NETWORK=testnet
```

**Get Enoki API Key**:

1. Visit https://portal.enoki.mystenlabs.com
2. Create or select your app
3. Copy the public API key
4. Paste into `VITE_ENOKI_API_KEY`

## Step 6: Start Services

### Terminal 1 - Facilitator Backend

```bash
cd facilitator
npm run dev
```

### Terminal 2 - Widget Frontend

```bash
cd widget
npm run dev
```

The widget will be available at `http://localhost:5173` (or another port if 5173 is busy).

## Step 7: Test Payment Flow

1. Open widget in browser: `http://localhost:5173`
2. Click "Sign in with Google" (zkLogin via Enoki)
3. Complete Google authentication
4. Create a test invoice using the facilitator API or load one via URL parameter
5. Complete payment using USDC from Circle faucet

## Security Considerations

### SUI Payments Blocked on Testnet/Mainnet

The facilitator has `blockSuiPayments` enabled by default for testnet and mainnet. This prevents:

- Merchants requesting SUI as payment
- Facilitator gas drainage attacks
- Users accidentally paying in SUI

Only stablecoin payments (USDC) are allowed.

### Private Key Security

- **Never commit** `.env` or `.env.testnet` files to git
- Store private keys securely (e.g., password manager, secrets vault)
- Use separate wallets for testnet and mainnet
- Rotate keys if compromised

## Network Switching

### Dynamic CLI Commands

The facilitator automatically adjusts CLI commands based on `SUI_NETWORK`:

- **localnet**: Uses `lsui client tx-block <digest>`
- **testnet**: Uses `tsui client tx-block <digest>`
- **mainnet**: Uses `sui client tx-block <digest>`

### Switching Between Networks

**To switch back to localnet**:

```bash
cd facilitator
cp .env.localnet .env  # or manually edit .env
npm run validate-network
```

**To switch to testnet**:

```bash
cd facilitator
cp .env.testnet .env
npm run validate-network
```

## Troubleshooting

### Validation Fails

```bash
# Force validation with explicit environment
SUI_NETWORK=testnet \
PACKAGE_ID=0x29993321fbc54723dfca3ed38d7ce3b18ec2df97a7e1048c2932b022e47193eb \
USDC_TYPE=0xa1ec7fc00a6f40db9693ad1415d0c193ad3906494428cf252621037bd7117e29::usdc::USDC \
npm run validate-network
```

### Transaction Fails

1. Check gas balance: `sui client balance`
2. Check USDC balance: `sui client balance`
3. Verify network in `.env`: `SUI_NETWORK=testnet`
4. Check facilitator logs for detailed error messages

### Widget Can't Connect

1. Verify facilitator is running: `curl http://localhost:3001/health`
2. Check `VITE_FACILITATOR_URL` in widget's `.env.local`
3. Check browser console for CORS or network errors

### USDC Not Showing in Wallet

1. Verify you requested from Circle faucet (not Sui faucet)
2. Check transaction on explorer: https://suiscan.xyz/testnet
3. Try `sui client balance` to see all coins

## Monitoring and Debugging

### Check Facilitator Health

```bash
curl http://localhost:3001/health
```

### View Transaction on Explorer

```bash
# Get digest from facilitator logs, then:
tsui client tx-block <digest>
# Or visit: https://suiscan.xyz/testnet/tx/<digest>
```

### Test CLI Helpers

```bash
cd facilitator
npm run validate-network
```

## Next Steps

1. **Mainnet Deployment**: Similar process, but use mainnet USDC and real funds
2. **Production Hosting**: Deploy facilitator to cloud service, update `VITE_FACILITATOR_URL`
3. **Custom Domain**: Configure DNS and HTTPS for widget
4. **Monitoring**: Add application monitoring (e.g., Sentry, DataDog)
5. **Rate Limiting**: Add API rate limiting to facilitator

## Resources

- [Sui Testnet Explorer](https://suiscan.xyz/testnet)
- [Circle USDC Faucet](https://faucet.circle.com/)
- [Enoki Portal](https://portal.enoki.mystenlabs.com)
- [Sui CLI Docs](https://docs.sui.io/references/cli)
- [Pay402 Documentation](./README.md)
