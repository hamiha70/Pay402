# Code Reference for Dan (Sui DevRel)

## GitHub Repository

**Public repo:** https://github.com/[YOUR_USERNAME]/[YOUR_REPO_NAME]

_(Replace with your actual GitHub username and repository name)_

---

## Key Files to Review

### 1. **App.tsx** - Main setup with SuiClientProvider and RegisterEnokiWallets

**Path:** `Pay402/widget/src/App.tsx`

**Key sections:**

- **Lines 14-19:** Network config (hardcoded URLs since `getFullnodeUrl` doesn't exist in `@mysten/sui@2.x`)
- **Lines 43-54:** Provider hierarchy (QueryClient → SuiClient → RegisterEnokiWallets → WalletProvider)

### 2. **RegisterEnokiWallets.tsx** - The component that calls registerEnokiWallets()

**Path:** `Pay402/widget/src/components/RegisterEnokiWallets.tsx`

**Key sections:**

- **Lines 40-49:** The exact `registerEnokiWallets()` call that succeeds but then fails on nonce fetch

### 3. **ZkLoginTest.tsx** - Test page where we trigger the sign-in

**Path:** `Pay402/widget/src/components/ZkLoginTest.tsx`

**Key sections:**

- **Line 123:** "Sign in with Google" button that triggers the error

### 4. **.env.local** - Our configuration

**Path:** `Pay402/widget/.env.local`

**Note:** You'll need to use your own keys to test

```env
VITE_ENOKI_API_KEY=enoki_public_7edbeb7decb38349e30a6d900cdc8843
VITE_GOOGLE_CLIENT_ID=300529773657-mfq7blj3s6ilhskpeva3fvutisa5sbej.apps.googleusercontent.com
VITE_SUI_NETWORK=testnet
```

---

## To Reproduce

```bash
cd Pay402/widget
npm install
npm run dev
# Navigate to http://localhost:5173/zklogin-test
# Click "Sign in with Google"
# See ERR_CONNECTION_RESET in console
```

---

## Console Output We See

```
[RegisterEnokiWallets] ✅ Registration successful
[ZkLoginTest] Wallets: { total: 1, enoki: 1, hasGoogle: true }

# User clicks "Sign in with Google"
❌ Failed to load resource: api.enoki.mystenlabs.com/v1/zklogin/nonce:1
   net::ERR_CONNECTION_RESET
```

---

## Implementation Notes

We followed the docs at https://docs.enoki.mystenlabs.com/ts-sdk/register line-by-line, except:

- **Workaround:** Used hardcoded URLs instead of `getFullnodeUrl()` because it doesn't exist in `@mysten/sui@2.1.0` (required by `@mysten/dapp-kit@1.0.1`)
- Our hardcoded URLs match exactly what `getFullnodeUrl()` would have returned in `@mysten/sui@1.x`

---

## Package Versions

```json
{
  "@mysten/enoki": "^1.0.1",
  "@mysten/dapp-kit": "^1.0.1",
  "@mysten/sui": "^2.1.0"
}
```
