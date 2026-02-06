# zkLogin Setup Guide: Enoki + Google OAuth

## 🔴 BLOCKING ISSUES - What You Need to Fix

You have **TWO critical blockers** preventing zkLogin integration:

1. **Enoki API Key** (from Mysten Labs)
2. **Google OAuth Client ID** (from Google Cloud)

---

## Step 1: Get Enoki API Key

### What is Enoki?

Enoki is Mysten Labs' zkLogin infrastructure service. It handles:

- JWT validation
- zkLogin proof generation
- Transaction sponsorship (optional)
- Address derivation

### How to Get API Key

#### Option A: Official Mysten Labs Registration (RECOMMENDED)

1. **Visit Enoki Portal:**

   ```
   https://enoki.mystenlabs.com/
   ```

   OR

   ```
   https://docs.enoki.mystenlabs.com/
   ```

2. **Sign up / Log in:**

   - Use your Mysten Labs account
   - Or create new account if first time

3. **Create New Application:**

   - Name: `Pay402-Dev` (for development)
   - Network: `Testnet` (switch to Mainnet later)
   - Redirect URIs: `http://localhost:5173/auth/callback`

4. **Get API Key:**

   - Copy the API key (starts with `enoki_`)
   - Copy the API Secret (keep this VERY secret!)

5. **Add to Environment:**
   ```bash
   # Pay402/widget/.env.local
   VITE_ENOKI_API_KEY=enoki_xxxxxxxxxxxxxx
   ```

#### Option B: Enoki SDK Documentation

If portal not found, check SDK docs:

```
https://docs.enoki.mystenlabs.com/ts-sdk/getting-started
```

Look for "Get API Key" or "Registration" section.

---

### What You'll Get

After registration, you should have:

```
✓ Enoki API Key (public, safe for browser)
✓ Enoki API Secret (private, never expose!)
✓ Application ID
✓ Redirect URIs configured
```

---

## Step 2: Setup Google OAuth Client ID

### Why Google OAuth?

zkLogin uses OAuth providers (Google, Facebook, etc.) to derive blockchain addresses. Most common is Google.

### How to Get Google OAuth Client ID

#### 2.1 Create Google Cloud Project

1. **Go to Google Cloud Console:**

   ```
   https://console.cloud.google.com/
   ```

2. **Create New Project:**
   - Click "Select Project" dropdown (top bar)
   - Click "New Project"
   - Name: `Pay402-zkLogin`
   - Organization: (your account)
   - Click "Create"

#### 2.2 Enable APIs

1. **Navigate to APIs & Services:**

   ```
   Left menu → APIs & Services → Library
   ```

2. **Enable Required APIs:**
   - Search: "Google+ API" or "Google Identity"
   - Click "Enable"

#### 2.3 Configure OAuth Consent Screen

1. **Go to OAuth Consent Screen:**

   ```
   Left menu → APIs & Services → OAuth consent screen
   ```

2. **Choose User Type:**

   - Select: **"External"** (for testing with any Google account)
   - Click "Create"

3. **Fill in App Information:**

   ```
   App name: Pay402
   User support email: your-email@gmail.com
   Developer contact: your-email@gmail.com
   ```

4. **Add Scopes:**

   - Click "Add or Remove Scopes"
   - Select:
     ✓ openid
     ✓ email
     ✓ profile
   - Click "Update"

5. **Add Test Users (for development):**

   - Click "Add Users"
   - Add your Gmail address
   - Add any other testers
   - Click "Save"

6. **Finish:**
   - Click through remaining steps
   - Status should be: "Testing"

#### 2.4 Create OAuth Client ID

1. **Go to Credentials:**

   ```
   Left menu → APIs & Services → Credentials
   ```

2. **Create Credentials:**

   - Click "Create Credentials" → "OAuth Client ID"

3. **Configure OAuth Client:**

   ```
   Application type: Web application
   Name: Pay402 Widget

   Authorized JavaScript origins:
   - http://localhost:5173
   - http://localhost:3002
   - https://pay402.com (add your production domain later)

   Authorized redirect URIs:
   - http://localhost:5173/auth/callback
   - http://localhost:3002/auth/callback
   - https://pay402.com/auth/callback (add production later)
   ```

4. **Create & Download:**
   - Click "Create"
   - **COPY the Client ID** (starts with something like `123456789-xxxxx.apps.googleusercontent.com`)
   - Download JSON (optional, but good backup)

#### 2.5 Add to Environment

```bash
# Pay402/widget/.env.local
VITE_GOOGLE_CLIENT_ID=123456789-xxxxxxxxxxxxx.apps.googleusercontent.com
```

---

## Step 3: Update Widget Configuration

### 3.1 Create/Update `.env.local`

```bash
cd Pay402/widget
```

Create `.env.local` (if not exists):

```bash
# Enoki Configuration
VITE_ENOKI_API_KEY=enoki_xxxxxxxxxxxxxx

# Google OAuth Configuration
VITE_GOOGLE_CLIENT_ID=123456789-xxxxxxxxxxxxx.apps.googleusercontent.com

# Network (testnet for now)
VITE_NETWORK=testnet

# Facilitator URL
VITE_FACILITATOR_URL=http://localhost:3001
```

### 3.2 Update `vite.config.ts` (if needed)

Ensure environment variables are exposed:

```typescript
// Already configured, just verify:
export default defineConfig({
  // ...
  define: {
    "process.env": {},
  },
});
```

---

## Step 4: Update Code to Use Environment Variables

### 4.1 Update `App.tsx`

Add Enoki provider initialization:

```typescript
import { EnokiFlowProvider } from "@mysten/enoki/react";

const enokiApiKey = import.meta.env.VITE_ENOKI_API_KEY;
const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <SuiClientProvider networks={networkConfig} defaultNetwork="testnet">
        <EnokiFlowProvider apiKey={enokiApiKey}>
          <WalletProvider autoConnect>{/* ... */}</WalletProvider>
        </EnokiFlowProvider>
      </SuiClientProvider>
    </QueryClientProvider>
  );
}
```

### 4.2 Update `useEnokiAuth.ts`

Replace stub implementation:

```typescript
import { useEnokiFlow, useZkLogin } from "@mysten/enoki/react";

export function useEnokiAuth(): AuthProvider {
  const enokiFlow = useEnokiFlow();
  const zkLogin = useZkLogin();

  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

  const signIn = useCallback(async () => {
    if (!enokiFlow || !googleClientId) {
      throw new Error("Enoki not configured - check .env.local");
    }

    const protocol = window.location.protocol;
    const host = window.location.host;
    const redirectUrl = `${protocol}//${host}/auth/callback`;

    const authUrl = await enokiFlow.createAuthorizationURL({
      provider: "google",
      clientId: googleClientId,
      redirectUrl,
      extraParams: {
        scope: "openid email profile",
      },
    });

    window.location.href = authUrl;
  }, [enokiFlow, googleClientId]);

  // ... rest of implementation
}
```

---

## Step 5: Test zkLogin Flow

### 5.1 Start Services

```bash
# Terminal 1: Start facilitator & merchant
./scripts/pay402-tmux.sh --testnet

# Terminal 2: Start widget
cd widget
npm run dev
```

### 5.2 Navigate to zkLogin Test Page

```
http://localhost:5173/zklogin-test
```

### 5.3 Test Flow

1. Click "Login with Google"
2. Should redirect to Google OAuth
3. Log in with your Google account
4. Should redirect back to widget
5. Should show your zkLogin address
6. Click "Check Balance"
7. Should show USDC balance from facilitator

### 5.4 Expected Behavior

**Success indicators:**

```
✓ Google OAuth popup appears
✓ After login, address is displayed (0x...)
✓ Address is deterministic (same every time)
✓ Balance check works
✓ No errors in console
```

**Failure indicators:**

```
✗ "Enoki not configured" error
✗ "Invalid client ID" from Google
✗ Blank screen after OAuth redirect
✗ Console errors about CORS
```

---

## Step 6: Debug Common Issues

### Issue 1: "Enoki not initialized"

**Cause:** Missing or invalid API key

**Fix:**

1. Check `.env.local` exists in `widget/` folder
2. Check variable name: `VITE_ENOKI_API_KEY` (must start with `VITE_`)
3. Restart dev server after changing `.env.local`
4. Check browser console: `console.log(import.meta.env.VITE_ENOKI_API_KEY)`

---

### Issue 2: "Invalid OAuth client ID"

**Cause:** Wrong Google Client ID or not configured

**Fix:**

1. Verify Client ID in Google Cloud Console
2. Check it ends with `.apps.googleusercontent.com`
3. Verify redirect URI matches exactly: `http://localhost:5173/auth/callback`
4. Check OAuth consent screen is configured

---

### Issue 3: "Redirect URI mismatch"

**Cause:** Google OAuth redirect URI not whitelisted

**Fix:**

1. Go to Google Cloud Console → Credentials
2. Click your OAuth Client ID
3. Add redirect URI: `http://localhost:5173/auth/callback`
4. Make sure there's NO trailing slash
5. Save and wait 5 minutes for changes to propagate

---

### Issue 4: "White screen after OAuth"

**Cause:** No callback handler or routing issue

**Fix:**

1. Check `App.tsx` has route for `/auth/callback`
2. Implement callback handler:
   ```typescript
   // In App.tsx or separate component
   if (window.location.pathname === "/auth/callback") {
     return <div>Processing login...</div>;
   }
   ```
3. Let Enoki SDK handle callback automatically

---

### Issue 5: "CORS error"

**Cause:** Enoki API rejecting requests

**Fix:**

1. Check API key is correct
2. Verify network (testnet vs mainnet)
3. Check if API key is expired/revoked
4. Contact Mysten Labs support

---

## Step 7: Validate zkLogin Integration

### 7.1 Manual Testing Checklist

```
□ Google OAuth redirects correctly
□ After login, zkLogin address is displayed
□ Same Google account → same address (deterministic)
□ Address has format: 0x[64 hex chars]
□ Balance check returns USDC balance
□ Signing transaction works (next step)
□ Payment flow completes end-to-end
```

### 7.2 Add Automated Tests

Once manual testing works, add tests:

```typescript
// widget/src/__tests__/zklogin.test.ts
describe("zkLogin Integration", () => {
  it("should initialize Enoki with API key", () => {
    expect(import.meta.env.VITE_ENOKI_API_KEY).toBeDefined();
  });

  it("should create Google OAuth URL", async () => {
    // Mock test
  });

  // ... more tests
});
```

---

## Summary: What You Need

### 🔴 Critical (BLOCKING)

1. **Enoki API Key**

   - Where: https://enoki.mystenlabs.com/
   - What: API key for zkLogin service
   - Add to: `widget/.env.local` as `VITE_ENOKI_API_KEY`

2. **Google OAuth Client ID**
   - Where: https://console.cloud.google.com/
   - What: OAuth client credentials
   - Add to: `widget/.env.local` as `VITE_GOOGLE_CLIENT_ID`

### ✅ Already Done

- Backend ready for zkLogin signatures
- Widget logic implemented (just needs API keys)
- Test infrastructure solid
- Testnet deployed and working

### 📋 Next Steps After Getting Keys

1. Add keys to `.env.local`
2. Update `App.tsx` with `EnokiFlowProvider`
3. Complete `useEnokiAuth.ts` implementation
4. Test manually on http://localhost:5173/zklogin-test
5. Debug any issues using guide above
6. Add automated tests
7. Deploy to production

---

## Quick Start Commands (After Getting Keys)

```bash
# 1. Add keys to environment
cd Pay402/widget
echo "VITE_ENOKI_API_KEY=your_key_here" >> .env.local
echo "VITE_GOOGLE_CLIENT_ID=your_client_id_here" >> .env.local

# 2. Start services
cd ..
./scripts/pay402-tmux.sh --testnet

# 3. Start widget (new terminal)
cd widget
npm run dev

# 4. Test zkLogin
open http://localhost:5173/zklogin-test
```

---

## Resources

- **Enoki Docs:** https://docs.enoki.mystenlabs.com/
- **Google OAuth Setup:** https://developers.google.com/identity/protocols/oauth2
- **SUI zkLogin Guide:** https://docs.sui.io/guides/developer/cryptography/zklogin
- **Pay402 Test Coverage:** `TEST-COVERAGE-REALITY-CHECK.md`

---

## Support

If you get stuck:

1. Check Enoki Discord/Forum
2. Check SUI Discord (#zklogin channel)
3. Review official examples
4. Contact Mysten Labs support

**You're 90% there - just need these 2 keys to unlock zkLogin! 🚀**
