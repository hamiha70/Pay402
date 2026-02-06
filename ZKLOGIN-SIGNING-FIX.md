# zkLogin Transaction Signing Fix

## 🚨 Problem Identified

**Root Cause:** The zkLogin JWT from Google OAuth is not being passed to Enoki's zkp endpoint when signing transactions.

### Error Details

- **Request:** `POST https://api.enoki.mystenlabs.com/v1/zklogin/zkp`
- **Status:** `ERR_CONNECTION_RESET`
- **Payload Sent:**
  ```json
  {
    "network": "testnet",
    "ephemeralPublicKey": "AgOYcJC5LoWH1kc1zwLvv5vRRh7ZPQ++CEN5dQUlxpPNeg==",
    "maxEpoch": 1004,
    "randomness": "89564410752271675063677354922633643070"
  }
  ```
- **Missing:** `zklogin-jwt` parameter (REQUIRED by Enoki API)

### Why This Happens

1. **OAuth Flow Conflict:**

   - Merchant redirects to `http://localhost:5173#invoice=...`
   - User clicks "Sign In with Google"
   - Enoki opens OAuth popup
   - Google redirects back to `http://localhost:5173` (registered redirect URI)
   - **The popup window and main window share the same base URL**
   - **JWT storage gets confused between popup and main window**

2. **Storage Isolation:**
   - We removed JWT from URL to fix OAuth redirect issues
   - But now Enoki SDK can't find the JWT when it needs to sign transactions
   - `sessionStorage` is origin-specific (protocol + hostname + port)
   - Popup and main window should share storage, but timing issues cause loss

---

## ✅ Solution: Dedicated OAuth Callback Page

### What We Did

Created `/oauth-callback` route that serves as a dedicated OAuth landing page for the popup window.

**Files Changed:**

1. `widget/src/components/OAuthCallback.tsx` (NEW)
2. `widget/src/App.tsx` (UPDATED)

### How It Works

```
┌─────────────┐
│   Merchant  │
│   Page      │
└──────┬──────┘
       │ Redirects to widget with invoice in hash
       ↓
┌─────────────────────────────────────┐
│  Widget: http://localhost:5173      │
│  #invoice=eyJ...                    │
└──────┬──────────────────────────────┘
       │ User clicks "Sign In with Google"
       ↓
┌─────────────────────────────────────┐
│  Enoki opens popup                  │
│  → Google OAuth                     │
│  → Redirects to /oauth-callback     │
└──────┬──────────────────────────────┘
       │ OAuth completes in popup
       ↓
┌─────────────────────────────────────┐
│  Popup: /oauth-callback             │
│  - Enoki SDK processes JWT          │
│  - Stores JWT in localStorage       │
│  - Closes popup automatically       │
└──────┬──────────────────────────────┘
       │ Main window now has access to JWT
       ↓
┌─────────────────────────────────────┐
│  Widget: Payment flow continues     │
│  - JWT available for signing        │
│  - Transaction signing works!       │
└─────────────────────────────────────┘
```

---

## 🔧 Required Configuration Changes

### 1. Update Google OAuth Redirect URIs

Go to [Google Cloud Console](https://console.cloud.google.com/):

1. Navigate to **APIs & Services** → **Credentials**
2. Click on your OAuth 2.0 Client ID
3. Under **Authorized redirect URIs**, **ADD** (don't replace!):
   ```
   http://localhost:5173/oauth-callback
   ```
4. Keep the existing URI:
   ```
   http://localhost:5173
   ```
5. **Save**

**Final list should include BOTH:**

- `http://localhost:5173` (for main app)
- `http://localhost:5173/oauth-callback` (for OAuth popup)

### 2. Update Enoki Portal (if needed)

Go to [Enoki Portal](https://portal.enoki.mystenlabs.com):

1. Find your app/project
2. Check **Allowed Origins** field
3. Ensure it includes:
   ```
   http://localhost:5173
   http://127.0.0.1:5173
   ```
4. **Save** if changed

---

## 🧪 Testing Steps

### 1. Restart Widget

```bash
# In widget directory
rm -rf node_modules/.vite
# Then restart in tmux or manually:
npm run dev
```

### 2. Test OAuth Flow

1. Go to merchant page: `http://localhost:3002`
2. Click "💳 Get Premium Content"
3. Click "Sign In with Google (zkLogin)"
4. **Watch for popup:**
   - Should open Google OAuth
   - Should redirect to `/oauth-callback` in popup
   - Should show "Completing Sign In..." message
   - Should close automatically
5. **Main window should now show your address**

### 3. Test Payment Signing

1. After successful login, you should see your USDC balance
2. If balance is 0, click "🚀 Open Circle USDC Faucet"
3. Get testnet USDC
4. Click "🔄 Refresh Balance"
5. Click "✅ Confirm Payment"
6. **This should now work!**

### 4. Check Console Logs

Look for:

```
[EnokiAuth] Step 2: Calling signTransaction hook...
[EnokiAuth] Chain ID: sui:testnet
[EnokiAuth] ✅ signTransaction hook returned successfully
[EnokiAuth] 🎉 Transaction signing complete!
```

### 5. Check Network Tab

- Open DevTools → Network tab
- Filter by "zkp"
- Should see `POST https://api.enoki.mystenlabs.com/v1/zklogin/zkp`
- **Status should be 200 OK** (not ERR_CONNECTION_RESET)
- Response should contain zkp proof

---

## 🐛 Troubleshooting

### If OAuth popup doesn't open:

- Check browser popup blocker
- Try Ctrl+Shift+R to hard refresh

### If popup opens but doesn't close:

- Check Google OAuth redirect URIs include `/oauth-callback`
- Check browser console in popup window for errors

### If signing still fails:

1. Clear browser cache and localStorage:
   ```javascript
   localStorage.clear();
   sessionStorage.clear();
   ```
2. Sign out and sign in again
3. Check Network tab for the actual error response

### If JWT is still missing:

- Check `localStorage` in DevTools → Application tab
- Look for keys containing "enoki", "zklogin", or "jwt"
- If empty, OAuth callback is not storing the JWT properly

---

## 📝 Technical Details

### Why `/oauth-callback` Works

1. **Separate Route:** Doesn't interfere with invoice hash in main window
2. **Popup Context:** Enoki SDK can complete OAuth flow in isolation
3. **Shared Storage:** localStorage is shared across same origin
4. **Clean Separation:** Main app logic separate from OAuth handling

### Alternative Solutions Considered

❌ **Option A:** Store JWT in URL query param

- **Problem:** Conflicts with Google OAuth redirect URI validation

❌ **Option B:** Use `sessionStorage` with manual transfer

- **Problem:** Timing issues, complex to debug

❌ **Option C:** Downgrade Enoki SDK

- **Problem:** Loses compatibility with dapp-kit 1.0.1

✅ **Option D:** Dedicated OAuth callback page (CHOSEN)

- **Pros:** Clean separation, follows OAuth best practices
- **Cons:** Requires updating Google OAuth config (one-time)

---

## 🎯 Success Criteria

✅ User can sign in with Google (OAuth popup works)  
✅ User address is displayed after sign-in  
✅ User can click "Confirm Payment"  
✅ Transaction signing completes without errors  
✅ Payment is submitted to blockchain  
✅ Receipt is displayed with transaction digest

---

## 📚 References

- [Enoki OAuth Flow](https://docs.enoki.mystenlabs.com/ts-sdk/sign-in)
- [Google OAuth 2.0](https://developers.google.com/identity/protocols/oauth2)
- [dapp-kit Wallet Integration](https://sdk.mystenlabs.com/dapp-kit)

---

**Last Updated:** 2026-02-06  
**Status:** Ready for testing
