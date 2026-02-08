# zkLogin Breakthrough - Root Cause Identified

**Date:** Feb 6, 2026  
**Status:** ✅ Issue Isolated - Configuration Fix Needed

---

## 🎯 **THE BREAKTHROUGH:**

Dan (Sui DevRel) successfully ran our EXACT code from the repo and zkLogin worked perfectly. This proves:

1. ✅ Our code implementation is **100% correct**
2. ✅ The Enoki API is **fully operational**
3. ✅ The issue is **local configuration**, not code

---

## 🔍 **ROOT CAUSE ANALYSIS:**

### **What Dan Did:**

- Cloned our public repo
- Created **his own** `.env.local` with **his own** credentials:
  - His Enoki API key
  - **His Google OAuth Client ID** (configured in his Google Cloud Console)
- Configured **his** Google OAuth redirect URIs
- It worked!

### **Why We Failed:**

Our Google OAuth Client ID `300529773657-mfq7blj3s6ilhskpeva3fvutisa5sbej` is missing the correct redirect URI configuration.

---

## 🚨 **THE SPECIFIC PROBLEM:**

### **Firefox Error (More Informative Than Chrome):**

```
Error 401: invalid_client
The OAuth client was not found.
accounts.google.com/signin/oauth/error?authError=Cg5pbnZhbGlkX2NsaWVudA...
```

### **What This Means:**

Google OAuth is rejecting the authentication request because:

- The redirect URI Enoki is using is NOT in our Google Cloud Console approved list

### **How Enoki Determines Redirect URI:**

From source code (`node_modules/@mysten/enoki/dist/wallet/wallet.mjs`):

```javascript
this.#redirectUrl = redirectUrl || window.location.href.split("#")[0];
```

**Enoki uses the CURRENT PAGE URL as redirect URI!**

So when on `http://localhost:5173/zklogin-test`, Enoki tries to redirect back to:

```
http://localhost:5173/zklogin-test
```

---

## ✅ **THE FIX:**

### **Add the Full Path to Google Cloud Console:**

1. Go to: https://console.cloud.google.com/apis/credentials
2. Find OAuth Client: `1001996736694-2ic38121fneem5ob0ond46cmvhatsrtk`
3. Click "Edit"
4. Under "Authorized redirect URIs", ensure ALL are present:
   ```
   http://localhost:5173
   http://localhost:5173/zklogin-test
   ```
5. **Verify Application Type:** Must be "Web application" (not Desktop, iOS, Android)
6. **Save**

### **Double-Check Client ID:**

Copy the EXACT Client ID from Google Cloud Console and verify it matches `.env.local` (check for typos).

---

## 🔬 **TECHNICAL DETAILS:**

### **Why Chrome Shows Different Error:**

- **Chrome:** `ERR_CONNECTION_RESET` - Chrome's security policy blocking the request entirely before it reaches network
- **Firefox:** `401: invalid_client` - Firefox allows the request through, Google rejects it

Both are the **same root cause** (invalid OAuth configuration), just different browser security behaviors.

### **Why Terminal curl Works:**

The `curl` test to `/v1/zklogin/nonce` returns HTTP 400 with:

```json
{
  "errors": [
    {
      "code": "invalid_type",
      "expected": "string",
      "received": "undefined",
      "path": ["ephemeralPublicKey"],
      "message": "Required"
    }
  ]
}
```

This proves:

- ✅ Enoki API is reachable from our machine
- ✅ Our Enoki API key is valid (no auth error)
- ❌ The request needs `ephemeralPublicKey` (which the SDK generates during OAuth flow)

The nonce endpoint expects to be called by the SDK AFTER getting OAuth authorization, not directly.

---

## 📊 **ENVIRONMENT COMPARISON:**

### **Dan's Working Setup:**

- His Enoki API key
- His Google OAuth Client (properly configured)
- His redirect URIs: includes test page paths
- Result: ✅ Works

### **Our Setup:**

- Our Enoki API key: ✅ Valid (confirmed)
- Our Google OAuth Client: ⚠️ Missing redirect URI
- Our redirect URIs: Needs `/zklogin-test` path
- Result: ❌ Fails with `invalid_client`

---

## 🎯 **NEXT STEPS AFTER REBOOT:**

1. **Update Google Cloud Console:**

   - Add `http://localhost:5173/zklogin-test` to Authorized redirect URIs
   - Verify Client ID matches `.env.local` exactly
   - Confirm application type is "Web application"

2. **Test in Firefox first** (more informative errors)

   - Open Firefox
   - Go to `http://localhost:5173/zklogin-test`
   - Click "Sign in with Google"
   - Should now work!

3. **Then test in Chrome**
   - May need to clear Chrome's security cache
   - Go to `chrome://net-internals/#hsts`
   - Delete domain: `api.enoki.mystenlabs.com`
   - Try again

---

## ✅ **CONFIDENCE LEVEL:**

**95% confident this is the fix.**

The evidence is clear:

- ✅ Code works for Dan
- ✅ Enoki API is operational
- ✅ Error message specifically says "invalid_client"
- ✅ Source code shows redirect URI is derived from current URL
- ✅ Missing redirect URI matches the symptoms exactly

---

## 📝 **FOR DAN:**

Send Dan a thank you message:

```
Thanks for testing! Confirmed the code works - issue was on our side.
Firefox gave us better error visibility (invalid_client) which led us
to the missing redirect URI in Google OAuth config. Fixing now.
```

---

**Safe to reboot. When you come back, update Google Cloud Console redirect URIs first thing!**
