# Pay402 Widget - Dual Auth System

Testing unified auth with automatic Enoki/keypair fallback.

## 🎯 Dual Auth Strategy

The widget automatically chooses the best auth method:

| Condition | Auth Method | Use Case |
|-----------|-------------|----------|
| ✅ Enoki API key set | **zkLogin (Enoki)** | Production, hackathon demo |
| ❌ No API key | **Keypair fallback** | Development, testing |

**Same interface, zero code changes needed!**

## 🚀 Quick Start

### Option 1: Keypair Mode (No Setup Required)

```bash
cd Pay402/widget
npm install
npm run dev
```

Open http://localhost:5173 and click "Generate Demo Wallet" ✅

### Option 2: Enoki Mode (When API Key Available)

1. Get Enoki API key from [Enoki Portal](https://portal.enoki.mystenlabs.com)
2. Configure:
```bash
cp .env.local.example .env.local
# Edit .env.local:
# VITE_ENOKI_API_KEY=enoki_public_xxxxx
```
3. Restart dev server:
```bash
npm run dev
```

Open http://localhost:5173 and click "Sign in with Google" 🔐

## 📋 What This Tests

### ✅ Auth Abstraction
- Unified `useAuth()` hook
- Automatic provider selection
- Same interface for both methods

### ✅ Keypair Fallback (Dev)
- Generates Ed25519 keypair
- Stores in localStorage
- Signs transactions locally
- **Perfect for building PTB verifier without Enoki dependency**

### ✅ Enoki Integration (Production)
- Google OAuth flow
- Deterministic address derivation
- zkLogin signatures
- **Ready for hackathon demo**

### ✅ Balance & Funding
- Works with any auth provider
- Checks SUI balance
- Calls facilitator `/fund` endpoint
- Updates balance after funding

## 🏗️ Architecture

```
┌─────────────────────────────────────────────┐
│ App.tsx                                     │
│  ├─ Check VITE_ENOKI_API_KEY               │
│  ├─ If set: wrap in EnokiFlowProvider      │
│  └─ If not: skip Enoki wrapper             │
└─────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────┐
│ useAuth() hook                              │
│  ├─ Check VITE_ENOKI_API_KEY               │
│  ├─ If set: return useEnokiAuth()          │
│  └─ If not: return useKeypairAuth()        │
└─────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────┐
│ AuthTest component                          │
│  └─ Uses auth.signIn(), auth.address, etc. │
│     (doesn't care which provider!)          │
└─────────────────────────────────────────────┘
```

## 🔑 Auth Provider Interface

Both providers implement the same interface:

```typescript
interface AuthProvider {
  isConnected: boolean;
  address: string | null;
  method: 'enoki' | 'keypair';
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
  signTransaction: (tx: Transaction) => Promise<{
    signature: string;
    transactionBytes: string;
  }>;
}
```

## 🧪 Testing Flows

### Flow 1: Keypair (No Enoki)

1. ✅ Start dev server (no Enoki key)
2. ✅ See "Running in Keypair Mode" banner
3. ✅ Click "Generate Demo Wallet"
4. ✅ See SUI address (starts with `0x`)
5. ✅ Check balance (0 SUI initially)
6. ✅ Fund wallet (2 SUI from facilitator)
7. ✅ Balance updates to 2 SUI
8. ✅ See "Ready for Payments!"

### Flow 2: Enoki (With API Key)

1. ✅ Add Enoki API key to `.env.local`
2. ✅ Restart dev server
3. ✅ See "Running in Enoki Mode" banner
4. ✅ Click "Sign in with Google"
5. ✅ Complete OAuth flow
6. ✅ See deterministic SUI address
7. ✅ Check balance
8. ✅ Fund wallet
9. ✅ See "Ready for Payments!"

### Flow 3: Switching Between Modes

```bash
# Start with keypair
npm run dev

# Add Enoki key
echo 'VITE_ENOKI_API_KEY=enoki_public_xxx' >> .env.local

# Restart → automatically uses Enoki
npm run dev
```

**No code changes needed!**

## 📁 File Structure

```
widget/
├── src/
│   ├── types/
│   │   └── auth.ts              # Shared types
│   ├── hooks/
│   │   ├── useAuth.ts           # Main hook (chooses provider)
│   │   ├── useEnokiAuth.ts      # Enoki implementation
│   │   ├── useKeypairAuth.ts    # Keypair implementation
│   │   └── useBalance.ts        # Balance & funding
│   ├── components/
│   │   └── AuthTest.tsx         # Test UI
│   ├── App.tsx                  # Conditional Enoki wrapper
│   └── main.tsx
├── .env.local.example
└── README.md
```

## 🎯 Benefits

### For Development (Now)
- ✅ **Unblocked** - Can build without Enoki
- ✅ **Fast** - No OAuth flow delays
- ✅ **Simple** - Just localStorage
- ✅ **Testable** - Easy to reset (clear browser data)

### For Hackathon (Later)
- ✅ **Production-ready** - Just add API key
- ✅ **Zero refactoring** - Same interface
- ✅ **Impressive** - "Sign in with Google" → wallet
- ✅ **Seamless** - Judges see the full UX

### For Future
- ✅ **Flexible** - Can switch providers anytime
- ✅ **Maintainable** - Clean abstraction
- ✅ **Extensible** - Easy to add more providers

## 🐛 Troubleshooting

**"Enoki not initialized" error**
→ API key is set but invalid/expired. Check Enoki Portal.

**Keypair not persisting**
→ Check browser localStorage isn't disabled. Try incognito mode.

**Funding fails**
→ Make sure facilitator is running (`npm run dev` in `facilitator/`)

**"Network mismatch" error**
→ Enoki uses testnet, facilitator might be on localnet. Check `.env`

## 🚀 Next Steps

Once auth works:
1. ✅ Build PTB verifier (`widget/src/verifier.ts`)
2. ✅ Create demo merchant (`demo/`)
3. ✅ Integrate payment flow
4. ✅ Add Enoki when API key available (zero refactoring!)

---

**Status:** ✅ Ready to test  
**Auth:** Dual mode (Enoki + Keypair)  
**Blocked:** No - can build with keypair fallback
