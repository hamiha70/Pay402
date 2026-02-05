# Network Switching Quick Reference

This guide shows how to quickly switch between localnet and testnet configurations.

---

## Quick Switch Commands

### Switch to Testnet

```bash
cd facilitator
cp .env.testnet .env
npm run validate-network

cd ../widget
# Edit .env.local to set VITE_SUI_NETWORK=testnet
```

### Switch to Localnet

```bash
cd facilitator
cp .env.localnet .env
npm run validate-network

cd ../widget
# Edit .env.local to set VITE_SUI_NETWORK=localnet
```

---

## Configuration Files

### Facilitator

- `.env.localnet` - Localnet configuration (MockUSDC, local RPC)
- `.env.testnet` - Testnet configuration (Circle USDC, testnet RPC)
- `.env` - Currently active configuration (copy from above)

### Widget

- `.env.local` - Active configuration
- Change `VITE_SUI_NETWORK` between `localnet` and `testnet`

---

## Network Comparison

| Setting                      | Localnet                        | Testnet                                                                          |
| ---------------------------- | ------------------------------- | -------------------------------------------------------------------------------- |
| `SUI_NETWORK`                | `localnet`                      | `testnet`                                                                        |
| `PACKAGE_ID`                 | Your localnet package           | `0x29993321...`                                                                  |
| Payment Coin                 | MockUSDC                        | Circle USDC                                                                      |
| `USDC_TYPE`                  | N/A (auto-configured)           | `0xa1ec7fc00a6f40db9693ad1415d0c193ad3906494428cf252621037bd7117e29::usdc::USDC` |
| RPC URL                      | `http://127.0.0.1:9000`         | `https://fullnode.testnet.sui.io:443`                                            |
| CLI Tool                     | `lsui`                          | `tsui`                                                                           |
| Faucet                       | Embedded (automatic)            | Circle (manual, https://faucet.circle.com)                                       |
| Block SUI Payments           | ❌ No (allows SUI for testing)  | ✅ Yes (prevents gas drainage)                                                   |
| `TREASURY_OWNER_PRIVATE_KEY` | Required (for MockUSDC minting) | Not needed (Circle USDC pre-minted)                                              |

---

## Validation

After switching, always validate:

```bash
cd facilitator
npm run validate-network
```

**Expected output for Testnet:**

```
✅ Network: Testnet
   RPC URL: https://fullnode.testnet.sui.io:443
   Payment Coin: USDC (6 decimals)

🔐 Security Settings:
   Block SUI Payments: ✅ ENABLED
```

**Expected output for Localnet:**

```
✅ Network: Localnet
   RPC URL: http://127.0.0.1:9000
   Payment Coin: MockUSDC (6 decimals)

🔐 Security Settings:
   Block SUI Payments: ❌ DISABLED
```

---

## Troubleshooting

### Configuration not updating after switch

**Problem**: Validation still shows old network

**Solution**: Restart the facilitator service

```bash
# Kill the facilitator process
pkill -f "npm run dev"

# Start again
npm run dev
```

### Widget not connecting

**Problem**: Widget can't connect to facilitator

**Solution**: Check `VITE_SUI_NETWORK` in widget's `.env.local` matches facilitator's `SUI_NETWORK`

### Tests failing after switch

**Problem**: Tests fail with network mismatch errors

**Solution**: Ensure test environment uses correct network

```bash
# For localnet tests
SUI_NETWORK=localnet npm test

# For testnet tests (not recommended for CI)
SUI_NETWORK=testnet npm test
```

---

## Best Practices

1. **Always validate** after switching networks
2. **Keep `.env` in `.gitignore`** (never commit private keys!)
3. **Use `.env.localnet` and `.env.testnet`** as source of truth
4. **Document your package IDs** (localnet changes on restart, testnet persists)
5. **Test on localnet first** before deploying to testnet
6. **Monitor gas balance** on testnet (alert if < 10 SUI)

---

## Environment File Structure

```
facilitator/
├── .env                 # Active config (git-ignored)
├── .env.localnet        # Localnet config (git-ignored)
├── .env.testnet         # Testnet config (git-ignored)
└── .env.example         # Template with comments (committed to git)

widget/
├── .env.local           # Active config (git-ignored)
├── .env.testnet.example # Testnet template (committed to git)
└── .env.local.example   # Localnet template (committed to git)
```

---

## Related Documentation

- [Testnet Deployment Guide](TESTNET-DEPLOYMENT.md) - Full testnet setup
- [Network Configuration](README.md#network-configuration) - Overview
- [Development Guide](docs/development/DEVELOPMENT_GUIDE.md) - Local setup

---

**Quick Tip**: Bookmark this page for fast network switching! 🔖
