# Enoki Integration: Wrong Approach Analysis

**Critical Finding**: We're using the WRONG Enoki integration method!

---

## ❌ What We're Using (WRONG)

### Current Implementation

```typescript
// App.tsx
<EnokiFlowProvider apiKey={ENOKI_API_KEY}>
  <ZkLoginTest />
</EnokiFlowProvider>

// ZkLoginTest.tsx
const enokiFlow = useEnokiFlow();
const authUrl = await enokiFlow.createAuthorizationURL({...});
```

### Problems

1. ❌ `EnokiFlowProvider` is NOT in official docs
2. ❌ `useEnokiFlow` is NOT documented
3. ❌ `createAuthorizationURL` is NOT the standard approach
4. ❌ Requires manual OAuth flow handling
5. ❌ Requires Google Client ID setup
6. ❌ More complex than needed

---

## ✅ What We SHOULD Use (CORRECT)

### Official Recommended Approach

**Source**: https://docs.enoki.mystenlabs.com/ts-sdk/register

```typescript
// Step 1: Register Enoki Wallets
import { registerEnokiWallets } from "@mysten/enoki";

registerEnokiWallets({
  apiKey: "YOUR_PUBLIC_ENOKI_API_KEY",
  client: suiClient,
  network: "testnet",
  providers: {
    google: {
      clientId: "YOUR_GOOGLE_CLIENT_ID",
    },
  },
});

// Step 2: Use dapp-kit's ConnectButton
import { ConnectButton } from "@mysten/dapp-kit";

<ConnectButton />; // That's it!
```

### Benefits

1. ✅ Official documented approach
2. ✅ Uses standard Sui wallet interface
3. ✅ Automatic OAuth handling
4. ✅ Works with dapp-kit ecosystem
5. ✅ Simpler code
6. ✅ Better maintained

---

## 🔍 Key Differences

| Feature              | EnokiFlowProvider (Wrong) | registerEnokiWallets (Right) |
| -------------------- | ------------------------- | ---------------------------- |
| **Documentation**    | Not in docs               | Official docs                |
| **Complexity**       | Manual OAuth flow         | Automatic                    |
| **Integration**      | Custom implementation     | Standard wallet interface    |
| **UI**               | Build your own            | dapp-kit ConnectButton       |
| **Maintenance**      | Unknown                   | Officially supported         |
| **Google Client ID** | Required                  | Required                     |

---

## 📋 Do You Need Google Client ID?

### YES - For Both Approaches! ✅

**From official docs** (Step 3 in Examples):

> "Use the dashboard to add an auth provider and configure the Client ID value it provides."

**This means**:

1. ✅ Create Google OAuth credentials
2. ✅ Get Client ID from Google Cloud Console
3. ✅ Add to Enoki portal OR pass to `registerEnokiWallets`

### Where to Add Client ID

**Option A: Enoki Portal** (Screenshot #3 you showed)

- Go to: Pay402 → Auth Providers
- Click: "+ New Auth Provider"
- Select: Google
- Paste: Your Google Client ID
- Save

**Option B: Code** (Pass directly to registerEnokiWallets)

```typescript
providers: {
  google: {
    clientId: 'YOUR_GOOGLE_CLIENT_ID',
  },
}
```

**Recommendation**: Use Option A (portal) - cleaner, no code changes needed

---

## 🎯 Do You Need This for ALL OAuth Providers?

### YES! ✅

**For each provider you want to support**:

| Provider     | Need Client ID? | Where to Get It      |
| ------------ | --------------- | -------------------- |
| **Google**   | ✅ Yes          | Google Cloud Console |
| **Facebook** | ✅ Yes          | Facebook Developers  |
| **Twitch**   | ✅ Yes          | Twitch Developers    |
| **Apple**    | ✅ Yes          | Apple Developer      |

**Why?**

- OAuth requires YOUR app to be registered with each provider
- Each provider gives you a Client ID
- This identifies YOUR app to the OAuth provider

**For Pay402, you only need Google** (for now):

- Focus on Google OAuth first
- Add others later if needed

---

## 🚀 Recommended Migration Path

### Option 1: Switch to Official Approach (RECOMMENDED)

**Pros**:

- ✅ Official support
- ✅ Simpler code
- ✅ Better long-term
- ✅ Standard wallet interface

**Cons**:

- ⚠️ Need to rewrite zkLogin test page
- ⚠️ Still need Google Client ID

**Effort**: 30-60 minutes

### Option 2: Fix Current Approach

**Pros**:

- ✅ Less code changes
- ✅ Keep existing test page

**Cons**:

- ❌ Using undocumented API
- ❌ May break in future
- ❌ Still need Google Client ID

**Effort**: 15 minutes (just add Google Client ID)

---

## 💡 My Strong Recommendation

### Do Option 1: Switch to Official Approach

**Why?**

1. We're early in development
2. Official approach is simpler
3. Better for production
4. Properly documented
5. You need Google Client ID anyway!

**Steps**:

1. Get Google Client ID (15 min)
2. Add to Enoki portal (5 min)
3. Rewrite using `registerEnokiWallets` (30 min)
4. Test with `ConnectButton` (10 min)

**Total**: ~1 hour, but MUCH better foundation

---

## 📝 What About "Allowed Origins" in Portal?

### That's for CORS, Not OAuth! ✅

**From your screenshot #5** (Settings page):

```
Allowed Origins
Website origins that are permitted to access this Enoki App
(e.g., https://example.com)
```

**This is for**:

- ✅ API calls from your frontend to Enoki API
- ✅ CORS (Cross-Origin Resource Sharing)
- ✅ Security: Which domains can use your API key

**Add**: `http://localhost:5173` (for development)

**This is NOT**:

- ❌ OAuth redirect URLs
- ❌ Google OAuth configuration

---

## 🎯 Summary: What You Actually Need

### 1. Google OAuth Setup ✅

- Create OAuth credentials in Google Cloud Console
- Get Client ID
- Add redirect URI: `http://localhost:5173` (Google handles this)

### 2. Enoki Portal Setup ✅

- Add Google Client ID to Auth Providers (Screenshot #3)
- Add `http://localhost:5173` to Allowed Origins (Screenshot #5)

### 3. Code Changes ✅

- Switch from `EnokiFlowProvider` to `registerEnokiWallets`
- Use `ConnectButton` from dapp-kit
- Much simpler!

---

## ❓ Your Questions Answered

### Q: "Do I need to do this for all other OAuth providers?"

**A**: YES, for each provider you want to support. But for Pay402, **just Google is fine** for now.

### Q: "Is EnokiFlow the right thing?"

**A**: NO! It's not documented. Use `registerEnokiWallets` instead (official approach).

### Q: "Where do I configure redirect URLs?"

**A**:

- **Google OAuth redirects**: Google Cloud Console
- **Enoki CORS**: Enoki Portal → Settings → Allowed Origins
- **NOT in Enoki portal for OAuth redirects!**

---

## 🚀 Next Steps

**Immediate**:

1. Set up Google OAuth (15 min) - REQUIRED
2. Add Client ID to Enoki portal (5 min)
3. Add localhost to Allowed Origins (2 min)

**Then Choose**:

- **Option A**: Switch to official approach (1 hour, better)
- **Option B**: Keep current approach (15 min, works but not ideal)

**My vote**: Option A - do it right from the start!

---

## 📚 Official Sources

1. **Register Enoki Wallets**: https://docs.enoki.mystenlabs.com/ts-sdk/register
2. **Sign In with Enoki**: https://docs.enoki.mystenlabs.com/ts-sdk/sign-in
3. **Examples**: https://docs.enoki.mystenlabs.com/ts-sdk/examples

**Note**: `EnokiFlowProvider` is NOT mentioned in any official docs!

---

**Bottom Line**: We need to pivot to the official approach. The good news? It's actually simpler! 🎉
