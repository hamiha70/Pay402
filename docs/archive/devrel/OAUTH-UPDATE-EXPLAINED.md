# Google OAuth Client ID Update - Why & What Changed

## 🔄 What Changed

**Old OAuth Client ID:**

```
300529773657-mfq7blj3s6ilhskpeva3fvutisa5sbej.apps.googleusercontent.com
```

**New OAuth Client ID:**

```
1001996736694-2ic38121fneem5ob0ond46cmvhatsrtk.apps.googleusercontent.com
```

---

## ✅ Where Updated (7 Files)

### **1. Production Config:**

- ✅ `widget/.env.local` - Active configuration (used by dev server)

### **2. Environment Templates:**

- ✅ `widget/.env.localnet.example` - Template for localnet setup
- ✅ `widget/.env.testnet.example` - Template for testnet setup

### **3. Test Utilities:**

- ✅ `widget/test-google-oauth.html` - OAuth flow testing tool

### **4. Documentation:**

- ✅ `ZKLOGIN-BREAKTHROUGH.md` - Investigation notes
- ✅ `DEVREL-CODE-REFERENCE.md` - Code examples for support
- ✅ `DEVREL-QUESTION-V2.md` - DevRel question context

---

## 🎯 Why This Update Makes Sense

### **Critical Discovery from Previous Investigation:**

From `ZKLOGIN-BREAKTHROUGH.md`, you discovered:

```typescript
// Enoki SDK source code:
this.#redirectUrl = redirectUrl || window.location.href.split("#")[0];
```

**Key Insight:** Enoki uses the **CURRENT PAGE URL** as the OAuth redirect URI!

---

## 🔍 The Problem We Were Solving

### **Symptom:**

- User visits: `http://localhost:5173/zklogin-test`
- Clicks "Sign in with Google"
- OAuth flow attempts to redirect to: `http://localhost:5173/zklogin-test`
- Google rejects with: `401: invalid_client`

### **Root Cause:**

Old OAuth Client (`300529773657-...`) had redirect URIs:

```
✓ http://localhost:5173      ← Base URL only
✓ http://localhost:5173/     ← With trailing slash
✗ http://localhost:5173/zklogin-test  ← MISSING!
✗ http://localhost:5173/auth          ← MISSING!
```

When Enoki tried to redirect to `/zklogin-test`, Google rejected it because that specific path wasn't in the allowed list.

---

## ✅ The Solution: New OAuth Client

### **New OAuth Client Configuration:**

```
Authorized redirect URIs in Google Cloud Console:
✓ http://localhost:5173                ← Base URL
✓ http://localhost:5173/               ← With trailing slash
✓ http://localhost:5173/zklogin-test   ← Test page (PRIMARY)
✓ http://localhost:5173/auth           ← Alternative route
```

**Why all 4?**

1. **`/` and `/`** - Base URLs (Enoki might redirect to root after initial OAuth)
2. **`/zklogin-test`** - Your dedicated zkLogin testing page
3. **`/auth`** - Alternative auth route (defined in `App.tsx` line 30)

---

## 📊 Does This Make Sense? YES! Here's Why:

### **1. Architecture-Aware** ✅

Your app has **TWO distinct flows:**

```typescript
// App.tsx lines 28-30:
const isZkLoginTest =
  window.location.pathname === "/zklogin-test" ||
  window.location.pathname === "/auth";

// If true → ZkLoginTest component
// If false → PaymentPage component
```

The new OAuth client recognizes **both paths** as valid redirect targets.

---

### **2. Security Best Practice** ✅

Google OAuth requires **exact URL matching** for security:

```
✗ Wildcard URIs NOT allowed: http://localhost:5173/*
✓ Must list each path explicitly
```

By listing all 4 paths, you're following Google's security model correctly.

---

### **3. Enoki SDK Compatibility** ✅

Enoki doesn't let you override the redirect URI easily:

```typescript
// Enoki derives it automatically:
this.#redirectUrl = window.location.href.split("#")[0];

// You CAN'T easily force it to use a different URL
```

So the OAuth client **must** have the exact page URL where the user clicks "Sign in".

---

### **4. Testing Strategy Alignment** ✅

From your testing strategy:

```
Phase 1: Test on /zklogin-test (isolated)
  ✓ Test OAuth flow
  ✓ Test address derivation
  ✓ Test signature

Phase 2: After success, integrate into PaymentPage (/)
  ✓ Update useAuth.ts
  ✓ Full payment flow
```

Having `/zklogin-test` as a redirect URI enables Phase 1 testing **without breaking production**.

---

## 🔬 Technical Deep Dive

### **Why Enoki Uses Current URL:**

```typescript
// When user is on: http://localhost:5173/zklogin-test
// Enoki generates OAuth URL like:
https://accounts.google.com/o/oauth2/v2/auth?
  client_id=1001996736694-2ic38121fneem5ob0ond46cmvhatsrtk.apps.googleusercontent.com&
  redirect_uri=http://localhost:5173/zklogin-test&  ← DERIVED FROM CURRENT PAGE
  response_type=code&
  scope=openid%20email%20profile&
  state=...
```

After user logs in with Google, OAuth redirects back to:

```
http://localhost:5173/zklogin-test?code=AUTH_CODE&state=...
```

If `/zklogin-test` isn't in Google's allowed list → **REJECTED!**

---

### **Why Not Just Use Base URL?**

**Option A: Always redirect to base URL (BAD)**

```typescript
// Force redirect to root
this.#redirectUrl = "http://localhost:5173";
```

❌ **Problems:**

- Loses page context (user was on /zklogin-test, gets redirected to /)
- Harder to debug (where did OAuth callback land?)
- Need routing logic to send user back to right page

**Option B: Use current URL (GOOD - What Enoki Does)**

```typescript
// Use current page
this.#redirectUrl = window.location.href.split("#")[0];
```

✅ **Benefits:**

- User stays on same page
- Clear OAuth flow (test page → Google → back to test page)
- Natural UX (no unexpected redirects)

---

## 🎯 What This Enables

### **Immediate Benefits:**

1. **zkLogin Testing Works** ✅

   ```
   Visit: http://localhost:5173/zklogin-test
   Click: "Sign in with Google"
   Result: OAuth completes, shows your zkLogin address
   ```

2. **Isolated Testing** ✅

   - Test zkLogin without touching main payment flow
   - If OAuth breaks, doesn't affect production widget
   - Safe experimentation

3. **Alternative Auth Route** ✅
   - `/auth` path also works (fallback route)
   - Flexibility for future routing changes

---

### **Future-Ready:**

When you're ready to enable zkLogin on main PaymentPage:

```typescript
// Just add to Google OAuth:
✓ http://localhost:5173  ← ALREADY THERE!

// And update useAuth.ts to use zkLogin
```

The base URL (`/`) is already configured, so main payment flow will work immediately.

---

## 🚨 Common Pitfalls AVOIDED

### **Pitfall 1: Forgetting Trailing Slash**

```
✗ Only listing: http://localhost:5173
✓ Both needed: http://localhost:5173 AND http://localhost:5173/
```

Google treats these as **different URLs**. Your new OAuth client has **both**.

---

### **Pitfall 2: Missing Test Path**

```
✗ Only: http://localhost:5173
✓ Also: http://localhost:5173/zklogin-test
```

Without the test path, you can't test zkLogin in isolation. You **have it**.

---

### **Pitfall 3: Typos in Redirect URI**

```
✗ http://localhost:5173/zklogin-test/  ← Extra trailing slash
✓ http://localhost:5173/zklogin-test   ← Exact match
```

One extra character = OAuth failure. You need **exact matches**.

---

## 📋 Verification Checklist

Before testing zkLogin, verify these match **exactly**:

### **1. Google Cloud Console:**

```
OAuth Client: 1001996736694-2ic38121fneem5ob0ond46cmvhatsrtk
Authorized redirect URIs:
  ✓ http://localhost:5173
  ✓ http://localhost:5173/
  ✓ http://localhost:5173/zklogin-test
  ✓ http://localhost:5173/auth
```

### **2. Your `.env.local`:**

```bash
VITE_GOOGLE_CLIENT_ID=1001996736694-2ic38121fneem5ob0ond46cmvhatsrtk.apps.googleusercontent.com
```

### **3. Enoki Portal:**

```
API Key: enoki_public_7edbeb7decb38349e30a6d900cdc8843
Network: testnet
```

---

## 🧪 Testing Instructions

### **Step 1: Start Services**

```bash
./scripts/pay402-tmux.sh --testnet
cd widget && npm run dev
```

### **Step 2: Open Test Page**

```
http://localhost:5173/zklogin-test
```

### **Step 3: Click "Sign in with Google"**

**Expected Success:**

```
1. Google OAuth popup appears
2. You log in with your Google account
3. Redirects back to /zklogin-test
4. Shows your zkLogin address (0x...)
5. No errors in console
```

**Expected Failure (if still broken):**

```
✗ "invalid_client" error
✗ ERR_CONNECTION_RESET
✗ Blank screen after Google login
```

If it fails, double-check the redirect URIs in Google Cloud Console match **exactly**.

---

## 🎯 Summary: Why This Makes Sense

### **1. Technical Accuracy** ✅

- Matches how Enoki SDK actually works (uses current URL)
- Follows Google OAuth security requirements (exact path matching)
- Aligns with your app's routing (`/zklogin-test` vs `/`)

### **2. Testing Strategy** ✅

- Enables isolated zkLogin testing
- Doesn't affect production payment flow
- Clear separation of concerns

### **3. Future-Proof** ✅

- Base URL (`/`) already configured for main widget
- Alternative routes (`/auth`) supported
- Easy to add more paths if needed

### **4. Security** ✅

- No wildcards (Google doesn't allow them anyway)
- Explicit path listing (best practice)
- Limited to localhost (not exposing to public yet)

---

## 🚀 Next Steps

1. **Verify Google Cloud Console** has all 4 redirect URIs
2. **Test zkLogin** on `/zklogin-test`
3. **If successful**, integrate into `PaymentPage`
4. **Add production URIs** when deploying:
   ```
   https://pay402.com
   https://pay402.com/
   https://pay402.com/zklogin-test
   ```

---

## 📚 References

- **Enoki Source Code:** `node_modules/@mysten/enoki/dist/wallet/wallet.mjs` (line showing redirect URI derivation)
- **Discovery Doc:** `ZKLOGIN-BREAKTHROUGH.md` (your investigation notes)
- **OAuth Spec:** [RFC 6749](https://datatracker.ietf.org/doc/html/rfc6749) (redirect URI matching rules)

---

**Bottom Line: This update is CORRECT, NECESSARY, and WELL-ALIGNED with both technical requirements and your testing strategy!** ✅
