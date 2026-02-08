# Environment Configuration Template Strategy

## 🎯 **Problem Solved**

**Original Issue:**
When switching networks (localnet ↔ testnet), copying `.env.<network>` → `.env` would **destroy** important fields:
- Localnet → Testnet: Lost `TREASURY_OWNER_PRIVATE_KEY`, `MOCK_USDC_PACKAGE`
- Testnet → Localnet: Lost `USDC_TYPE`

**Solution:**
Use **complete template files** where each `.env.<network>` contains ALL fields (used or unused).

---

## 📁 **File Structure**

```
Pay402/
├── facilitator/
│   ├── .env                    # Active config (working copy)
│   ├── .env.localnet           # Complete localnet template ✅
│   ├── .env.testnet            # Complete testnet template ✅
│   └── .env.backup_TIMESTAMP   # Timestamped backup
│
├── merchant/
│   ├── .env                    # Active config
│   ├── .env.localnet           # Complete localnet template ✅
│   ├── .env.testnet            # Complete testnet template ✅
│   └── .env.backup_TIMESTAMP   # Timestamped backup
│
└── widget/
    ├── .env.local              # Active config
    ├── .env.localnet           # Complete localnet template ✅
    ├── .env.testnet            # Complete testnet template ✅
    └── .env.local.backup_TIMESTAMP  # Timestamped backup
```

---

## ✅ **Complete Template Approach**

### **Principle:**
Every `.env.<network>` file is **self-contained** with ALL fields needed for that network.

### **For Unused Fields:**
- Include them but **commented out** or **set to empty**
- Add comment explaining why not used

### **Example: Facilitator**

**`.env.localnet` (Complete)**
```env
PORT=3001
SUI_NETWORK=localnet
PACKAGE_ID=0x1d1d...
FACILITATOR_PRIVATE_KEY=...
TREASURY_OWNER_PRIVATE_KEY=...     # ✅ PRESENT (needed for /fund endpoint)
MOCK_USDC_PACKAGE=...              # ✅ PRESENT (needed for MockUSDC)
MOCK_USDC_TREASURY_CAP=...         # ✅ PRESENT (needed for minting)
# USDC_TYPE=                       # ❌ NOT USED (using MockUSDC instead)
```

**`.env.testnet` (Complete)**
```env
PORT=3001
SUI_NETWORK=testnet
PACKAGE_ID=0x2999...
FACILITATOR_PRIVATE_KEY=...
USDC_TYPE=0xa1ec...                # ✅ PRESENT (real Circle USDC)
# TREASURY_OWNER_PRIVATE_KEY=      # ❌ NOT USED (no MockUSDC on testnet)
# MOCK_USDC_PACKAGE=               # ❌ NOT USED (using real USDC)
# MOCK_USDC_TREASURY_CAP=          # ❌ NOT USED (no treasury on testnet)
```

---

## 🔒 **Safety Guarantees**

### **1. No Data Loss**
✅ **Before:** Localnet → Testnet lost `TREASURY_OWNER_PRIVATE_KEY`
✅ **After:** Testnet `.env` has `# TREASURY_OWNER_PRIVATE_KEY=` placeholder
✅ **When switching back:** Localnet `.env` restores actual value

### **2. Self-Contained Templates**
✅ Each `.env.<network>` is **complete and independent**
✅ No need to "merge" or "preserve" fields
✅ Simple copy operation: `cp .env.testnet → .env`

### **3. Clear Documentation**
✅ Comments explain which fields are used/unused
✅ Easy to see what each network needs
✅ New developers understand immediately

### **4. Timestamped Backups**
✅ All original `.env` files backed up with timestamp
✅ Format: `.env.backup_YYYYMMDD_HHMMSS`
✅ Can restore if needed

---

## 🔄 **How Network Switching Works**

### **Automatic (via tmux script):**
```bash
./scripts/pay402-tmux.sh --testnet

# Script does:
1. Switch sui client: sui client switch --env testnet
2. Copy complete templates:
   cp facilitator/.env.testnet → facilitator/.env
   cp merchant/.env.testnet → merchant/.env
   cp widget/.env.testnet → widget/.env.local
3. Deploy contracts (reads from .env.testnet via deploy script)
4. Start services
```

**Result:** All services use correct testnet configuration!

---

### **Manual (if needed):**
```bash
# Switch to testnet
sui client switch --env testnet
cp facilitator/.env.testnet facilitator/.env
cp merchant/.env.testnet merchant/.env
cp widget/.env.testnet widget/.env.local

# Switch to localnet
sui client switch --env localnet
cp facilitator/.env.localnet facilitator/.env
cp merchant/.env.localnet merchant/.env
cp widget/.env.localnet widget/.env.local
```

---

## 📊 **Field Comparison**

### **Facilitator Fields**

| Field | Localnet | Testnet | Notes |
|-------|----------|---------|-------|
| `PORT` | 3001 | 3001 | Same |
| `SUI_NETWORK` | localnet | testnet | Different |
| `PACKAGE_ID` | 0x1d1d... | 0x2999... | Different contracts |
| `FACILITATOR_PRIVATE_KEY` | localnet key | testnet key | Different wallets |
| `FACILITATOR_ADDRESS` | (optional) | 0x2616... | Testnet explicit |
| `FACILITATOR_FEE` | 10000 | 10000 | Same |
| `TREASURY_OWNER_PRIVATE_KEY` | ✅ Present | ❌ Commented | Only localnet |
| `MOCK_USDC_PACKAGE` | ✅ Present | ❌ Commented | Only localnet |
| `MOCK_USDC_TREASURY_CAP` | ✅ Present | ❌ Commented | Only localnet |
| `USDC_TYPE` | ❌ Commented | ✅ Present | Only testnet |

---

### **Merchant Fields**

| Field | Localnet | Testnet | Notes |
|-------|----------|---------|-------|
| `PORT` | 3002 | 3002 | Same |
| `SUI_NETWORK` | localnet | testnet | Different |
| `MERCHANT_NAME` | Same | Same | Static |
| `MERCHANT_ADDRESS` | Same | Same | Same wallet |
| `MERCHANT_PRIVATE_KEY` | Same | Same | Same wallet |
| `RESOURCE_PRICE` | 100000 | 100000 | Same |
| `FACILITATOR_ADDRESS` | 0x4411... | 0x2616... | Different facilitators |
| `FACILITATOR_FEE` | 10000 | 10000 | Same |
| `INVOICE_EXPIRY_SECONDS` | 3600 | 3600 | Same |

---

### **Widget Fields**

| Field | Localnet | Testnet | Notes |
|-------|----------|---------|-------|
| `VITE_ENOKI_API_KEY` | Same | Same | Public key, same for both |
| `VITE_GOOGLE_CLIENT_ID` | Same | Same | OAuth, same for both |
| `VITE_FACILITATOR_URL` | http://localhost:3001 | http://localhost:3001 | Same (local dev) |
| `VITE_SUI_NETWORK` | localnet | testnet | Different |
| `VITE_PACKAGE_ID` | 0x1d1d... | 0x2999... | Different contracts |

---

## 🎓 **Best Practices**

### **1. Always Use Complete Templates**
```bash
# ✅ Good: Each .env.<network> is complete
facilitator/.env.localnet:
  - All localnet fields present
  - Testnet-only fields commented out

facilitator/.env.testnet:
  - All testnet fields present
  - Localnet-only fields commented out
```

### **2. Document Unused Fields**
```env
# ✅ Good: Clear why field is not used
# TREASURY_OWNER_PRIVATE_KEY=     # Not used on testnet (using real USDC)

# ❌ Bad: Missing field without explanation
(field just absent)
```

### **3. Keep .env as Working Copy**
```bash
# .env = Active configuration (changes based on network)
# .env.localnet = Static template (doesn't change)
# .env.testnet = Static template (doesn't change)
```

### **4. Backup Before Major Changes**
```bash
# Create timestamped backup
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
cp facilitator/.env facilitator/.env.backup_$TIMESTAMP
```

---

## 🔐 **.gitignore Strategy**

```gitignore
# Never commit active .env files (contain secrets)
.env
.env.local

# Never commit backups (contain secrets)
.env.backup_*
.env.local.backup_*

# DO commit templates (placeholders, no real secrets)
# These are in git:
.env.localnet
.env.testnet
.env.example
```

**Rationale:**
- Templates are safe to commit (use example/placeholder keys for localnet)
- Active `.env` files contain real secrets (never commit)
- Backups contain real secrets (never commit)

---

## 🚀 **Migration from Old Approach**

### **Old Approach (UNSAFE):**
```bash
# .env had some fields
# .env.testnet had subset of fields
# Copying lost data!
cp .env.testnet → .env  # ❌ Lost TREASURY_OWNER_PRIVATE_KEY!
```

### **New Approach (SAFE):**
```bash
# All .env.<network> files are complete
# Copying is safe!
cp .env.testnet → .env  # ✅ All fields present (used or commented)
```

### **Backups Created:**
All original files backed up with timestamp `20260206_114524`:
- `facilitator/.env.backup_20260206_114524`
- `facilitator/.env.localnet.backup_20260206_114524`
- `facilitator/.env.testnet.backup_20260206_114524`
- `merchant/.env.backup_20260206_114524`
- `widget/.env.local.backup_20260206_114524`

---

## ✅ **Verification**

### **Check Templates Are Complete:**
```bash
# Facilitator localnet should have:
grep -E "TREASURY_OWNER_PRIVATE_KEY|MOCK_USDC|USDC_TYPE" facilitator/.env.localnet

# Facilitator testnet should have:
grep -E "TREASURY_OWNER_PRIVATE_KEY|MOCK_USDC|USDC_TYPE" facilitator/.env.testnet

# All fields present (active or commented)? ✅
```

### **Test Network Switching:**
```bash
# Test localnet
./scripts/pay402-tmux.sh --kill
./scripts/pay402-tmux.sh --localnet
# Verify: facilitator/.env has TREASURY_OWNER_PRIVATE_KEY

# Test testnet
./scripts/pay402-tmux.sh --kill
./scripts/pay402-tmux.sh --testnet
# Verify: facilitator/.env has USDC_TYPE

# Switch back to localnet
./scripts/pay402-tmux.sh --kill
./scripts/pay402-tmux.sh --localnet
# Verify: facilitator/.env still has TREASURY_OWNER_PRIVATE_KEY ✅
```

---

## 📖 **Related Documentation**

- [NETWORK-SWITCHING.md](NETWORK-SWITCHING.md) - Network switching usage guide
- [NETWORK-SWITCHING-IMPLEMENTATION.md](NETWORK-SWITCHING-IMPLEMENTATION.md) - Implementation details
- [README.md](README.md) - Quick start and setup

---

**Strategy Implemented:** 2026-02-06
**Backups Created:** 20260206_114524
**Status:** ✅ Complete and Safe
