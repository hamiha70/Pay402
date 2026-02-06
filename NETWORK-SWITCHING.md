# Network Switching Guide

## 🚀 **Quick Commands**

### Start on Localnet (Development)

```bash
./scripts/pay402-tmux.sh --localnet
```

**What this does:**

1. ✅ Switches `sui client` to `localnet` environment
2. ✅ Copies `.env.localnet` → `.env` for facilitator, merchant, widget
3. ✅ Deploys Move contracts (if needed)
4. ✅ **Auto-funds facilitator** with SUI for gas (if balance < 1 SUI)
5. ✅ Starts all services (facilitator, merchant, widget)

**Result:** Everything running on localnet, fully funded, ready to test!

---

### Start on Testnet (Production-like)

```bash
./scripts/pay402-tmux.sh --testnet
```

**What this does:**

1. ✅ Switches `sui client` to `testnet` environment
2. ✅ Copies `.env.testnet` → `.env` for facilitator, merchant, widget
3. ✅ Uses pre-deployed contracts (from `.env.testnet`)
4. ⚠️ Skips auto-funding (manual funding required)
5. ✅ Starts all services (facilitator, merchant, widget)

**Important:** You must manually fund the facilitator on testnet first:

```bash
sui client faucet --address <FACILITATOR_ADDRESS>
```

---

### Start Without Switching (Use Current Environment)

```bash
./scripts/pay402-tmux.sh
```

**What this does:**

1. ✅ Uses whatever `sui client` environment is currently active
2. ✅ Reads `.env` files as-is (doesn't override)
3. ✅ Auto-funds facilitator ONLY if active env is `localnet`
4. ✅ Starts all services

**Use this when:** You've already manually configured everything.

---

## 🎯 **Common Workflows**

### Workflow 1: Fresh Localnet Testing

```bash
# Start from scratch
localnet start
./scripts/pay402-tmux.sh --localnet

# Everything is ready! Visit:
# http://localhost:3002  (merchant)
# http://localhost:5173  (payment widget)
```

---

### Workflow 2: Switch from Testnet to Localnet

```bash
# Kill current session
./scripts/pay402-tmux.sh --kill

# Start on localnet
./scripts/pay402-tmux.sh --localnet
```

---

### Workflow 3: Switch from Localnet to Testnet

```bash
# Kill current session
./scripts/pay402-tmux.sh --kill

# Fund facilitator first (one-time)
sui client switch --env testnet
sui client faucet  # Funds active address

# Start on testnet
./scripts/pay402-tmux.sh --testnet
```

---

### Workflow 4: Test on Both Networks

```bash
# Terminal 1: Localnet
./scripts/pay402-tmux.sh --localnet

# Test localnet...

# Switch to testnet
./scripts/pay402-tmux.sh --kill
./scripts/pay402-tmux.sh --testnet

# Test testnet...
```

---

## 📋 **What Gets Updated**

When you use `--localnet` or `--testnet`, the script automatically updates:

### 1. Sui Client Environment

```bash
sui client switch --env localnet   # or testnet
```

### 2. Facilitator `.env`

```bash
cp facilitator/.env.localnet → facilitator/.env
```

**Updated fields:**

- `SUI_NETWORK=localnet`
- `PACKAGE_ID=<localnet_package>`
- `FACILITATOR_PRIVATE_KEY=<localnet_key>`
- `MOCK_USDC_PACKAGE=<localnet_mock_usdc>`
- `MOCK_USDC_TREASURY_CAP=<localnet_treasury>`

### 3. Merchant `.env`

```bash
cp merchant/.env.localnet → merchant/.env
```

**Updated fields:**

- `FACILITATOR_URL=http://localhost:3001`
- `CORS_ORIGIN=http://localhost:5173`

### 4. Widget `.env.local`

```bash
cp widget/.env.localnet → widget/.env.local
```

**Updated fields:**

- `VITE_SUI_NETWORK=localnet`
- `VITE_PACKAGE_ID=<localnet_package>`
- `VITE_FACILITATOR_URL=http://localhost:3001`
- `VITE_ENOKI_API_KEY=<your_enoki_key>`
- `VITE_GOOGLE_CLIENT_ID=<your_google_client_id>`

---

## 🔍 **How Auto-Funding Works**

### On Localnet

```bash
# Script checks:
ACTIVE_ENV=$(sui client active-env)  # Returns "localnet"

# If localnet AND balance < 1 SUI:
lsui client faucet --address <FACILITATOR_ADDRESS>

# Result: Facilitator gets ~10 SUI for gas sponsorship
```

### On Testnet

```bash
# Script checks:
ACTIVE_ENV=$(sui client active-env)  # Returns "testnet"

# Skips auto-funding (testnet faucet requires manual intervention)
echo "⚠️  Network: testnet - skipping auto-fund (manual funding required)"
```

**Why different?**

- **Localnet:** Embedded faucet is automatic and unlimited
- **Testnet:** Faucet has rate limits and requires user interaction

---

## 🛠️ **Troubleshooting**

### Problem: "Failed to switch to localnet"

```
⚠️  Failed to switch to localnet (environment may not exist)
```

**Solution:**

```bash
# Check available environments
sui client envs

# If localnet missing, add it
sui client new-env --alias localnet --rpc http://127.0.0.1:9000

# Try again
./scripts/pay402-tmux.sh --localnet
```

---

### Problem: ".env.localnet not found"

```
⚠️  Facilitator: .env.localnet not found (skipping)
```

**Solution:**

```bash
# Create .env.localnet files from templates
cd facilitator
cp .env .env.localnet  # Save current localnet config

cd ../merchant
cp .env .env.localnet

cd ../widget
cp .env.local .env.localnet
```

---

### Problem: "Faucet request failed" on localnet

```
⚠️  Faucet request failed (may need manual funding)
```

**Solution:**

```bash
# Check if localnet is running
localnet status

# If not running, start it
localnet start

# Verify faucet is accessible
curl http://127.0.0.1:9123/gas

# Try manual funding
lsui client faucet
```

---

### Problem: Tests fail after switching networks

```
Error: Package ID not found
```

**Solution:**

```bash
# On localnet: Re-deploy contracts
cd move/payment
./deploy-local.sh --force

# On testnet: Verify package ID in .env.testnet
grep PACKAGE_ID facilitator/.env.testnet
```

---

## 📊 **Network Comparison**

| Feature              | Localnet               | Testnet               |
| -------------------- | ---------------------- | --------------------- |
| **Setup**            | Automatic              | Manual funding        |
| **Funding**          | Auto (embedded faucet) | Manual (rate limited) |
| **Contract Deploy**  | Auto                   | One-time              |
| **Speed**            | Fast (~1s finality)    | Slower (~3s finality) |
| **Data Persistence** | Lost on reboot         | Persistent            |
| **Best For**         | Development & Testing  | Integration & Demo    |

---

## 🎓 **Best Practices**

### 1. **Always use flags for switching**

```bash
# ✅ Good (explicit)
./scripts/pay402-tmux.sh --localnet

# ❌ Risky (relies on current state)
./scripts/pay402-tmux.sh
```

### 2. **Keep .env.localnet and .env.testnet in sync**

```bash
# After updating config:
cp facilitator/.env facilitator/.env.localnet   # If on localnet
cp facilitator/.env facilitator/.env.testnet    # If on testnet
```

### 3. **Test on localnet first, then testnet**

```bash
# 1. Develop on localnet (fast iteration)
./scripts/pay402-tmux.sh --localnet
# ... test ...

# 2. Validate on testnet (production-like)
./scripts/pay402-tmux.sh --kill
./scripts/pay402-tmux.sh --testnet
# ... final checks ...
```

### 4. **Commit .env.\* template files (not .env)**

```bash
# ✅ Commit
git add .env.localnet .env.testnet

# ❌ Never commit (has secrets)
git add .env
```

---

## 🚀 **Pro Tips**

### Create aliases for faster switching

```bash
# Add to ~/.bashrc or ~/.zshrc
alias pay402-local='cd ~/Projects/ETHGlobal/HackMoney_Jan26/Pay402 && ./scripts/pay402-tmux.sh --localnet'
alias pay402-test='cd ~/Projects/ETHGlobal/HackMoney_Jan26/Pay402 && ./scripts/pay402-tmux.sh --testnet'
alias pay402-kill='cd ~/Projects/ETHGlobal/HackMoney_Jan26/Pay402 && ./scripts/pay402-tmux.sh --kill'

# Usage:
pay402-local   # Start on localnet
pay402-test    # Start on testnet
pay402-kill    # Stop everything
```

---

## 📖 **Related Documentation**

- [README.md](README.md) - Project overview and quick start
- [NETWORK-CONFIG-GUIDE.md](NETWORK-CONFIG-GUIDE.md) - Network configuration details
- [ZKLOGIN-BREAKTHROUGH.md](ZKLOGIN-BREAKTHROUGH.md) - zkLogin debugging guide
- [facilitator/README.md](facilitator/README.md) - Facilitator setup
- [widget/README.md](widget/README.md) - Widget integration guide
