# Reproduce zkLogin Signing Issue

## 🎯 Quick Reproduction Steps

### Prerequisites
1. **Google OAuth Client ID** configured with redirect URIs:
   - `http://localhost:5173`
   - `http://localhost:5173/oauth-callback`
2. **Enoki API Key** (public key)
3. **Testnet USDC** in your zkLogin address

### Steps to Reproduce

```bash
# 1. Clone and setup
git clone https://github.com/hamiha70/Pay402.git
cd Pay402
npm install

# 2. Configure environment
cp facilitator/.env.testnet.example facilitator/.env
cp merchant/.env.testnet.example merchant/.env
cp widget/.env.testnet.example widget/.env.local

# Edit widget/.env.local:
# - Add your VITE_ENOKI_API_KEY
# - Add your VITE_GOOGLE_CLIENT_ID

# 3. Start services
./scripts/pay402-tmux.sh --testnet

# 4. Test the flow
# - Visit http://localhost:3002 (merchant)
# - Click "💳 Get Premium Content"
# - Click "Sign In with Google (zkLogin)"
# - OAuth login works ✅
# - Get USDC from https://faucet.circle.com
# - Click "✅ Confirm Payment"
# - ❌ FAILS with "Failed to fetch"
```

## 🐛 The Issue

### What Works ✅
- OAuth login with Google
- Address derivation and display
- Balance checking (shows USDC balance correctly)

### What Fails ❌
- Transaction signing via `useSignTransaction` from `@mysten/dapp-kit`
- Error: `Failed to fetch` / `ERR_CONNECTION_RESET`
- Endpoint: `POST https://api.enoki.mystenlabs.com/v1/zklogin/zkp`
- Missing parameter: `zklogin-jwt` not included in request payload

### Observable Symptoms
1. **No Enoki keys in localStorage:**
   ```javascript
   // Run in browser console:
   Object.keys(localStorage).filter(k => k.includes('enoki') || k.includes('zklogin'))
   // Returns: [] (empty!)
   ```

2. **Request payload missing JWT:**
   ```json
   {
     "network": "testnet",
     "ephemeralPublicKey": "AgOYcJC5LoWH1kc1zwLvv5vRRh7ZPQ++CEN5dQUlxpPNeg==",
     "maxEpoch": 1004,
     "randomness": "89564410752271675063677354922633643070"
     // ❌ Missing: "zklogin-jwt": "eyJ..."
   }
   ```

3. **Console logs show:**
   ```
   [EnokiAuth] === WALLET DETAILS ===
   [EnokiAuth] Wallet name: Sign in with Google
   [EnokiAuth] Wallet features: (check output)
   [EnokiAuth] Has sui:signTransaction? (check output)
   ```

## 🔍 Key Files to Review

### Main Signing Logic
- `widget/src/hooks/useEnokiAuthDappKit.ts` (lines 95-170)
  - Uses `useSignTransaction` from `@mysten/dapp-kit`
  - Attempts to sign transaction with Enoki wallet
  - Fails when calling the hook

### Wallet Registration
- `widget/src/components/RegisterEnokiWallets.tsx`
  - Registers Enoki wallets via `registerEnokiWallets`
  - This part works (login succeeds)

### OAuth Callback
- `widget/src/components/OAuthCallback.tsx`
  - Dedicated OAuth callback page
  - Loaded in popup during Google OAuth flow

## 💡 Our Use Case

We need to **sign transactions separately from execution** because:

1. **Widget signs** the transaction (user approval)
2. **Facilitator executes** it later (backend verification + routing)
3. This is why we use `useSignTransaction` instead of `useSignAndExecuteTransaction`

**Question for Enoki team:**
Does `registerEnokiWallets` support the `sui:signTransaction` wallet standard feature, or only `sui:signAndExecuteTransaction`?

## 📊 Network Tab Evidence

When clicking "Confirm Payment", check DevTools → Network tab:

1. Filter by "zkp"
2. See failed request:
   - **URL:** `https://api.enoki.mystenlabs.com/v1/zklogin/zkp`
   - **Method:** POST
   - **Status:** `ERR_CONNECTION_RESET`
   - **Payload:** Missing `zklogin-jwt` parameter

## 🔧 Debugging Commands

```bash
# Check if services are running
curl http://localhost:3001/health  # Facilitator
curl http://localhost:3002         # Merchant
curl http://localhost:5173         # Widget

# Check Enoki API is reachable
curl https://api.enoki.mystenlabs.com/

# View verbose logs (after adding logging)
# Open browser console and look for [EnokiAuth] logs
```

## 📝 Expected Behavior

After clicking "Confirm Payment":
1. Widget should sign transaction with zkLogin
2. Signed bytes + signature should be returned
3. Widget sends to facilitator for execution
4. Facilitator executes and returns digest
5. Receipt displayed to user

## 🆘 Current Blocker

The zkLogin JWT from OAuth is not being:
- Stored in localStorage after OAuth completes
- Retrieved when signing transactions
- Passed to Enoki's zkp endpoint

This prevents transaction signing from working, even though OAuth login itself works perfectly.

---

**Last Updated:** 2026-02-06  
**Status:** Awaiting guidance from Enoki team
