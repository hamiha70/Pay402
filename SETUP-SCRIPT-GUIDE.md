# Setup Script Guide

## 🎯 **Purpose**

The `setup-env.sh` script automates the tedious process of configuring Pay402's environment files, reducing setup time from **15 minutes to 2 minutes** and eliminating common configuration errors.

---

## ⚡ **Quick Start**

```bash
# After cloning the repo and running npm install:
./scripts/setup-env.sh
```

That's it! Follow the interactive prompts.

---

## 📋 **What It Does**

### **1. Prerequisites Check**

- Verifies `sui` CLI is installed
- Shows version information
- Exits with helpful error if not found

### **2. Template File Setup**

Automatically copies 6 template files:

```
facilitator/.env.localnet.example → facilitator/.env.localnet
facilitator/.env.testnet.example  → facilitator/.env.testnet
merchant/.env.localnet.example    → merchant/.env.localnet
merchant/.env.testnet.example     → merchant/.env.testnet
widget/.env.localnet.example      → widget/.env.localnet
widget/.env.testnet.example       → widget/.env.testnet
```

### **3. Shared Secrets (No Double Entry!)**

Prompts for values used across both networks:

- **Enoki API Key** (public key)
- **Google OAuth Client ID**

**Key Feature:** Enter once, automatically updates BOTH localnet and testnet configs!

### **4. Input Validation**

- **Enoki API Key:** Must match `enoki_public_[64 hex chars]`
- **Google Client ID:** Must match `NNNN-XXX.apps.googleusercontent.com`
- Prevents typos and format errors

### **5. Facilitator Key Generation**

Two options:

- **Auto-generate** (recommended): Creates new keys via `sui client new-address ed25519`
- **Use existing**: Enter your own keys

Generates **separate keys** for localnet and testnet (security best practice).

### **6. Summary & Next Steps**

Shows:

- All configured values (truncated for security)
- Files created
- Next commands to run

---

## 🎓 **Example Session**

```bash
$ ./scripts/setup-env.sh

🔧 Pay402 Environment Setup
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📋 Checking prerequisites...
✅ sui CLI found: sui 1.64.1-5484a7e2b67c

📁 Copying template files...
  ✅ Facilitator templates copied
  ✅ Merchant templates copied
  ✅ Widget templates copied

🔑 Configure shared secrets (used for both localnet and testnet)

Enter your Enoki API Key (public key): enoki_public_7edbeb7decb38349e30a6d900cdc8843...
  ✅ Valid Enoki API key

Enter your Google OAuth Client ID: 300529773657-mfq7blj3s6ilhskpeva3fvutisa5sbej.apps.googleusercontent.com
  ✅ Valid Google Client ID

📝 Updating configuration files...
  ✅ Widget configs updated (localnet + testnet)

🔐 Configure facilitator keys

The facilitator needs separate private keys for localnet and testnet.
This provides security isolation between environments.

Do you want to auto-generate new keys? (recommended) (y/n): y

🎲 Generating new facilitator keys...

Generating localnet facilitator key...
  ✅ Localnet key generated
     Address: 0x4411...

Generating testnet facilitator key...
  ✅ Testnet key generated
     Address: 0x2616...

📝 Updating facilitator configurations...
  ✅ Facilitator configs updated

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ Setup Complete!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📊 Configuration Summary:

Shared Secrets:
  • Enoki API Key: enoki_public_7edbeb7decb3834...
  • Google Client ID: 300529773657-mfq7blj3s6ilhs...

Facilitator Keys:
  • Localnet: suiprivkey1qpxdxgs7f4hu7qx9pk...
    Address: 0x4411...
  • Testnet: suiprivkey1qpjrjkr7xxpph828hj...
    Address: 0x2616...

Files Created:
  ✅ facilitator/.env.localnet
  ✅ facilitator/.env.testnet
  ✅ merchant/.env.localnet
  ✅ merchant/.env.testnet
  ✅ widget/.env.localnet
  ✅ widget/.env.testnet

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🚀 Next Steps:

1. Configure Google OAuth redirect URIs:
   → Visit: https://console.cloud.google.com
   → Add redirect URI: http://localhost:5173/zklogin-test
   → Add redirect URI: http://localhost:5173

2. Start Pay402 on localnet (for development):
   ./scripts/pay402-tmux.sh --localnet

3. Or start on testnet (for testing):
   ./scripts/pay402-tmux.sh --testnet
   Note: Requires manual testnet funding first!

4. Visit the payment widget:
   → http://localhost:5173

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## 🔧 **Advanced Usage**

### **Force Reconfigure**

```bash
./scripts/setup-env.sh --force
```

Overwrites existing configuration files without prompting.

### **Check Existing Config**

```bash
# Script automatically detects existing configs and asks:
⚠️  Configuration files already exist.

Found existing configurations:
  • facilitator/.env.localnet
  • facilitator/.env.testnet
  • widget/.env.localnet
  • widget/.env.testnet

Do you want to reconfigure? This will overwrite existing files. (y/n):
```

---

## 🎯 **Problem Solved: No Double Entry**

### **Before (Manual Setup)**

**Step 1:** Edit `widget/.env.localnet`:

```env
VITE_ENOKI_API_KEY=enoki_public_7edbeb7decb38349...
VITE_GOOGLE_CLIENT_ID=300529773657-mfq7blj3s6ilhskpeva3fvutisa5sbej.apps.googleusercontent.com
```

**Step 2:** Edit `widget/.env.testnet` with **SAME VALUES**:

```env
VITE_ENOKI_API_KEY=enoki_public_7edbeb7decb38349...  # ← Enter again!
VITE_GOOGLE_CLIENT_ID=300529773657-mfq7blj3s6ilhskpeva3fvutisa5sbej.apps.googleusercontent.com  # ← Enter again!
```

**Problems:**

- ❌ Annoying to enter twice
- ❌ Risk of typos
- ❌ Values might not match

### **After (Setup Script)**

**Script prompts ONCE:**

```
Enter your Enoki API Key: enoki_public_7edbeb7de...
Enter your Google Client ID: 300529773657-mfq7blj3s6i...
```

**Script updates BOTH files automatically:**

```
✅ Widget configs updated (localnet + testnet)
```

**Result:**

- ✅ Enter once
- ✅ No typos
- ✅ Guaranteed to match

---

## 🔒 **Security Features**

### **Separate Network Keys**

The script generates **different facilitator keys** for localnet and testnet:

**Why?**

- ✅ Isolates risk: Compromised localnet key doesn't affect testnet
- ✅ Prevents accidents: Can't accidentally drain testnet funds from localnet
- ✅ Best practice: Production security separation

### **Input Validation**

All inputs are validated with regex:

```bash
# Enoki API Key validation
if [[ $ENOKI_KEY =~ ^enoki_public_[a-f0-9]{64}$ ]]; then
  # Valid
else
  # Show error and re-prompt
fi

# Google Client ID validation
if [[ $GOOGLE_CLIENT_ID =~ ^[0-9]+-[a-z0-9]+\.apps\.googleusercontent\.com$ ]]; then
  # Valid
else
  # Show error and re-prompt
fi
```

---

## 📊 **Time Comparison**

### **Manual Setup (Before)**

```
1. Copy 6 template files manually                   (2 min)
2. Edit widget/.env.localnet (2 values)            (1 min)
3. Edit widget/.env.testnet (SAME 2 values)        (1 min)
4. Generate localnet facilitator key               (1 min)
5. Copy-paste into facilitator/.env.localnet       (1 min)
6. Generate testnet facilitator key                (1 min)
7. Copy-paste into facilitator/.env.testnet        (1 min)
8. Verify all files correct                        (2 min)

Total: ~10-15 minutes
Errors: High (typos, copy-paste, forgotten files)
```

### **Setup Script (After)**

```
1. Run: ./scripts/setup-env.sh                     (0.5 min)
2. Enter Enoki API key (once)                      (0.5 min)
3. Enter Google Client ID (once)                   (0.5 min)
4. Auto-generate keys (or enter existing)          (0.5 min)
5. Review summary                                  (0.5 min)

Total: ~2-3 minutes
Errors: Low (validated inputs, automated updates)
```

**Savings: 10+ minutes, significantly fewer errors!**

---

## 🆘 **Troubleshooting**

### **"sui CLI not found"**

**Error:**

```
❌ Error: sui CLI not found

Please install SUI CLI first:
  curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
  cargo install --locked --git https://github.com/MystenLabs/sui.git --branch testnet sui
```

**Solution:**
Install Rust and SUI CLI as instructed.

---

### **"Invalid Enoki API key format"**

**Error:**

```
❌ Invalid format. Expected: enoki_public_[64 hex characters]
   Example: enoki_public_7edbeb7decb38349e30a6d900cdc8843...
```

**Common mistakes:**

- Using **private key** instead of **public key**
- Including spaces or quotes
- Truncated key (must be full 64 hex chars after prefix)

**Solution:**

- Go to https://portal.enoki.mystenlabs.com
- Copy the **PUBLIC** API key (starts with `enoki_public_`)
- Don't copy private key (starts with `enoki_private_`)

---

### **"Invalid Google Client ID format"**

**Error:**

```
❌ Invalid format. Expected: NNNNNN-XXXXX.apps.googleusercontent.com
   Example: 300529773657-abc123.apps.googleusercontent.com
```

**Common mistakes:**

- Missing `.apps.googleusercontent.com` suffix
- Including `https://` prefix
- Including spaces or quotes

**Solution:**

- Go to https://console.cloud.google.com
- Navigate to: APIs & Services → Credentials
- Copy the **Client ID** (not Client Secret!)
- Should end with `.apps.googleusercontent.com`

---

### **"Failed to generate key"**

**Error:**

```
❌ Failed to generate localnet key
```

**Possible causes:**

- `sui client` not responding
- No active sui environment configured

**Solution:**

```bash
# Check sui client status
sui client active-env

# If no environment, create one
sui client new-env --alias localnet --rpc http://127.0.0.1:9000
sui client switch --env localnet

# Try script again
./scripts/setup-env.sh
```

---

## 📖 **Related Documentation**

- [README.md](README.md) - Main documentation, quick start
- [ENV-TEMPLATE-STRATEGY.md](ENV-TEMPLATE-STRATEGY.md) - Why we use complete templates
- [NETWORK-SWITCHING.md](NETWORK-SWITCHING.md) - How to switch networks after setup
- [ZKLOGIN-BREAKTHROUGH.md](ZKLOGIN-BREAKTHROUGH.md) - zkLogin troubleshooting

---

## 💡 **Tips**

### **1. Keep Your Keys Secure**

The script generates and stores private keys in `.env` files. These are gitignored, but:

- ✅ Back them up securely
- ✅ Don't share them publicly
- ✅ Use different keys for production

### **2. Test on Localnet First**

Always test your setup on localnet before trying testnet:

```bash
./scripts/pay402-tmux.sh --localnet  # Test here first
./scripts/pay402-tmux.sh --testnet   # Then try testnet
```

### **3. Reconfigure If Needed**

If you get new API keys or want to change configuration:

```bash
./scripts/setup-env.sh --force
```

### **4. Verify After Setup**

Check that files were created correctly:

```bash
ls -la facilitator/.env.* merchant/.env.* widget/.env.*
```

---

**Created:** 2026-02-06  
**Status:** ✅ Production Ready  
**Time Saved:** ~10 minutes per setup
