# Pay402 Widget - zkLogin Test

Testing Enoki zkLogin integration and funding flow.

## Setup

### 1. Get Enoki API Key

1. Visit [Enoki Portal](https://portal.enoki.mystenlabs.com)
2. Create a new app or select existing
3. Create a **PUBLIC** API key with:
   - zkLogin enabled
   - Testnet network enabled
4. Configure Google OAuth provider:
   - Add your Client ID
   - Set redirect URL to `http://localhost:5173` (for dev)

### 2. Configure Environment

```bash
cp .env.local.example .env.local
# Edit .env.local and add your VITE_ENOKI_API_KEY
```

### 3. Install Dependencies

```bash
npm install
```

### 4. Start Dev Server

```bash
npm run dev
```

Open http://localhost:5173

## What This Tests

✅ **zkLogin Integration**
- Sign in with Google OAuth
- Derive deterministic SUI address
- Same account = same address (cross-session, cross-device)

✅ **Balance Checking**
- Query SUI and USDC balances via RPC
- Display formatted balances

✅ **Funding Flow**
- Auto-detect empty wallet
- Call facilitator `/fund` endpoint
- Idempotent funding (one per session)
- Verify balance update

## Architecture

```
┌─────────────────────────────────────────────┐
│ Browser (localhost:5173)                    │
│                                             │
│ ┌─────────────────────────────────────────┐ │
│ │ EnokiFlowProvider                       │ │
│ │  ├─ Google OAuth                        │ │
│ │  ├─ Address Derivation                  │ │
│ │  └─ Session Management                  │ │
│ └─────────────────────────────────────────┘ │
│                                             │
│ ┌─────────────────────────────────────────┐ │
│ │ ZkLoginTest Component                   │ │
│ │  ├─ Sign in button                      │ │
│ │  ├─ Balance check (RPC)                 │ │
│ │  └─ Fund button (→ facilitator)         │ │
│ └─────────────────────────────────────────┘ │
└─────────────────────────────────────────────┘
                    ↓
        ┌───────────────────────┐
        │ Facilitator (:3001)   │
        │  POST /fund           │
        │   └─ Transfer 2 SUI   │
        └───────────────────────┘
                    ↓
        ┌───────────────────────┐
        │ SUI Testnet RPC       │
        │  (via Enoki)          │
        └───────────────────────┘
```

## Success Criteria

- ✅ Can sign in with Google
- ✅ See consistent address across sessions
- ✅ Can check balance (0 initially)
- ✅ Can fund wallet (2 SUI)
- ✅ Balance updates correctly

## Next Steps

Once this works:
1. Build PTB Verifier
2. Create Demo Merchant
3. Integrate full payment flow

## Dependencies

- `@mysten/enoki` - zkLogin SDK
- `@mysten/sui` - SUI SDK
- `@mysten/dapp-kit` - Wallet integration
- `@tanstack/react-query` - State management
- React 19 + TypeScript + Vite

## Troubleshooting

**"API key required" error**
→ Make sure `.env.local` exists with valid `VITE_ENOKI_API_KEY`

**OAuth redirect fails**
→ Check Enoki Portal: redirect URL must match `http://localhost:5173`

**Balance always 0**
→ Make sure facilitator is running (`npm run dev` in `facilitator/`)

**Funding fails**
→ Check facilitator has SUI balance (use `lsui client faucet`)
