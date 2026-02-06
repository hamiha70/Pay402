# zkLogin Error: "Failed to fetch"

**Error**: `Failed to fetch` when clicking "Sign in with Google"

**Status**: Common configuration issue - easy to fix!

---

## Root Cause

The error occurs because the **redirect URL is not configured** in the Enoki portal. Enoki needs to know which URLs are allowed to receive OAuth callbacks.

---

## Fix: Configure Redirect URL in Enoki Portal

### Step 1: Go to Enoki Portal

https://portal.enoki.mystenlabs.com

### Step 2: Select Your App

Click on your app in the dashboard

### Step 3: Find Redirect URL Settings

Look for one of these sections:

- "Redirect URLs"
- "OAuth Settings"
- "Allowed Origins"
- "App Settings"

### Step 4: Add Redirect URL

Add this exact URL:

```
http://localhost:5173/auth
```

**Important**:

- No trailing slash
- Must match exactly (http, not https)
- Port must match your dev server (usually 5173)

### Step 5: Save Changes

Click "Save" or "Update" in the portal

### Step 6: Test Again

1. Go back to http://localhost:5173/zklogin-test
2. Click "Sign in with Google"
3. Should now redirect to Google OAuth!

---

## Alternative: Check Network in Browser

If the error persists after adding redirect URL:

### Open Browser DevTools

1. Press F12 (or right-click → Inspect)
2. Go to "Network" tab
3. Click "Sign in with Google"
4. Look for failed requests

### Common Issues

#### Issue 1: CORS Error

```
Access to fetch at 'https://api.enoki.mystenlabs.com/...'
from origin 'http://localhost:5173' has been blocked by CORS
```

**Fix**: Add `http://localhost:5173` to allowed origins in Enoki portal

#### Issue 2: 404 Not Found

```
POST https://api.enoki.mystenlabs.com/v1/... 404 (Not Found)
```

**Fix**: Check API key is correct (public key, not private)

#### Issue 3: 401 Unauthorized

```
POST https://api.enoki.mystenlabs.com/v1/... 401 (Unauthorized)
```

**Fix**: API key is invalid or expired - generate new one

---

## Verify Configuration

After adding redirect URL, verify in the test page:

**Configuration Panel should show**:

```
✅ Network: testnet
✅ Enoki API key set: true
✅ Redirect URL: http://localhost:5173/auth
```

**Debug logs should show**:

```
[time] Starting sign in process...
[time] Creating authorization URL...
[time] Redirect URL: http://localhost:5173/auth
[time] Authorization URL created: https://accounts.google.com/...
[time] Redirecting to Google OAuth...
```

If you see "Failed to fetch" before "Authorization URL created", the issue is with Enoki API access.

---

## Still Not Working?

### Check These

1. **API Key Format**

   - Should start with `enoki_public_`
   - Not `enoki_private_`
   - No extra spaces or quotes

2. **Network Setting**

   - Must be `testnet` (not `localnet`)
   - Check `.env.local`: `VITE_SUI_NETWORK=testnet`

3. **Dev Server Restarted**

   - Stop: Ctrl+C
   - Start: `npm run dev`
   - Changes to `.env.local` require restart

4. **Browser Cache**

   - Hard refresh: Ctrl+Shift+R (Windows/Linux) or Cmd+Shift+R (Mac)
   - Or open in incognito/private window

5. **Enoki Service Status**
   - Check if Enoki is down: https://status.mystenlabs.com (if exists)
   - Try again in a few minutes

---

## Expected Success Flow

When working correctly:

1. Click "Sign in with Google"
2. Page redirects to `accounts.google.com`
3. Google OAuth consent screen appears
4. Authorize app
5. Redirect back to `http://localhost:5173/auth`
6. Enoki derives SUI address
7. Address displayed on test page

**Total time**: 5-10 seconds

---

## Next Steps After Success

Once sign-in works:

1. ✅ Screenshot the success state
2. ✅ Note your SUI address
3. ✅ Test "Check Balance" button
4. ✅ Let me know - we'll integrate into payment flow!

---

## Quick Reference

**Enoki Portal**: https://portal.enoki.mystenlabs.com  
**Redirect URL to add**: `http://localhost:5173/auth`  
**Test Page**: http://localhost:5173/zklogin-test

---

**Most likely fix**: Add redirect URL in Enoki portal, then retry! 🚀
