# pay402-tmux.sh: Complete Behavior Guide

## Overview

The `pay402-tmux.sh` script now has **intelligent configuration management** that prevents mismatches between your `sui client` environment and your service `.env` files.

---

## 🎯 Key Features

### 1. **Network Switching with Flags** (`--testnet` / `--localnet`)
When you explicitly switch networks using flags, the script ensures **complete consistency**:

```bash
./scripts/pay402-tmux.sh --testnet
```

**What happens:**
1. ✅ Switches `sui client` to testnet
2. ✅ Copies `.env.testnet.example` → `.env` for all services
3. ✅ Kills existing tmux session (if present)
4. ✅ Creates fresh session with correct config

**Output:**
```
🔄 Switching network to: testnet
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1️⃣  Switching sui client...
   ✅ sui client now on: testnet

2️⃣  Updating .env files...
   ✅ Facilitator: .env.testnet.example → .env
   ✅ Merchant: .env.testnet.example → .env
   ✅ Widget: .env.testnet.example → .env.local

✅ Network configuration updated to: testnet
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

⚠️  Existing session found - killing to apply new network config...
   ✅ Old session killed

🚀 Creating new tmux session: pay402
```

---

### 2. **Safety Check (No Flags)** 
When you run the script **without flags**, it checks if `.env` files exist:

```bash
./scripts/pay402-tmux.sh
```

**What happens:**
- If `.env` files are **missing** → copies from `.env.<active-network>.example`
- If `.env` files **exist** → uses them as-is (no overwrite)
- Uses your current `sui client` environment to determine which templates to use

**Example (first run on testnet):**
```
⚠️  facilitator/.env missing
⚠️  merchant/.env missing
⚠️  widget/.env.local missing

🔧 First-time setup detected - copying .env templates for: testnet
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   ✅ Facilitator: .env.testnet.example → .env
   ✅ Merchant: .env.testnet.example → .env
   ✅ Widget: .env.testnet.example → .env.local
✅ Configuration files created for: testnet
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

**Example (subsequent runs):**
```
🚀 Creating new tmux session: pay402
📦 Starting all services...
```
(No warnings - files already exist)

---

## 📋 Decision Tree

```
┌─────────────────────────────────────┐
│ ./scripts/pay402-tmux.sh [FLAGS]   │
└─────────────────────────────────────┘
                 │
                 ├─── --testnet or --localnet used?
                 │
       ┌─────────┴────────────┐
       │ YES                  │ NO
       │                      │
       ▼                      ▼
┌──────────────┐      ┌────────────────────┐
│ FORCE SWITCH │      │ SAFETY CHECK       │
│              │      │                    │
│ 1. sui client│      │ 1. Check current   │
│    switch    │      │    sui env         │
│              │      │                    │
│ 2. Copy .env │      │ 2. If .env missing │
│    templates │      │    → copy template │
│              │      │                    │
│ 3. Kill      │      │ 3. If .env exists  │
│    session   │      │    → use as-is     │
│              │      │                    │
│ 4. Create    │      │ 4. Attach/Create   │
│    session   │      │    session         │
└──────────────┘      └────────────────────┘
```

---

## 🔒 Safety Mechanisms

### Automatic Backups
When the script copies `.env` files, it uses **complete templates** (`.env.<network>.example`) that contain all fields. This prevents data loss.

**Example structure:**
```
facilitator/
├── .env                    # Active config (testnet or localnet)
├── .env.localnet.example   # Complete localnet template
├── .env.testnet.example    # Complete testnet template
└── .env.backup_20260206_135137  # Timestamped safety backup
```

### Environment Name Mapping
The script handles `sui client` environment name variations:
- `local` (sui environment) → `localnet` (our .env naming)
- `testnet` → `testnet`
- `devnet` → `devnet`
- `mainnet` → `mainnet`

---

## 🎬 Usage Examples

### Example 1: First-Time Setup (No .env files)
```bash
# Ensure sui client is on testnet
sui client switch --env testnet

# Run script (will auto-create .env files)
./scripts/pay402-tmux.sh
```
**Result:** Creates `.env` files from `.env.testnet.example`

---

### Example 2: Switch to Testnet (Existing Session)
```bash
# You were on localnet, now want testnet
./scripts/pay402-tmux.sh --testnet
```
**Result:** 
- Switches sui client
- Overwrites all `.env` files with testnet configs
- Kills old session
- Creates fresh testnet session

---

### Example 3: Switch to Localnet
```bash
./scripts/pay402-tmux.sh --localnet
```
**Result:**
- Switches sui client to `local` (maps to localnet)
- Overwrites all `.env` files with localnet configs
- Kills old session
- Creates fresh localnet session

---

### Example 4: Just Attach (No Changes)
```bash
# Already on testnet, .env files exist
./scripts/pay402-tmux.sh
```
**Result:**
- Attaches to existing session (if running)
- OR creates new session with current configs
- No overwriting of .env files

---

## ⚠️ Important Notes

### When .env Files Are Overwritten
**.env files are ONLY overwritten when:**
1. You use `--testnet` or `--localnet` flags
2. Files are missing (safety check)

**.env files are NEVER overwritten when:**
- You run script without flags AND files already exist

### Session Management
**Session is killed when:**
- You use `--testnet` or `--localnet` flag AND session exists
  (Necessary to apply new network config)

**Session is preserved when:**
- You run without flags
- No existing session (creates new one)

---

## 🐛 Troubleshooting

### Issue: "Config mismatch between sui client and .env"
**Solution:** Use explicit flag to force sync:
```bash
# Force everything to testnet
./scripts/pay402-tmux.sh --testnet

# OR force to localnet
./scripts/pay402-tmux.sh --localnet
```

### Issue: "Tests running on wrong network"
**Diagnosis:**
```bash
# Check sui client
sui client active-env
sui client chain-identifier

# Check .env files
grep "^SUI_NETWORK=" facilitator/.env
grep "^VITE_SUI_NETWORK=" widget/.env.local
```

**Solution:** If mismatched, run with flag:
```bash
./scripts/pay402-tmux.sh --testnet
```

---

## 📦 What Gets Updated

When network switching occurs (with flags), these files are updated:

### Facilitator (`facilitator/.env`)
- `SUI_NETWORK`
- `PACKAGE_ID`
- `RPC_URL`
- `FACILITATOR_ADDRESS`
- `USDC_TYPE` (MockUSDC vs real USDC)
- `TREASURY_OWNER_ADDRESS` (testnet only)

### Merchant (`merchant/.env`)
- `SUI_NETWORK`
- `PACKAGE_ID`
- `RPC_URL`
- API keys (if present)

### Widget (`widget/.env.local`)
- `VITE_SUI_NETWORK`
- `VITE_PACKAGE_ID`
- `VITE_RPC_URL`
- `VITE_ENOKI_API_KEY`
- `VITE_GOOGLE_CLIENT_ID`

---

## 🚀 Best Practices

### For Development
1. **First time:** Run `./scripts/setup-env.sh` to create all templates
2. **Daily work:** Just run `./scripts/pay402-tmux.sh` (attaches to existing session)
3. **Switch networks:** Use flags (`--testnet` or `--localnet`)

### For Testing
```bash
# Test on testnet
./scripts/pay402-tmux.sh --testnet
cd facilitator && npm run test

# Test on localnet
./scripts/pay402-tmux.sh --localnet
cd facilitator && npm run test
```

### For CI/CD
```bash
# Always explicit
./scripts/pay402-tmux.sh --testnet
```

---

## 🎓 Summary

| Scenario | Command | What Happens |
|----------|---------|--------------|
| First run (no .env) | `./pay402-tmux.sh` | Creates .env from current sui env |
| Regular run (.env exists) | `./pay402-tmux.sh` | Uses existing .env, attaches session |
| Force testnet | `./pay402-tmux.sh --testnet` | Overwrites .env, kills session, creates testnet session |
| Force localnet | `./pay402-tmux.sh --localnet` | Overwrites .env, kills session, creates localnet session |

**Golden Rule:** Use flags when you want to **force** a network. Don't use flags when you want to **preserve** current state.
