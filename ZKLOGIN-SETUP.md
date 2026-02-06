# zkLogin Setup Guide (Official Approach)

Using official registerEnokiWallets + dapp-kit integration

Documentation: https://docs.enoki.mystenlabs.com/ts-sdk/register

---

## Quick Start (15 minutes)

### Step 1: Get Enoki API Key (5 min)

1. Visit https://portal.enoki.mystenlabs.com
2. Copy your PUBLIC API key (starts with enoki*public*)

### Step 2: Create Google OAuth (5 min)

1. Visit https://console.cloud.google.com
2. APIs & Services → Credentials
3. Create OAuth 2.0 Client ID
4. Type: Web application
5. Redirect URI: http://localhost:5173
6. Copy Client ID

### Step 3: Add to Enoki Portal (2 min)

1. portal.enoki.mystenlabs.com → Pay402
2. Auth Providers → Add Google
3. Paste Google Client ID
4. Save

### Step 4: Configure .env.local (2 min)

```env
VITE_ENOKI_API_KEY=enoki_public_YOUR_KEY
VITE_GOOGLE_CLIENT_ID=YOUR_ID.apps.googleusercontent.com
VITE_SUI_NETWORK=testnet
VITE_FACILITATOR_URL=http://localhost:3001
```

### Step 5: Test

```bash
cd widget
npm run dev
```

Open: http://localhost:5173/zklogin-test

---

## Architecture

```
App.tsx
  → RegisterEnokiWallets (registers wallets)
  → WalletProvider (makes wallets available)
  → ZkLoginTest (uses ConnectButton)
```

---

## Troubleshooting

### No wallets registered

- Check console for [Enoki] logs
- Must use testnet (not localnet)
- Restart dev server

### OAuth fails

- Verify Google Client ID in Enoki portal
- Check redirect URI in Google Console
- Try incognito mode

---

## Resources

- Enoki Docs: https://docs.enoki.mystenlabs.com/ts-sdk
- Enoki Portal: https://portal.enoki.mystenlabs.com
- Google Console: https://console.cloud.google.com
