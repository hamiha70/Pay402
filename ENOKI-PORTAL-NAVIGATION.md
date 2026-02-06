# Enoki Portal Navigation Guide

**Issue**: Cannot find where to add redirect URL in Enoki portal

**Update**: Based on research, Enoki may handle redirects automatically for basic zkLogin. Let's try alternative approaches.

---

## Option 1: Enoki May Not Require Manual Redirect Configuration

### Why the "Failed to fetch" Error Might Be Different

The error might NOT be about redirect URLs. It could be:

1. **API Key Permissions**: Key might not have zkLogin enabled
2. **Network Issue**: Temporary Enoki service issue
3. **Browser CORS**: Browser blocking the request
4. **API Key Format**: Wrong key type or corrupted

### Test: Check Browser Console

1. Open browser DevTools (F12)
2. Go to "Console" tab
3. Click "Sign in with Google"
4. Look for the actual error message

**Common errors**:

```
CORS error → Browser blocking request
401 Unauthorized → API key issue
404 Not Found → Wrong endpoint
Network error → Connectivity issue
```

---

## Option 2: Look for These Sections in Enoki Portal

When you're in https://portal.enoki.mystenlabs.com:

### Possible Locations (Check Each)

1. **App Settings**

   - Click your app name
   - Look for "Settings" or "Configuration"
   - Check for "OAuth" or "Redirect URLs"

2. **Enoki Connect** (Side Panel)

   - Left sidebar → "Enoki Connect"
   - Click "Enable" if not enabled
   - Look for redirect URL fields

3. **API Keys Section**

   - Where you got your public key
   - Check if there are additional settings per key
   - Look for "Allowed Origins" or "CORS"

4. **zkLogin Configuration**

   - Look for "zkLogin" menu item
   - Check for provider settings
   - Look for redirect configuration

5. **OAuth Providers**
   - Look for "Providers" or "Authentication"
   - Check Google OAuth settings
   - Look for callback URL fields

---

## Option 3: Try Without Redirect Configuration

### Theory: Enoki Handles It Automatically

Based on the documentation, Enoki might use its own redirect mechanism:

```
Your App → Google OAuth → Enoki's Callback → Your App
```

Instead of:

```
Your App → Google OAuth → Your App Directly
```

### Test This

Let's modify the code to see the actual error:

**Action**: Check what URL Enoki is trying to create

---

## Option 4: Use Google OAuth Directly (Workaround)

If Enoki portal is confusing, we can configure Google OAuth ourselves:

### Steps:

1. **Go to Google Cloud Console**

   - https://console.cloud.google.com

2. **Create OAuth Credentials**

   - APIs & Services → Credentials
   - Create OAuth 2.0 Client ID
   - Application type: Web application

3. **Add Redirect URI**

   - Add: `http://localhost:5173/auth`
   - Save

4. **Get Client ID**

   - Copy the Client ID

5. **Add to .env.local**
   ```env
   VITE_GOOGLE_CLIENT_ID=your_google_client_id_here
   ```

This gives you more control over the OAuth flow.

---

## What I Found in Documentation

### From Enoki Docs:

**Enoki Connect** (advanced feature):

- Requires enabling in portal
- Uses format: `https://[YOUR_APP_SLUG].connect.enoki.mystenlabs.com/auth/callback`
- This is for cross-app wallet sharing

**Basic zkLogin** (what we're using):

- May not require manual redirect configuration
- Enoki SDK handles OAuth flow
- Redirect might be managed by Enoki service

---

## Immediate Actions to Try

### Action 1: Check Browser Console (Most Important!)

```bash
1. Open http://localhost:5173/zklogin-test
2. Press F12 (DevTools)
3. Go to "Console" tab
4. Click "Sign in with Google"
5. Read the ACTUAL error message
```

**Tell me what you see!** The real error might be different from "Failed to fetch"

### Action 2: Try Different Browser

Sometimes CORS issues are browser-specific:

- Try Chrome (if using Firefox)
- Try Firefox (if using Chrome)
- Try Incognito/Private mode

### Action 3: Check Enoki Service Status

The service might be temporarily down:

- Try again in 5 minutes
- Check if others are having issues

---

## Screenshot Request

If possible, take screenshots of:

1. **Enoki Portal Dashboard**

   - Main page after login
   - Show available menu items

2. **Your App Settings**

   - Click your app
   - Show what options appear

3. **Browser Console Error**
   - The actual error message
   - Network tab showing failed request

This will help me guide you to the exact location!

---

## Alternative: Contact Enoki Support

If portal navigation is unclear:

**Enoki Support Channels**:

- Discord: Mysten Labs Discord (sui-dev channel)
- GitHub: https://github.com/MystenLabs/enoki
- Email: Check Enoki portal for support contact

**What to ask**:

> "Where do I configure OAuth redirect URLs for zkLogin in the Enoki portal? I need to add http://localhost:5173/auth for local development."

---

## My Recommendation

**Let's try this order**:

1. **First**: Check browser console for actual error (5 min)
2. **Second**: Try different browser/incognito (2 min)
3. **Third**: Set up Google OAuth directly (15 min)
4. **Fourth**: Contact Enoki support with screenshots (if needed)

**Most likely**: The browser console will show the real issue, and it might not be about redirect URLs at all!

---

## Next Step

**Tell me**:

1. What do you see in browser console when clicking "Sign in with Google"?
2. Can you share a screenshot of your Enoki portal dashboard?

This will help me give you the exact navigation steps! 🎯
