# Phase 2A: zkLogin Standalone Test - Ready

**Date**: February 5, 2026  
**Status**: ✅ Implementation complete, ready for testing  
**Approach**: Standalone test page (isolated from payment flow)

---

## 🎯 What Was Built

### 1. Standalone zkLogin Test Page

**File**: `widget/src/components/ZkLoginTest.tsx`

**Features**:

- ✅ Google OAuth sign-in button
- ✅ Real-time debug logs
- ✅ Configuration validation
- ✅ SUI address display
- ✅ Balance checking integration
- ✅ Sign out functionality
- ✅ Setup instructions (embedded)
- ✅ Error display with details

**URL**: http://localhost:5173/zklogin-test

### 2. App Integration

**File**: `widget/src/App.tsx`

**Changes**:

- ✅ Added `EnokiFlowProvider` wrapper
- ✅ Conditional routing for `/zklogin-test` path
- ✅ Graceful fallback if no Enoki API key
- ✅ Maintains existing payment flow

### 3. Documentation

**Files Created**:

1. `ZKLOGIN-SETUP.md` - Complete setup guide
2. `ZKLOGIN-BLOCKERS.md` - Template for tracking issues
3. `PHASE-2A-ZKLOGIN-TEST.md` - This file

---

## 🚀 Quick Start (For User)

### Prerequisites (5-10 minutes)

1. **Get Enoki API Key**:

   - Visit: https://portal.enoki.mystenlabs.com
   - Create app
   - Copy public API key

2. **Configure Environment**:

   ```bash
   cd widget
   # Edit .env.local
   ```

   Add:

   ```env
   VITE_ENOKI_API_KEY=enoki_public_YOUR_KEY_HERE
   VITE_SUI_NETWORK=testnet
   ```

3. **Configure OAuth Redirect** (in Enoki portal):

   - Add redirect URL: `http://localhost:5173/auth`

4. **Start Widget**:

   ```bash
   npm run dev
   ```

5. **Test**:
   - Open: http://localhost:5173/zklogin-test
   - Click "Sign in with Google"
   - Complete OAuth flow
   - Verify SUI address appears

---

## 📊 Test Page Features

### Visual Components

1. **Status Card**:

   - Shows connection status (signed in / not signed in)
   - Displays SUI address when signed in
   - Action buttons (check balance, sign out)

2. **Configuration Panel**:

   - Network validation (must be testnet)
   - API key status
   - Google Client ID status
   - Facilitator URL

3. **Debug Logs**:

   - Real-time flow tracking
   - Timestamps for each step
   - Error messages with details

4. **Setup Instructions**:
   - Collapsible section
   - Prerequisites checklist
   - Troubleshooting tips

### Functional Features

1. **Sign In**:

   - Creates OAuth authorization URL
   - Redirects to Google
   - Handles callback
   - Derives SUI address

2. **Session Management**:

   - Persists session in localStorage
   - Auto-detects returning user
   - Sign out clears session

3. **Balance Check**:

   - Calls facilitator API
   - Displays SUI and USDC balance
   - Shows errors if any

4. **Error Handling**:
   - Catches all errors
   - Displays user-friendly messages
   - Logs technical details

---

## 🔍 Expected Test Outcomes

### Success Scenario

```
1. Page loads
   ✅ Configuration shows: Network=testnet, API key=Set

2. Click "Sign in with Google"
   ✅ Redirects to Google OAuth

3. Authorize app
   ✅ Redirects back to localhost

4. Address displayed
   ✅ Shows 0x[64 hex characters]
   ✅ Debug logs show successful flow

5. Click "Check Balance"
   ✅ Calls facilitator
   ✅ Shows SUI and USDC balance
```

### Common Failure Scenarios

#### Scenario A: Missing API Key

```
❌ Error: "Enoki not initialized"
Fix: Add VITE_ENOKI_API_KEY to .env.local
```

#### Scenario B: Wrong Network

```
⚠️ Warning: "zkLogin requires testnet"
Fix: Set VITE_SUI_NETWORK=testnet
```

#### Scenario C: Redirect Mismatch

```
❌ Error: "Redirect URI mismatch"
Fix: Add http://localhost:5173/auth in Enoki portal
```

#### Scenario D: OAuth Failure

```
❌ Error: From Google OAuth
Fix: Check browser console, verify Enoki config
```

---

## 📝 What to Document

If zkLogin works:

1. ✅ Screenshot of signed-in state
2. ✅ SUI address (for verification)
3. ✅ Debug logs (success path)
4. ✅ Balance check results

If zkLogin fails:

1. ❌ Exact error message
2. ❌ Configuration (sanitized)
3. ❌ Debug logs (full)
4. ❌ Browser console errors
5. ❌ Network tab (OAuth requests)

**Use ZKLOGIN-BLOCKERS.md to document issues!**

---

## 🎯 Success Criteria

**Phase 2A is successful when**:

1. ✅ User can click "Sign in with Google"
2. ✅ OAuth flow completes without errors
3. ✅ SUI address is displayed
4. ✅ Same Google account always gives same address (deterministic)
5. ✅ Balance check works via facilitator

**Once successful → Proceed to Phase 2B: Payment Integration**

---

## 🔄 Next Steps After Success

### Phase 2B: Payment Integration (30 min)

1. **Complete useEnokiAuth.ts**:

   - Implement transaction signing
   - Match AuthProvider interface

2. **Update PaymentPage.tsx**:

   - Add "Sign in with Google" button
   - Keep "Quick Pay" keypair button
   - Dual-route auth selection

3. **Test Full Payment Flow**:

   - zkLogin sign-in
   - Load invoice
   - Build PTB
   - Sign with zkLogin
   - Submit payment

4. **Document Results**:
   - Success: Create demo video
   - Blockers: Update ZKLOGIN-BLOCKERS.md

---

## 📚 Implementation Details

### Key Code Sections

#### OAuth Flow (ZkLoginTest.tsx)

```typescript
const authUrl = await enokiFlow.createAuthorizationURL({
  provider: "google",
  clientId: import.meta.env.VITE_GOOGLE_CLIENT_ID || undefined,
  redirectUrl: `${window.location.origin}/auth`,
  network: "testnet",
});

window.location.href = authUrl;
```

#### Address Derivation

```typescript
// Enoki handles automatically via EnokiFlowProvider
const zkLogin = useZkLogin();
const address = zkLogin?.address; // Deterministic from Google account
```

#### Session Persistence

```typescript
// Enoki stores session in localStorage
// Survives page refreshes
// Clear with: localStorage.removeItem('enoki_session')
```

---

## 🐛 Debugging Tips

### Check Configuration

1. Verify `.env.local` has all required vars
2. Restart dev server after changes
3. Check browser console on page load

### Trace OAuth Flow

1. Open Network tab in DevTools
2. Click "Sign in with Google"
3. Watch for:
   - POST to accounts.google.com
   - Redirect to /auth with code
   - Enoki token exchange

### Debug Logs

1. Check embedded debug logs on test page
2. Look for specific error messages
3. Note where flow fails (OAuth? Address derivation?)

### Common Issues

- **Popup blocked**: Allow popups for localhost
- **CORS error**: Check Enoki portal CORS settings
- **Session lost**: Check localStorage in DevTools

---

## 🔐 Security Notes

### What Gets Stored

- Enoki session token (localStorage)
- ZK proof data (managed by Enoki)
- Google OAuth tokens (temporary, managed by Enoki)

### What Doesn't Get Stored

- Google password (never touches our code)
- Private keys (zkLogin is non-custodial)
- Personal info (only email for derivation)

### Privacy

- SUI address is deterministic but doesn't reveal Google account
- ZK proof ensures privacy
- No linking between Google identity and on-chain activity

---

## 📞 Support Resources

### If You Get Stuck

1. **Check ZKLOGIN-SETUP.md** - Detailed setup instructions
2. **Check ZKLOGIN-BLOCKERS.md** - Common issues and solutions
3. **Browser Console** - Look for error messages
4. **Debug Logs** - On test page, real-time tracking
5. **Sui DevRel** - Reach out with specific errors

### Information to Gather for DevRel

- Exact error message
- Configuration (sanitized)
- Debug logs
- Browser console output
- Network tab (OAuth requests)
- Screenshots

---

## ✅ Phase 2A Checklist

- [x] Test page implemented (`ZkLoginTest.tsx`)
- [x] App routing updated (`App.tsx`)
- [x] Enoki provider integrated
- [x] Documentation created (setup + blockers)
- [ ] **User: Get Enoki API key** ← USER ACTION
- [ ] **User: Configure .env.local** ← USER ACTION
- [ ] **User: Configure OAuth redirect** ← USER ACTION
- [ ] **User: Test sign-in flow** ← USER ACTION
- [ ] **User: Document results** ← USER ACTION

---

**Ready to test!** 🚀

**URL**: http://localhost:5173/zklogin-test

**Guide**: See `ZKLOGIN-SETUP.md` for step-by-step instructions

**Track issues**: Use `ZKLOGIN-BLOCKERS.md` template
