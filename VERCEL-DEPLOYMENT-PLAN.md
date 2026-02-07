# Vercel Deployment Plan - Pay402 Hackathon Demo

**Status:** Ready for deployment (with critical fixes needed)  
**Timeline:** 12 hours available  
**Risk Level:** MEDIUM (manageable with clear plan)  
**Target:** Vercel Free Tier  

---

## Executive Summary

**VERDICT: YES, Vercel deployment is feasible BUT requires specific fixes first.**

### Critical Issues Identified

1. ❌ **BLOCKER:** Cross-component imports will break (`caip.ts` duplication, widget import in facilitator test)
2. ⚠️ **RISK:** 10-second timeout potential (needs submit+poll pattern)
3. ⚠️ **VERIFICATION NEEDED:** True stateless operation (no in-memory state)
4. ✅ **GOOD:** Architecture fundamentally compatible with Vercel
5. ✅ **GOOD:** No WebSocket, no persistent connections, REST-only

---

## Question 1: Do We Meet Vercel Constraints?

### ✅ **YES - With Modifications**

| Constraint | Status | Notes |
|------------|--------|-------|
| **Stateless execution** | ✅ LIKELY | Need to verify no `Map`/`Set`/cache in facilitator |
| **REST-only (no WebSocket)** | ✅ YES | Confirmed from code review |
| **≤10s function timeout** | ⚠️ RISK | You mentioned "up to 10s wait" - **dangerous** |
| **No cross-root imports** | ❌ **BLOCKER** | `e2e-payment.test.ts` imports from widget |
| **Environment variables** | ✅ YES | Already using `.env` files |
| **Vite builds** | ✅ YES | All 3 components use Vite/compatible |
| **Sui RPC outbound** | ✅ YES | HTTPS calls, no special network needed |

### 🚨 **Critical Fixes Required BEFORE Deploy:**

1. **Fix cross-component imports** (see Phase 1)
2. **Implement submit+poll pattern** (avoid timeouts)
3. **Verify stateless operation** (grep for state)
4. **Add health checks** (for debugging)

---

## Question 2: Target Vercel Deployment Structure

### **Recommended Structure: 3 Separate Vercel Projects**

```
GitHub Repo: Pay402/
├── facilitator/        → Vercel Project 1: "pay402-facilitator"
├── merchant/           → Vercel Project 2: "pay402-merchant"  
├── widget/             → Vercel Project 3: "pay402-widget"
└── [other files...]    → Not deployed
```

### Why 3 Projects?

✅ **Pros:**
- Clean separation of concerns
- Independent deployments (if one breaks, others work)
- Clear environment variable scoping
- Matches your localhost architecture (3 ports → 3 projects)
- No monorepo complexity needed for hackathon

❌ **Alternative (Not Recommended):** 
- Single project with multi-zone routing - MORE COMPLEX, no benefit

### Domain Structure

```
widget.pay402demo.com       → Widget UI (buyer-facing)
merchant.pay402demo.com     → Merchant UI (demo site)
facilitator.pay402demo.com  → Facilitator API (backend)
```

Or use Vercel's free `.vercel.app` domains:
```
pay402-widget.vercel.app
pay402-merchant.vercel.app
pay402-facilitator.vercel.app
```

---

## Question 3: Vercel Configuration Details

### **3.1 Web UI Setup (per project)**

#### Project 1: Facilitator API

```yaml
Name: pay402-facilitator
Framework Preset: Vite
Root Directory: facilitator
Build Command: npm run build
Output Directory: dist
Install Command: npm install

Environment Variables (Production):
- SUI_NETWORK=testnet
- PACKAGE_ID=0x... (your deployed contract)
- USDC_TYPE=0x... (Circle USDC on testnet)
- FACILITATOR_PRIVATE_KEY=suiprivkey... (your key)
- PORT=3000 (Vercel uses this internally)
- NODE_ENV=production
```

**⚠️ IMPORTANT:** Facilitator runs as **Serverless Functions**, not as Express app directly.
- Vercel will automatically detect API routes in `src/controllers/`
- You may need to create `api/` folder with route handlers

#### Project 2: Merchant UI

```yaml
Name: pay402-merchant
Framework Preset: Other
Root Directory: merchant
Build Command: echo "Static serving" (merchant uses public/index.html)
Output Directory: public
Install Command: npm install

Environment Variables:
- MERCHANT_PRIVATE_KEY=... (for JWT signing)
- FACILITATOR_URL=https://facilitator.pay402demo.com
- NODE_ENV=production
```

#### Project 3: Widget UI

```yaml
Name: pay402-widget  
Framework Preset: Vite
Root Directory: widget
Build Command: npm run build
Output Directory: dist
Install Command: npm install

Environment Variables:
- VITE_FACILITATOR_URL=https://facilitator.pay402demo.com
- VITE_MERCHANT_URL=https://merchant.pay402demo.com
- VITE_GOOGLE_CLIENT_ID=... (your OAuth client)
- VITE_ENOKI_PUBLIC_KEY=... (your Enoki key)
```

### **3.2 Vercel CLI (Recommended)**

**Install:**
```bash
npm install -g vercel
vercel login
```

**Deploy from each directory:**
```bash
# Deploy facilitator
cd facilitator
vercel --prod

# Deploy merchant
cd ../merchant
vercel --prod

# Deploy widget
cd ../widget
vercel --prod
```

### **3.3 GitHub Integration**

**Setup:**
1. Go to https://vercel.com/new
2. Import Git Repository → Connect to your GitHub repo
3. Create 3 separate imports (one for each root directory)
4. Vercel will auto-deploy on every push to `main`

**Branch Protection:**
- Create `vercel-deploy` branch for deployment testing
- Keep `main` as working codebase
- Merge to `main` only when Vercel deploy confirmed

---

## Question 4: Detailed Action Plan

### **Phase 0: Preparation (30 min)**

**Create deployment branch:**
```bash
git checkout -b vercel-deploy
git push -u origin vercel-deploy
```

**Verify prerequisites:**
- [ ] Enoki API keys ready
- [ ] Google OAuth client configured
- [ ] Sui testnet contract deployed
- [ ] Circle USDC testnet address known

### **Phase 1: Fix Code Blockers (2-3 hours)**

#### Fix 1: Remove Cross-Component Imports

**Problem:** `facilitator/src/__tests__/e2e-payment.test.ts` imports from widget

**Solution Options:**

**Option A - Skip Test (FASTEST):**
```bash
# Comment out the problematic import in e2e-payment.test.ts
# Or add to .vercelignore: __tests__
```

**Option B - Copy Function (CLEANER):**
```bash
# Copy widget/src/lib/pay402-client.ts → facilitator/src/utils/
# Update test import
```

**Recommendation:** Option A for hackathon (test doesn't need to run in production)

#### Fix 2: Ensure CAIP Utils Are Self-Contained

**Current state:** `caip.ts` duplicated (GOOD! No action needed)

**Verify:** Both files are identical and have no external dependencies
```bash
diff facilitator/src/utils/caip.ts widget/src/lib/caip.ts
# Should show identical files
```

#### Fix 3: Add Submit+Poll Pattern

**Problem:** Current code may block for 10s (timeout risk)

**Solution:** Modify facilitator API:

```typescript
// NEW endpoint: POST /api/submit-payment
// Returns immediately with transaction digest
{
  "digest": "ABC123...",
  "status": "pending"
}

// NEW endpoint: GET /api/payment-status/:digest
// Client polls this
{
  "digest": "ABC123...",
  "status": "confirmed" | "pending" | "failed",
  "result": { ... }
}
```

**Where to add:**
- `facilitator/src/controllers/submit-payment.ts` (already exists!)
- Add new `facilitator/src/controllers/payment-status.ts`
- Update widget to poll instead of waiting

**Time estimate:** 1-2 hours (critical for reliability)

#### Fix 4: Verify Statelessness

**Check for state:**
```bash
cd facilitator/src
grep -r "new Map" .
grep -r "new Set" .
grep -r "cache" .
grep -r "this\." ./controllers/  # Check for class instance state
```

**Expected:** No results (confirming stateless)

**If found:** Either remove OR accept risk (store in external Redis - overkill for demo)

### **Phase 2: Prepare for Vercel (1 hour)**

#### Add Vercel Configuration Files

**Create `facilitator/vercel.json`:**
```json
{
  "version": 2,
  "builds": [
    {
      "src": "src/index.ts",
      "use": "@vercel/node"
    }
  ],
  "routes": [
    {
      "src": "/api/(.*)",
      "dest": "src/index.ts"
    }
  ],
  "env": {
    "NODE_ENV": "production"
  }
}
```

**Create `merchant/vercel.json`:**
```json
{
  "version": 2,
  "builds": [
    {
      "src": "src/index.js",
      "use": "@vercel/node"
    }
  ],
  "routes": [
    {
      "src": "/(.*)",
      "dest": "src/index.js"
    }
  ]
}
```

**Create `widget/vercel.json`:**
```json
{
  "version": 2,
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```

#### Add .vercelignore Files

**Each component needs:**
```
# facilitator/.vercelignore
__tests__/
*.test.ts
node_modules/
.env
.env.*
*.md
scripts/

# merchant/.vercelignore  
node_modules/
.env
.env.*
*.md

# widget/.vercelignore
__tests__/
*.test.ts
node_modules/
.env
.env.*
*.md
```

### **Phase 3: Local Production Build Test (1 hour)**

**Test builds locally BEFORE pushing to Vercel:**

```bash
# Facilitator
cd facilitator
npm run build
node dist/index.js  # Should start without errors

# Merchant  
cd ../merchant
npm install
node src/index.js  # Should start

# Widget
cd ../widget
npm run build
npx serve -s dist -p 5173  # Test production build
```

**Verify:**
- [ ] All builds complete without errors
- [ ] No missing environment variables errors
- [ ] API endpoints respond to health checks

### **Phase 4: Update OAuth/Environment Configs (30 min)**

#### Google OAuth Console

**Add authorized origins:**
- `https://pay402-widget.vercel.app`
- `https://widget.pay402demo.com` (if using custom domain)

**Add redirect URIs:**
- `https://pay402-widget.vercel.app/oauth/callback`
- `https://widget.pay402demo.com/oauth/callback`

#### Enoki Configuration

**Verify redirect URIs include:**
- `https://pay402-widget.vercel.app`

### **Phase 5: Deploy to Vercel (2-3 hours)**

#### Step 1: Deploy Facilitator First

```bash
cd facilitator
vercel

# Follow prompts:
# - Link to existing project? No
# - Project name: pay402-facilitator
# - Deploy? Yes

# Set environment variables
vercel env add SUI_NETWORK
vercel env add PACKAGE_ID
vercel env add USDC_TYPE
vercel env add FACILITATOR_PRIVATE_KEY

# Deploy to production
vercel --prod
```

**Verify:**
- Visit `https://pay402-facilitator.vercel.app/health`
- Should return service status

#### Step 2: Deploy Merchant

```bash
cd ../merchant
vercel

# Set environment variables (include facilitator URL from step 1!)
vercel env add FACILITATOR_URL
vercel env add MERCHANT_PRIVATE_KEY

vercel --prod
```

**Verify:**
- Visit merchant endpoint
- Should load demo page

#### Step 3: Deploy Widget

```bash
cd ../widget
vercel

# Set environment variables
vercel env add VITE_FACILITATOR_URL
vercel env add VITE_MERCHANT_URL
vercel env add VITE_GOOGLE_CLIENT_ID
vercel env add VITE_ENOKI_PUBLIC_KEY

vercel --prod
```

**Verify:**
- Visit widget
- Should load payment page
- Test Google login

### **Phase 6: End-to-End Testing (2-3 hours)**

**Complete payment flow:**
1. Visit merchant demo
2. Click "Get Premium Data"
3. Redirected to widget with invoice JWT
4. Login with Google (zkLogin)
5. Confirm payment
6. Verify transaction on Sui explorer
7. Return to merchant with success

**Test edge cases:**
- Insufficient balance
- Invalid invoice
- Network timeouts
- Browser refresh during flow

### **Phase 7: Monitoring & Debug (ongoing)**

**Add logging:**
- Vercel Function Logs (Real-time)
- Sui Explorer links for every transaction
- Error tracking (console.error shows in Vercel)

**Create debug endpoints:**
```typescript
// facilitator/src/controllers/debug.ts
export async function debugInfo(req, res) {
  res.json({
    network: process.env.SUI_NETWORK,
    hasKeys: !!process.env.FACILITATOR_PRIVATE_KEY,
    packageId: process.env.PACKAGE_ID,
    timestamp: new Date().toISOString()
  });
}
```

---

## Critical Gotchas & Solutions

### Gotcha 1: Vercel Function Cold Starts

**Problem:** First request after idle = slow (2-5s)

**Solution:**
- Add warmup endpoint `/api/warmup` (call every 5 minutes)
- Or accept slower first request (fine for demo)

### Gotcha 2: Environment Variable Visibility

**Problem:** `VITE_*` variables get bundled into browser

**Solution:**
- ✅ Use `VITE_*` for: Facilitator URL, Google Client ID, Enoki Public Key
- ❌ NEVER use `VITE_*` for: Private keys, secrets

### Gotcha 3: CORS Issues

**Problem:** Widget calling Facilitator from different domain

**Solution:**
```typescript
// facilitator/src/index.ts
app.use(cors({
  origin: [
    'https://pay402-widget.vercel.app',
    'https://pay402-merchant.vercel.app',
    'http://localhost:5173',  // Keep for local dev
    'http://localhost:3002'
  ],
  credentials: true
}));
```

### Gotcha 4: JWT Signature Verification

**Problem:** Different base URLs break JWT validation

**Solution:**
- Update `aud` (audience) in JWTs to use production URLs
- Update merchant JWT signing to include correct audience

### Gotcha 5: Sui RPC Rate Limiting

**Problem:** Public testnet RPC may rate limit

**Solution:**
- Add retry logic with exponential backoff
- Consider using paid RPC provider (Alchemy, QuickNode)
- Or accept occasional failures (fine for demo)

---

## Fallback Plan (If Vercel Fails)

### Plan B: Vercel for Frontend + Railway/Render for Backend

**If facilitator serverless functions are problematic:**

1. Keep widget + merchant on Vercel (static sites)
2. Deploy facilitator to Railway.app or Render.com (persistent Node server)
3. Railway: Single-click deploy, free tier, better for traditional Express apps

**Time cost:** +2-3 hours

---

## Time Budget Breakdown

| Phase | Estimated Time | Critical? |
|-------|---------------|-----------|
| Phase 0: Preparation | 30 min | ✅ |
| Phase 1: Fix Blockers | 2-3 hours | ✅ CRITICAL |
| Phase 2: Vercel Config | 1 hour | ✅ |
| Phase 3: Local Build Test | 1 hour | ✅ CRITICAL |
| Phase 4: OAuth Update | 30 min | ✅ |
| Phase 5: Deploy | 2-3 hours | ✅ |
| Phase 6: E2E Testing | 2-3 hours | ✅ CRITICAL |
| Phase 7: Debug/Polish | 1-2 hours | Optional |
| **TOTAL** | **10-13 hours** | |

**Buffer:** 12 hours available - 10 hours planned = **2 hours buffer** ✅

---

## Success Criteria

### Minimum Viable Demo ✅

- [ ] Widget loads on Vercel URL
- [ ] Merchant loads on Vercel URL
- [ ] Facilitator API responds
- [ ] Google login works
- [ ] Payment completes on testnet
- [ ] Transaction visible on Sui explorer

### Nice to Have 🎯

- [ ] Custom domains (pay402demo.com)
- [ ] Error handling for all edge cases
- [ ] Loading states/animations
- [ ] Comprehensive logging

---

## Post-Deployment Checklist

**Before demo:**
- [ ] Test complete flow 3+ times
- [ ] Check Vercel function logs (no errors)
- [ ] Verify Sui testnet transactions
- [ ] Screenshot successful payment
- [ ] Record video walkthrough (backup)
- [ ] Fund testnet accounts with USDC

**During demo:**
- [ ] Have Sui explorer link ready
- [ ] Have backup funded account
- [ ] Have localhost fallback if needed

---

## Additional Resources

### Vercel Docs (Actually Useful)

- Function timeouts: https://vercel.com/docs/functions/limitations
- Environment variables: https://vercel.com/docs/environment-variables
- Monorepo setup: https://vercel.com/docs/monorepos

### Troubleshooting Commands

```bash
# Check Vercel deployment status
vercel inspect [deployment-url]

# View real-time logs
vercel logs [deployment-url] --follow

# Rollback to previous deployment
vercel rollback [deployment-url]

# Test production build locally
vercel dev
```

---

## Final Recommendation

### ✅ **GO FOR IT - But Follow This Plan**

**Why it's feasible:**
1. Architecture is 90% compatible
2. Issues are fixable in 2-3 hours
3. Vercel free tier sufficient
4. You have 12 hours + buffer

**Critical success factors:**
1. Fix cross-component imports FIRST
2. Test production builds locally BEFORE deploy
3. Implement submit+poll pattern
4. Don't skip E2E testing phase

**Risk level:** MEDIUM → LOW (with this plan)

---

## My Challenge to You

> "You said there might be quite a few examples of typical problems. You're right - but they're ALL fixable in your timeframe. The biggest risk is not technical - it's rushing and skipping the local production build test phase. Do that first, and Vercel deployment is just clicking buttons."

**Ready to proceed?** Start with Phase 0 (branch creation) and Phase 1 (fix blockers).
