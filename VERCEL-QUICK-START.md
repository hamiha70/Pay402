# Vercel Deployment Quick Start - Pay402

**Goal:** Deploy Pay402 to Vercel in 12 hours  
**Current Status:** Ready to begin  
**Difficulty:** Medium (manageable)

---

## ⚡ Quick Decision Tree

**Q: Do you want to refactor shared code into a package?**
- ✅ NO → **Follow this guide** (Quick & Dirty - 6-8 hours)
- ❌ YES → Not recommended for 12-hour deadline

**Q: Are you okay with code duplication for now?**
- ✅ YES → **Proceed** (can refactor post-hackathon)
- ❌ NO → Reconsider timeline (refactor adds 4-5 hours)

**Q: Is localhost demo currently working?**
- ✅ YES → **Great!** Proceed with confidence
- ❌ NO → Fix localhost first (don't deploy broken code)

---

## 🚀 30-Minute Quick Start (If you're in a hurry)

### Step 1: Create Deployment Branch (2 min)
```bash
cd /home/hamiha70/Projects/ETHGlobal/HackMoney_Jan26/Pay402
git checkout -b vercel-deploy
git push -u origin vercel-deploy
```

### Step 2: Fix Test Import (3 min)
```bash
echo "__tests__/" >> facilitator/.vercelignore
echo "*.test.ts" >> facilitator/.vercelignore
echo "coverage/" >> facilitator/.vercelignore
```

### Step 3: Create Vercel Configs (10 min)
```bash
# Copy from VERCEL-CONFIG-TEMPLATES.md
# Create vercel.json and .vercelignore for each component
```

### Step 4: Test Local Builds (15 min)
```bash
# Facilitator
cd facilitator
npm run build
ls dist/  # Should see index.js

# Merchant
cd ../merchant
node --check src/index.js  # Syntax check

# Widget
cd ../widget
npm run build
ls dist/  # Should see index.html and assets/
```

### Step 5: Deploy to Vercel
```bash
# Install CLI
npm install -g vercel

# Deploy (interactive)
cd facilitator && vercel
cd ../merchant && vercel
cd ../widget && vercel

# Follow prompts, add environment variables
```

**Done!** You now have preview URLs. Test and promote to production.

---

## 📋 Full Checklist (Methodical Approach)

### Phase 0: Preparation ✅

- [ ] Read `VERCEL-DEPLOYMENT-PLAN.md` (10 min)
- [ ] Read `VERCEL-TECHNICAL-ASSESSMENT.md` (15 min)
- [ ] Create `vercel-deploy` branch (2 min)
- [ ] Commit current work to `main` (5 min)

**Time:** 30 minutes

---

### Phase 1: Fix Blockers 🔴

#### Fix 1.1: Test Import (5 min)
```bash
cd facilitator
echo "__tests__/" >> .vercelignore
echo "*.test.ts" >> .vercelignore
echo "coverage/" >> .vercelignore
git add .vercelignore
git commit -m "fix: ignore tests in Vercel build"
```

#### Fix 1.2: Verify Stateless (5 min)
```bash
cd facilitator/src
grep -r "new Map" .
grep -r "new Set" .
grep -r "cache" .
# Expected: No problematic results
```

#### Fix 1.3: Update CORS (10 min)
Edit `facilitator/src/index.ts`:
```typescript
// See VERCEL-CONFIG-TEMPLATES.md section 6
// Replace cors() with configured version
```

#### Fix 1.4: Add Vercel Configs (20 min)
```bash
# Create vercel.json for each component
# See VERCEL-CONFIG-TEMPLATES.md sections 1, 2, 3
```

**Time:** 40 minutes  
**Commit:** 
```bash
git add .
git commit -m "feat: add Vercel configuration files"
git push origin vercel-deploy
```

---

### Phase 2: Optional - Submit+Poll Pattern ⚠️

**Skip if:** Time is tight, willing to risk timeouts  
**Do if:** Want reliable production deployment

#### Task 2.1: Add Payment Status Endpoint (30 min)
```bash
# Create facilitator/src/controllers/payment-status.ts
# See VERCEL-CONFIG-TEMPLATES.md section 7
```

#### Task 2.2: Update Submit Payment (15 min)
```bash
# Edit facilitator/src/controllers/submit-payment.ts
# Return immediately instead of waiting
```

#### Task 2.3: Update Widget Polling (30 min)
```bash
# Edit widget/src/lib/pay402-client.ts
# Add waitForPaymentConfirmation() function
```

**Time:** 1.5 hours  
**Commit:**
```bash
git add .
git commit -m "feat: implement submit+poll pattern for reliable confirmations"
```

**Decision:** 
- ✅ DO IT if you have 8+ hours left
- ❌ SKIP if you have <6 hours left

---

### Phase 3: Local Build Testing 🧪

#### Test 3.1: Facilitator (10 min)
```bash
cd facilitator
npm install
npm run build

# Check output
ls -la dist/
cat dist/index.js | head -20

# Try to run (will fail without env vars - that's OK)
node dist/index.js
# Expected error: Missing env vars (GOOD!)
```

#### Test 3.2: Merchant (5 min)
```bash
cd ../merchant
npm install
node --check src/index.js  # Syntax check
# Expected: No output (GOOD!)
```

#### Test 3.3: Widget (10 min)
```bash
cd ../widget
npm install
npm run build

# Check output
ls -la dist/
cat dist/index.html | head -20

# Preview
npx serve -s dist -p 5173
# Visit: http://localhost:5173
# Expected: Widget loads (may show errors - that's OK)
```

**Time:** 25 minutes

**If errors:** Fix before deploying!

---

### Phase 4: Vercel Account Setup 🌐

#### Task 4.1: Install Vercel CLI (2 min)
```bash
npm install -g vercel
```

#### Task 4.2: Login (3 min)
```bash
vercel login
# Opens browser, authenticate with GitHub/Email
```

#### Task 4.3: Link Projects (10 min)
```bash
cd facilitator
vercel link
# Choose: Create new project
# Name: pay402-facilitator

cd ../merchant
vercel link
# Name: pay402-merchant

cd ../widget
vercel link
# Name: pay402-widget
```

**Time:** 15 minutes

---

### Phase 5: Deploy to Preview 🚀

#### Deploy 5.1: Facilitator (10 min)
```bash
cd facilitator
vercel

# Follow prompts:
# - Detected settings? Yes
# - Deploy? Yes

# Add environment variables
vercel env add SUI_NETWORK
# Enter: testnet

vercel env add PACKAGE_ID
# Enter: 0x... (your testnet package)

vercel env add USDC_TYPE
# Enter: 0xa1ec7fc... (Circle USDC testnet)

vercel env add FACILITATOR_PRIVATE_KEY
# Enter: suiprivkey1q... (YOUR KEY - mark sensitive!)

# Redeploy with env vars
vercel
```

**Save URL:** `https://pay402-facilitator-[hash].vercel.app`

#### Deploy 5.2: Merchant (10 min)
```bash
cd ../merchant

vercel env add MERCHANT_PRIVATE_KEY
# Enter: your merchant key

vercel env add FACILITATOR_URL
# Enter: https://pay402-facilitator-[hash].vercel.app (from above)

vercel
```

**Save URL:** `https://pay402-merchant-[hash].vercel.app`

#### Deploy 5.3: Widget (10 min)
```bash
cd ../widget

vercel env add VITE_FACILITATOR_URL
# Enter: https://pay402-facilitator-[hash].vercel.app

vercel env add VITE_MERCHANT_URL
# Enter: https://pay402-merchant-[hash].vercel.app

vercel env add VITE_GOOGLE_CLIENT_ID
# Enter: your Google OAuth client ID

vercel env add VITE_ENOKI_PUBLIC_KEY
# Enter: enoki_public_...

vercel
```

**Save URL:** `https://pay402-widget-[hash].vercel.app`

**Time:** 30 minutes

---

### Phase 6: Update OAuth Providers 🔐

#### Task 6.1: Google OAuth Console (5 min)
1. Go to https://console.cloud.google.com
2. Navigate to: APIs & Services → Credentials
3. Select your OAuth 2.0 Client ID
4. Add Authorized JavaScript origins:
   - `https://pay402-widget-[hash].vercel.app`
5. Add Authorized redirect URIs:
   - `https://pay402-widget-[hash].vercel.app/oauth/callback`
6. Save changes

#### Task 6.2: Enoki Portal (3 min)
1. Go to https://portal.enoki.mystenlabs.com
2. Select your project
3. Add redirect URL:
   - `https://pay402-widget-[hash].vercel.app`
4. Save

**Time:** 8 minutes

---

### Phase 7: Test Preview Deployment 🧪

#### Test 7.1: Health Checks (5 min)
```bash
# Facilitator
curl https://pay402-facilitator-[hash].vercel.app/health

# Merchant
curl https://pay402-merchant-[hash].vercel.app/api/health

# Widget (browser)
open https://pay402-widget-[hash].vercel.app
```

#### Test 7.2: End-to-End Flow (20 min)
1. Visit merchant URL
2. Click "Get Premium Data"
3. Copy invoice JWT
4. Paste in widget URL
5. Login with Google
6. Check balance
7. Confirm payment
8. Wait for confirmation
9. Verify on Sui explorer
10. Return to merchant

**Document any errors!**

#### Test 7.3: Check Logs (10 min)
```bash
# View real-time facilitator logs
vercel logs https://pay402-facilitator-[hash].vercel.app --follow

# Look for:
# - CORS errors
# - Environment variable errors
# - Sui RPC errors
# - Timeout errors
```

**Time:** 35 minutes

---

### Phase 8: Fix Issues & Redeploy 🔧

**Common issues:**

#### Issue 8.1: CORS Error
**Symptom:** Widget can't call facilitator API  
**Fix:** Update CORS origins in `facilitator/src/index.ts`  
**Redeploy:** `cd facilitator && vercel`

#### Issue 8.2: Environment Variable Missing
**Symptom:** "undefined" in logs  
**Fix:** Add missing env var: `vercel env add KEY_NAME`  
**Redeploy:** `vercel`

#### Issue 8.3: Timeout
**Symptom:** 504 Gateway Timeout  
**Fix:** Implement submit+poll pattern (Phase 2)  
**Or:** Accept it for demo (not ideal)

#### Issue 8.4: Google Login Fails
**Symptom:** OAuth error  
**Fix:** Verify redirect URIs in Google Console  
**Redeploy:** Not needed (OAuth config change is instant)

**Time:** 30-60 minutes (depends on issues)

---

### Phase 9: Promote to Production 🎉

#### Task 9.1: Verify Preview Works (10 min)
- [ ] Complete end-to-end payment flow
- [ ] No console errors
- [ ] Transaction confirmed on Sui explorer
- [ ] Merchant receives payment proof

#### Task 9.2: Deploy to Production (10 min)
```bash
# Promote previews to production
cd facilitator && vercel --prod
cd ../merchant && vercel --prod
cd ../widget && vercel --prod
```

**New URLs:**
- `https://pay402-facilitator.vercel.app`
- `https://pay402-merchant.vercel.app`
- `https://pay402-widget.vercel.app`

#### Task 9.3: Update OAuth Again (5 min)
Add production URLs to Google OAuth & Enoki (same as Phase 6)

#### Task 9.4: Test Production (20 min)
Repeat Phase 7 tests with production URLs

**Time:** 45 minutes

---

### Phase 10: Documentation & Demo Prep 📝

#### Task 10.1: Create Demo Doc (15 min)
```markdown
# Pay402 Demo - Vercel Deployment

**Live URLs:**
- Widget: https://pay402-widget.vercel.app
- Merchant: https://pay402-merchant.vercel.app
- Facilitator: https://pay402-facilitator.vercel.app

**Test Accounts:**
- Google: your-test@gmail.com
- Sui Address: 0x... (funded with testnet USDC)

**Demo Flow:**
1. Visit merchant URL
2. Click "Get Premium Data"
3. Login with Google
4. Confirm payment (0.1 USDC)
5. View transaction: [Sui Explorer Link]

**Known Issues:**
- [List any issues]

**Backup Plan:**
- localhost:5173, localhost:3002, localhost:3001 (if Vercel fails)
```

#### Task 10.2: Record Demo Video (20 min)
Use OBS/QuickTime to record:
1. Clean browser (no extensions)
2. Full payment flow
3. Transaction confirmation
4. Sui explorer verification

**Save as:** `demo-video.mp4`

#### Task 10.3: Take Screenshots (10 min)
- Landing page
- Payment widget
- Google login
- Confirmation screen
- Sui explorer transaction

**Time:** 45 minutes

---

## ⏱️ Time Budget Summary

| Phase | Time | Cumulative | Critical? |
|-------|------|------------|-----------|
| Phase 0: Preparation | 30m | 0.5h | ✅ |
| Phase 1: Fix Blockers | 40m | 1.2h | ✅ |
| Phase 2: Submit+Poll (Optional) | 1.5h | 2.7h | ⚠️ |
| Phase 3: Local Testing | 25m | 3.1h | ✅ |
| Phase 4: Vercel Setup | 15m | 3.4h | ✅ |
| Phase 5: Deploy Preview | 30m | 3.9h | ✅ |
| Phase 6: OAuth Update | 8m | 4.0h | ✅ |
| Phase 7: Test Preview | 35m | 4.6h | ✅ |
| Phase 8: Fix & Redeploy | 1h | 5.6h | ✅ |
| Phase 9: Production | 45m | 6.3h | ✅ |
| Phase 10: Demo Prep | 45m | 7.0h | Optional |
| **TOTAL** | **7 hours** | | |

**Buffer:** 12 hours - 7 hours = **5 hours spare** ✅

---

## 🚨 Critical Path (Minimum to Deploy)

If you only have 6 hours:

1. ✅ Phase 0: Prep (30m)
2. ✅ Phase 1: Fix Blockers (40m)
3. ❌ Phase 2: Skip submit+poll
4. ✅ Phase 3: Local Testing (25m)
5. ✅ Phase 4: Vercel Setup (15m)
6. ✅ Phase 5: Deploy Preview (30m)
7. ✅ Phase 6: OAuth (8m)
8. ✅ Phase 7: Test (35m)
9. ✅ Phase 8: Fix Issues (1h)
10. ✅ Phase 9: Production (45m)
11. ❌ Phase 10: Skip docs (do during demo)

**Total:** 4.8 hours + buffer

---

## ✅ Success Criteria

### Minimum Viable Demo
- [ ] Widget loads on Vercel
- [ ] Google login works
- [ ] Payment completes
- [ ] Transaction visible on Sui testnet explorer

### Complete Demo
- [ ] All above +
- [ ] Submit+poll pattern (no timeouts)
- [ ] Error handling for edge cases
- [ ] Demo video recorded
- [ ] Screenshots ready

---

## 🆘 Troubleshooting Quick Reference

### "Command not found: vercel"
```bash
npm install -g vercel
# Or use npx: npx vercel
```

### "Build failed: Module not found"
```bash
# Check node_modules installed
cd [component]
npm install
```

### "CORS error in browser console"
```bash
# Update facilitator/src/index.ts CORS config
# See VERCEL-CONFIG-TEMPLATES.md section 6
```

### "Environment variable undefined"
```bash
vercel env ls  # List current vars
vercel env add KEY_NAME  # Add missing var
vercel --prod  # Redeploy
```

### "504 Gateway Timeout"
```bash
# Implement submit+poll (Phase 2)
# Or accept risk for demo
```

### "Transaction not found"
```bash
# Check Sui network matches (testnet vs localnet)
# Verify PACKAGE_ID is correct
# Check facilitator logs: vercel logs [url]
```

---

## 🎯 Ready to Start?

**Next Steps:**
1. Read this checklist ✅ (you just did!)
2. Start Phase 0 (create branch)
3. Work through phases sequentially
4. **Don't skip local testing!**
5. Test preview before production

**Commit to git frequently:**
```bash
git add .
git commit -m "wip: [what you just did]"
git push origin vercel-deploy
```

**Good luck! You've got this! 🚀**

---

## 📞 Need Help?

- Check logs: `vercel logs [url] --follow`
- Inspect deployment: `vercel inspect [url]`
- Rollback: `vercel rollback [url]`
- Docs: https://vercel.com/docs

---

**Created:** 2026-02-07  
**For:** Pay402 Hackathon Demo Deployment  
**By:** Claude (Cursor AI)
