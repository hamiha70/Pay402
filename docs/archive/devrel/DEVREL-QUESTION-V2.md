# zkLogin/Enoki Implementation Question for Dan (Sui DevRel)

## Issue Summary

We're implementing zkLogin using `@mysten/enoki@1.0.1` with the `registerEnokiWallets()` approach following the official docs (https://docs.enoki.mystenlabs.com/ts-sdk/register). All configuration is verified correct (API keys, Google OAuth, CORS), and `registerEnokiWallets()` executes successfully. However, when users click "Sign in with Google," the Enoki SDK attempts to fetch `https://api.enoki.mystenlabs.com/v1/zklogin/nonce` which returns **HTTP 404**.

## Evidence

### Direct API Test

```bash
$ curl -I https://api.enoki.mystenlabs.com/v1/zklogin/nonce
HTTP/2 404
date: Fri, 06 Feb 2026 07:12:58 GMT
content-type: application/json
```

### Browser Console Output

```
[RegisterEnokiWallets] Effect running: {network: 'testnet'}
[RegisterEnokiWallets] Config: {
  apiKey: 'enoki_public_7edbeb7...',
  clientId: '300529773657-mfq7b...',
  network: 'testnet'
}
[RegisterEnokiWallets] Calling registerEnokiWallets...
[RegisterEnokiWallets] ✅ Registration successful

[ZkLoginTest] Wallets: {
  total: 1,
  enoki: 1,
  hasGoogle: true
}

# User clicks "Sign in with Google"
❌ Failed to load resource: api.enoki.mystenlabs.com/v1/zklogin/nonce:1
   net::ERR_CONNECTION_RESET
```

## Our Setup (Verified Correct)

### Package Versions

```json
{
  "@mysten/enoki": "1.0.1",
  "@mysten/dapp-kit": "1.0.1",
  "@mysten/sui": "2.1.0"
}
```

### Enoki Portal Configuration

- ✅ Public API key active (zkLogin enabled for testnet)
- ✅ Google OAuth provider configured with Client ID
- ✅ Allowed Origins: `http://localhost:5173`
- ✅ Network: TESTNET enabled

### Google Cloud Console

- ✅ OAuth 2.0 Client ID created
- ✅ Authorized redirect URIs: `http://localhost:5173`, `http://localhost:5173/`
- ✅ Client ID matches Enoki portal (`1001996736694-2ic38121fneem5ob0ond46cmvhatsrtk.apps.googleusercontent.com`)

### Implementation

- ✅ Follows official docs line-by-line: https://docs.enoki.mystenlabs.com/ts-sdk/register#react-integration
- ✅ `RegisterEnokiWallets` component rendered before `WalletProvider`
- ✅ Uses `useSuiClientContext()` to get `client` and `network`
- ✅ Checks `isEnokiNetwork(network)` before registration
- ✅ Passes `client`, `network`, `apiKey`, and `providers` to `registerEnokiWallets()`
- ⚠️ Worked around missing `getFullnodeUrl` in `@mysten/sui@2.x` by using hardcoded URLs (same values)

## Working vs Non-Working Examples

| Approach                               | Version               | Status                                                       |
| -------------------------------------- | --------------------- | ------------------------------------------------------------ |
| `EnokiFlowProvider` + `useEnokiFlow()` | `@mysten/enoki@0.2.7` | ✅ Works (see: https://github.com/saajand/sui-zklogin-enoki) |
| `registerEnokiWallets()`               | `@mysten/enoki@1.0.1` | ❌ 404 on `/v1/zklogin/nonce`                                |

**Note:** The working example uses deprecated APIs (marked `@deprecated` in v1.0.1 type definitions)

## Questions

1. **Is the `/v1/zklogin/nonce` endpoint operational on testnet for `@mysten/enoki@1.0.1`?**

   - Our curl tests show it returns 404
   - Is this a known issue or expected behavior?

2. **Version migration issue?**

   - Is there a breaking change between v0.2.7 → v1.0.1?
   - Are the docs ahead of the actual API deployment?

3. **Workaround for HackMoney?**

   - Should we temporarily downgrade to `@mysten/enoki@0.2.7` and use deprecated `EnokiFlowProvider`?
   - Or is there a fix coming soon we can wait for?

4. **Timeline consideration:**
   - HackMoney submission deadline: Feb 9, 2026
   - What's your recommended path forward?

## Additional Info

- **Happy to provide:**
  - Full code repository access
  - Screen recordings of the flow
  - Additional debugging output
- **We've also discovered:**

  - The official docs show `import { getFullnodeUrl } from '@mysten/sui/client'` but this doesn't exist in `@mysten/sui@2.x` (only in v1.x)
  - This suggests the docs may be outdated for current package versions

- **Our workaround:**
  - Using hardcoded URLs instead: `https://fullnode.testnet.sui.io:443`
  - These match what `getFullnodeUrl('testnet')` would have returned in v1.x

## Request

We're eager to make zkLogin work for our HackMoney demo. Any guidance on whether to:

- Wait for API fix
- Use deprecated approach temporarily
- Try alternative implementation

Thank you!
