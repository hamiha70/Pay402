# Network Switching Implementation Summary

## ✅ **What Was Fixed**

### **Problem:**

When running `./pay402-tmux.sh` on testnet, the script used the localnet `PACKAGE_ID` from `.env`, causing contract verification failures.

### **Root Cause:**

1. `deploy-local.sh` read from `.env` without checking which network was active
2. No network switching flags existed in `pay402-tmux.sh`
3. `.env` files weren't updated when switching networks

---

## 🔧 **Implemented Fixes**

### **Fix 1: Network-Aware Contract Deployment**

**File:** `move/payment/deploy-local.sh`

**Changes:**

```bash
# OLD (WRONG):
EXISTING_PACKAGE_ID=$(grep "^PACKAGE_ID=" ../../facilitator/.env | ...)
if [ -n "$EXISTING_PACKAGE_ID" ]; then
  echo "✅ Contract already deployed!"
  exit 0
fi

# NEW (CORRECT):
# 1. Detect active network (localnet/testnet)
# 2. Try to read from .env.<network> first
ENV_FILE="../../facilitator/.env"
if [ -f "../../facilitator/.env.$CHAIN_NAME" ]; then
  ENV_FILE="../../facilitator/.env.$CHAIN_NAME"
  echo "📋 Using network-specific config: .env.$CHAIN_NAME"
fi

# 3. Get package ID from network-specific config
EXISTING_PACKAGE_ID=$(grep "^PACKAGE_ID=" "$ENV_FILE" | cut -d= -f2)

# 4. Verify package exists on current network
if [ -n "$EXISTING_PACKAGE_ID" ]; then
  echo "🔍 Verifying package exists on $CHAIN_NAME..."
  if sui client object "$EXISTING_PACKAGE_ID" --json >/dev/null 2>&1; then
    echo "✅ Contract already deployed!"
    exit 0
  else
    echo "⚠️  Package ID not found on $CHAIN_NAME"
    echo "    Proceeding with fresh deployment..."
  fi
fi
```

**Benefits:**

- ✅ Reads from `.env.testnet` when on testnet
- ✅ Reads from `.env.localnet` when on localnet
- ✅ Fallback to `.env` if network-specific file doesn't exist
- ✅ **Verifies package exists on network** before skipping deployment
- ✅ Won't try to use localnet package on testnet (and vice versa)

---

### **Fix 2: Network Switching Flags**

**File:** `scripts/pay402-tmux.sh`

**New Flags:**

```bash
./pay402-tmux.sh --localnet   # Switch to localnet and start
./pay402-tmux.sh --testnet    # Switch to testnet and start
./pay402-tmux.sh              # Use current sui environment (backward compatible)
```

**Implementation Order:**

```bash
1. Parse --localnet or --testnet flag
2. Check if tmux session exists
3. If creating NEW session:
   a. Switch sui client: sui client switch --env <network>
   b. Copy .env.<network> → .env for:
      - facilitator/.env
      - merchant/.env
      - widget/.env.local
   c. Only start localnet if on localnet (skip for testnet)
   d. Deploy contracts (now uses correct .env)
   e. Auto-fund facilitator (only on localnet)
   f. Start all services
```

**Code Location:**

```bash
# After session check, BEFORE deployment:
if [ -n "$SWITCH_NETWORK" ]; then
  # 1. Switch sui client
  sui client switch --env "$SWITCH_NETWORK"

  # 2. Update .env files
  cp facilitator/.env.$SWITCH_NETWORK → facilitator/.env
  cp merchant/.env.$SWITCH_NETWORK → merchant/.env
  cp widget/.env.$SWITCH_NETWORK → widget/.env.local
fi

# 3. Only check localnet status if on localnet
CURRENT_ENV=$(sui client active-env)
if [ "$CURRENT_ENV" = "localnet" ]; then
  # Check/start localnet
fi

# 4. Deploy (now reads correct .env)
cd move/payment
./deploy-local.sh
```

---

### **Fix 3: Smart Localnet Checking**

**Old Behavior (WRONG):**

```bash
# Always tried to start localnet, even on testnet
echo "🔍 Checking Suibase localnet..."
localnet start
```

**New Behavior (CORRECT):**

```bash
# Only check/start localnet if we're actually using localnet
CURRENT_ENV=$(sui client active-env)
if [ "$CURRENT_ENV" = "localnet" ]; then
  echo "🔍 Checking Suibase localnet..."
  localnet start
fi
```

---

## 📊 **How It Works Now**

### **Scenario 1: Start on Localnet**

```bash
./pay402-tmux.sh --localnet
```

**What happens:**

1. ✅ Switches sui client: `sui client switch --env localnet`
2. ✅ Copies `facilitator/.env.localnet` → `facilitator/.env`
3. ✅ Copies `merchant/.env.localnet` → `merchant/.env`
4. ✅ Copies `widget/.env.localnet` → `widget/.env.local`
5. ✅ Checks if localnet is running, starts it if needed
6. ✅ Deploys contracts:
   - Reads from `.env.localnet` (if exists) or `.env`
   - Verifies package exists on localnet
   - Deploys if not found
7. ✅ Auto-funds facilitator (10 SUI for gas)
8. ✅ Starts all services

**Result:** Everything running on localnet with correct config!

---

### **Scenario 2: Start on Testnet**

```bash
./pay402-tmux.sh --testnet
```

**What happens:**

1. ✅ Switches sui client: `sui client switch --env testnet`
2. ✅ Copies `facilitator/.env.testnet` → `facilitator/.env`
3. ✅ Copies `merchant/.env.testnet` → `merchant/.env`
4. ✅ Copies `widget/.env.testnet` → `widget/.env.local`
5. ✅ Skips localnet check (not needed)
6. ✅ Checks for deployed contracts:
   - Reads from `.env.testnet`
   - **Verifies package `0x29993321...` exists on testnet**
   - Uses existing deployment (no redeployment!)
7. ✅ Skips auto-funding (testnet requires manual funding)
8. ✅ Starts all services

**Result:** Everything running on testnet with existing contracts!

---

### **Scenario 3: Start Without Flags (Backward Compatible)**

```bash
./pay402-tmux.sh
```

**What happens:**

1. ✅ Uses whatever sui environment is currently active
2. ✅ Reads current `.env` files (no overwriting)
3. ✅ Checks localnet only if `sui client active-env` = localnet
4. ✅ Deploys contracts:
   - Tries `.env.<current_network>` first
   - Fallback to `.env`
   - Verifies package exists on current network
5. ✅ Auto-funds only if on localnet
6. ✅ Starts all services

**Result:** Respects current setup, doesn't change anything!

---

## 🎯 **Key Improvements**

### **1. No More Wrong Network Errors**

❌ **Before:** Testnet used localnet package ID → "Package not found" errors
✅ **After:** Testnet reads `.env.testnet` → Uses correct package ID

### **2. Smart Package Verification**

❌ **Before:** Blindly trusted `.env` package ID
✅ **After:** Verifies package exists on network with `sui client object`

### **3. Network-Specific Config Priority**

```bash
# Priority order:
1. .env.testnet (if on testnet)
2. .env.localnet (if on localnet)
3. .env (fallback)
```

### **4. Idempotent Deployment**

- ✅ Won't redeploy if package already exists on network
- ✅ Will deploy if package ID is from wrong network
- ✅ Explicit `--force` flag to force redeployment

### **5. One-Command Network Switching**

```bash
# Switch from localnet to testnet:
./pay402-tmux.sh --kill
./pay402-tmux.sh --testnet

# Switch back to localnet:
./pay402-tmux.sh --kill
./pay402-tmux.sh --localnet
```

---

## 🧪 **Testing the Fixes**

### **Test 1: Localnet from Scratch**

```bash
./pay402-tmux.sh --localnet

# Expected output:
🔄 Will switch to localnet...
✅ Switched to: localnet
📝 Updating .env files to match localnet...
  ✅ Facilitator: .env.localnet → .env
  ✅ Merchant: .env.localnet → .env
  ✅ Widget: .env.localnet → .env.local
🔍 Checking Suibase localnet...
📦 Deploying Move contract...
📋 Using network-specific config: .env.localnet
🔍 Verifying package exists on localnet...
✅ Contract already deployed!
💰 Checking facilitator balance on localnet...
  ✅ Updated balance: 10 SUI
```

---

### **Test 2: Testnet with Existing Deployment**

```bash
./pay402-tmux.sh --testnet

# Expected output:
🔄 Will switch to testnet...
✅ Switched to: testnet
📝 Updating .env files to match testnet...
  ✅ Facilitator: .env.testnet → .env
  ✅ Merchant: .env.testnet → .env
  ✅ Widget: .env.testnet → .env.local
📦 Deploying Move contract...
📋 Using network-specific config: .env.testnet
🔍 Verifying package exists on testnet...
✅ Contract already deployed!
📦 Package ID: 0x29993321fbc54723dfca3ed38d7ce3b18ec2df97a7e1048c2932b022e47193eb
⚠️  Network: testnet - skipping auto-fund (manual funding required)
```

---

### **Test 3: Wrong Network Package ID**

```bash
# Scenario: .env has localnet package, but we're on testnet
./pay402-tmux.sh

# Expected output:
📦 Deploying Move contract...
📋 Using network-specific config: .env.testnet
🔍 Verifying package exists on testnet...
⚠️  Package ID 0x1d1d... not found on testnet
    Proceeding with fresh deployment...
📦 Publishing contract...
✅ Contract deployed!
📦 Package ID: 0x<new_testnet_package>
```

---

## 📁 **Files Modified**

1. **`move/payment/deploy-local.sh`**

   - Added network-specific `.env` reading
   - Added package verification with `sui client object`
   - Smarter deployment logic

2. **`scripts/pay402-tmux.sh`**

   - Added `--localnet` and `--testnet` flags
   - Added network switching before deployment
   - Conditional localnet checking
   - Updated help text

3. **`README.md`**

   - Updated Quick Setup with network flags
   - Added one-command setup examples

4. **`NETWORK-SWITCHING.md`** (NEW)
   - Comprehensive network switching guide
   - Common workflows
   - Troubleshooting

---

## 🎓 **Best Practices**

### **Always Use Flags When Switching Networks**

```bash
# ✅ Good (explicit)
./pay402-tmux.sh --localnet
./pay402-tmux.sh --testnet

# ⚠️  Risky (relies on current state)
sui client switch --env testnet
./pay402-tmux.sh  # Might use wrong .env!
```

### **Keep Network-Specific .env Files**

```bash
# Maintain these files:
facilitator/.env.localnet   # Localnet config
facilitator/.env.testnet    # Testnet config
facilitator/.env            # Active config (updated by script)
```

### **Verify After Switching**

```bash
./pay402-tmux.sh --testnet

# In tmux Testing pane:
cd facilitator
npm run validate-network  # Should show "testnet"
```

---

## 🔒 **Backward Compatibility**

✅ **Old behavior still works:**

```bash
# Without flags: uses current sui env + current .env files
./pay402-tmux.sh
```

✅ **Manual switching still works:**

```bash
sui client switch --env testnet
cp facilitator/.env.testnet facilitator/.env
./pay402-tmux.sh
```

✅ **Existing .env files are respected:**

- If `.env.localnet` doesn't exist, uses `.env`
- Won't overwrite files without flag

---

## 🚀 **Ready to Use!**

```bash
# Quick test on localnet:
./pay402-tmux.sh --localnet

# Quick test on testnet:
./pay402-tmux.sh --testnet

# Switch networks:
./pay402-tmux.sh --kill
./pay402-tmux.sh --<other_network>
```

**All fixes committed and ready!** 🎉
