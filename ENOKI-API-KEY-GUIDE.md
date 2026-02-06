# Enoki API Key Guide: Public vs Private

**Quick Answer**: For zkLogin in the **frontend widget**, you need the **PUBLIC** API key.

---

## Key Types Explained

### Public API Key (enoki*public*...)

**Use Case**: Frontend applications, client-side code, publicly visible

**What it's for**:

- zkLogin OAuth flows (Google sign-in)
- Wallet registration in browser
- Client-side transaction signing
- User authentication flows

**Security**:

- Safe to expose in frontend code
- Safe to commit in .env.example templates
- Subject to rate limits (but sufficient for most apps)

**Where to use**:

- EnokiFlowProvider (React)
- registerEnokiWallets() function
- Frontend zkLogin integration

---

### Private API Key (enoki*private*...)

**Use Case**: Backend services, server-side code, never exposed

**What it's for**:

- Sponsored transactions (gas sponsorship)
- Backend transaction submission
- Higher rate limits
- Server-side operations

**Security**:

- NEVER expose in frontend code
- NEVER commit to git
- Only use in backend services
- Store in secure environment variables

**Where to use**:

- Backend facilitator (if sponsoring transactions via Enoki)
- Server-side APIs
- Batch operations

---

## For Pay402 Widget: Use PUBLIC Key

### Why Public Key?

Our zkLogin test page uses EnokiFlowProvider in the **frontend**:

```typescript
<EnokiFlowProvider apiKey={ENOKI_API_KEY}>
  <ZkLoginTest />
</EnokiFlowProvider>
```

This is **client-side code** running in the browser, so we need the **public key**.

### Official Documentation Confirms

From Enoki docs (Register Enoki Wallets):

```typescript
registerEnokiWallets({
  apiKey: "YOUR_PUBLIC_ENOKI_API_KEY", // PUBLIC key
  providers: {
    google: { clientId: "YOUR_GOOGLE_CLIENT_ID" },
  },
  client: suiClient,
  network: "testnet",
});
```

**Explicitly states**: YOUR_PUBLIC_ENOKI_API_KEY

---

## Configuration for Pay402

### Widget .env.local (Frontend)

```env
# Use PUBLIC key (safe to expose in frontend)
VITE_ENOKI_API_KEY=enoki_public_YOUR_KEY_HERE

# Network (zkLogin requires testnet)
VITE_SUI_NETWORK=testnet

# Facilitator URL
VITE_FACILITATOR_URL=http://localhost:3001
```

### Facilitator .env (Backend) - If Using Enoki Sponsorship

```env
# Use PRIVATE key (backend only, never expose)
ENOKI_PRIVATE_KEY=enoki_private_YOUR_KEY_HERE

# Note: We're NOT using Enoki for sponsorship currently
# We're using our own facilitator keypair for gas sponsorship
```

**Current Status**: We don't need the private key yet. Our facilitator sponsors gas using its own SUI keypair, not Enoki's sponsorship service.

---

## How to Get the Keys

### In Enoki Portal (https://portal.enoki.mystenlabs.com)

1. Sign in to Enoki Portal
2. Select or create your app
3. Go to **API Keys** section
4. You'll see two types:

```
Public API Keys
   enoki_public_abc123...
   Use in frontend

Private API Keys
   enoki_private_xyz789...
   Use in backend only
```

5. **Copy the PUBLIC key** for the widget

---

## What You Need Now

For zkLogin testing (Phase 2A):

- Public API Key - Copy from Enoki portal
- Private API Key - Not needed yet

### Action Item

1. Go to https://portal.enoki.mystenlabs.com
2. Find **Public API Keys** section
3. Copy the key that starts with enoki*public*
4. Paste into widget/.env.local:
   ```env
   VITE_ENOKI_API_KEY=enoki_public_YOUR_KEY_HERE
   ```

---

## Common Mistakes

### WRONG: Using Private Key in Frontend

```typescript
// DON'T DO THIS!
<EnokiFlowProvider apiKey="enoki_private_...">
```

**Why wrong**: Exposes private key in browser, security risk

### CORRECT: Public Key in Frontend

```typescript
// Frontend - CORRECT!
<EnokiFlowProvider apiKey="enoki_public_...">
  <ZkLoginTest />
</EnokiFlowProvider>
```

---

## Key Comparison Table

| Feature                | Public Key | Private Key |
| ---------------------- | ---------- | ----------- |
| Use in frontend        | Yes        | Never       |
| Use in backend         | Limited    | Yes         |
| zkLogin OAuth          | Yes        | No          |
| Sponsored transactions | No         | Yes         |
| Rate limits            | Standard   | Higher      |
| Safe to expose         | Yes        | Never       |

---

## Summary for Pay402

### Current Phase (Phase 2A - zkLogin Test)

**Need**: Public API key only

**Why**: Testing zkLogin OAuth flow in frontend

**Where**: widget/.env.local VITE_ENOKI_API_KEY

### Future Phases (Optional)

**Might need**: Private API key

**Why**: If we adopt Enoki's transaction sponsorship

**Where**: facilitator/.env ENOKI_PRIVATE_KEY (backend only)

---

## Action Item Resolution

**Your Question**: "Do we need the enoki_private or enoki_public key?"

**Answer**: **PUBLIC key** (enoki*public*...)

**Next Step**:

1. Go to Enoki portal
2. Copy **PUBLIC** API key
3. Add to widget/.env.local
4. Test zkLogin at http://localhost:5173/zklogin-test

---

**Ready to proceed!** Get the **public** key and continue with zkLogin testing.
