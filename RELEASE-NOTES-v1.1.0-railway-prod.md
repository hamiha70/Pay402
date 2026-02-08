# Pay402 v1.1.0 - Railway Production Release

**Release Date:** February 8, 2026  
**Tag:** `v1.1.0-railway-prod`  
**Branch:** `vercel-deploy`  
**Platform:** Railway.app

## 🎉 Production Deployment Complete!

This release represents a **fully working production deployment** of the Pay402 system on Railway.app, tested end-to-end on both desktop and mobile devices.

## 🚀 Live Demo URLs

- **Merchant Demo:** https://merchant-production-0255.up.railway.app
- **Payment Widget:** https://widget-production-8b65.up.railway.app
- **Facilitator API:** https://pay402-production.up.railway.app

**Try it now:** Visit the merchant demo and click "Get Premium Data" to experience the full payment flow!

## ✨ What's New in v1.1.0

### Production Deployment
- ✅ All three services (Facilitator, Merchant, Widget) deployed on Railway.app
- ✅ Full end-to-end payment flow working in production
- ✅ Mobile-tested and verified
- ✅ OAuth integration with Google (zkLogin) configured for production URLs
- ✅ All services communicate via production domains (no localhost)

### Configuration Improvements
1. **Environment-Based URLs**
   - Added `MERCHANT_URL` environment variable for redirect URL configuration
   - Added `WIDGET_URL` environment variable for payment page redirects
   - Merchant exposes `/api/config` endpoint for dynamic widget URL discovery
   - All hardcoded `localhost` URLs removed from production code

2. **Better Error Handling**
   - Proper error messages when configuration fails
   - No silent localhost fallbacks that hide production issues
   - Clear user-facing errors for missing redirect URLs

3. **Railway Monorepo Support**
   - Per-service `nixpacks.toml` configuration files
   - Per-service `railway.json` metadata
   - Root Directory settings documented for each service
   - Proper service-to-directory linking in Railway dashboard

### Build Optimizations
- TypeScript compilation optimized for faster deployments
- Test files excluded from production builds
- Widget uses `vite build` (bypasses strict type checks for hackathon speed)
- Facilitator builds with TypeScript but excludes test files

## 🔧 Technical Details

### Architecture
```
┌─────────────────────────────────────────────────────────┐
│                    GitHub Repository                     │
│                  (vercel-deploy branch)                  │
└──────────────────────┬──────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────┐
│              Railway.app (Auto Deploy)                   │
└──────────────────────┬──────────────────────────────────┘
                       │
        ┌──────────────┼──────────────┐
        ▼              ▼              ▼
┌──────────────┐ ┌──────────┐ ┌────────────┐
│ Facilitator  │ │ Merchant │ │   Widget   │
│   Backend    │ │   Demo   │ │  Frontend  │
│              │ │          │ │            │
│ Node.js +    │ │ Node.js  │ │ React +    │
│ Express +    │ │ Express  │ │ Vite +     │
│ TypeScript   │ │          │ │ TypeScript │
└──────────────┘ └──────────┘ └────────────┘
      │               │              │
      └───────────────┴──────────────┘
                   │
                   ▼
         Sui Testnet Blockchain
```

### Environment Variables Set

**Facilitator:**
- `SUI_NETWORK=testnet`
- `FACILITATOR_PRIVATE_KEY=...`
- `USDC_TYPE=...`
- `PACKAGE_ID=...`

**Merchant:**
- `MERCHANT_URL=https://merchant-production-0255.up.railway.app`
- `WIDGET_URL=https://widget-production-8b65.up.railway.app`
- `FACILITATOR_ADDRESS=...`
- `MERCHANT_PRIVATE_KEY=...`
- `SUI_NETWORK=testnet`

**Widget:**
- `VITE_FACILITATOR_URL=https://pay402-production.up.railway.app`
- `VITE_ENOKI_API_KEY=...`
- `VITE_GOOGLE_CLIENT_ID=...`
- `VITE_SUI_NETWORK=testnet`
- `VITE_USDC_TYPE=...`
- `VITE_PACKAGE_ID=...`

## 📦 Files Changed

### New Files
- `facilitator/nixpacks.toml` - Facilitator build config
- `facilitator/railway.json` - Facilitator Railway metadata
- `merchant/nixpacks.toml` - Merchant build config
- `merchant/railway.json` - Merchant Railway metadata
- `widget/nixpacks.toml` - Widget build config
- `widget/railway.json` - Widget Railway metadata
- `RAILWAY-DEPLOYMENT-SUMMARY.md` - Comprehensive deployment documentation
- `RELEASE-NOTES-v1.1.0-railway-prod.md` - This file

### Modified Files
- `widget/package.json` - Added `serve` package, modified build script
- `widget/tsconfig.app.json` - Exclude test files
- `widget/src/components/PaymentPage.tsx` - Use env vars, remove localhost
- `widget/src/components/ZkLoginTest.tsx` - Use env vars for balance check
- `merchant/src/config.js` - Added `merchantUrl` configuration
- `merchant/src/controllers/premium-data.js` - Use `merchantUrl` for redirects
- `merchant/src/index.js` - Added `/api/config` endpoint
- `merchant/public/index.html` - Fetch widget URL from backend config
- `merchant/.env.testnet.example` - Added `MERCHANT_URL` and `WIDGET_URL`
- `facilitator/tsconfig.json` - Exclude test files from build

## 🐛 Bug Fixes

1. **Fixed hardcoded localhost URLs** in production code
   - `PaymentPage.tsx` now uses `VITE_FACILITATOR_URL`
   - `ZkLoginTest.tsx` now uses `VITE_FACILITATOR_URL`
   - Merchant invoice now uses `MERCHANT_URL` for redirects
   - Merchant frontend fetches widget URL from `/api/config`

2. **Fixed Railway service linking issues**
   - Each service directory properly linked to its Railway service
   - Root Directory settings documented and verified

3. **Fixed build caching issues**
   - Forced clean builds from `vercel-deploy` branch
   - Verified bundle hashes change with new deploys

## 🧪 Testing

### Verified Functionality ✅
- [x] Google OAuth zkLogin authentication
- [x] Wallet connection and balance display
- [x] Invoice generation from merchant
- [x] Payment widget redirect with invoice in URL hash
- [x] PTB (Programmable Transaction Block) building via facilitator
- [x] Client-side PTB verification
- [x] Transaction signing with zkLogin wallet
- [x] Payment submission to facilitator
- [x] On-chain settlement (pessimistic mode tested)
- [x] Redirect back to merchant with payment verification
- [x] Mobile browser compatibility

### Test Environments
- ✅ Desktop browsers (Chrome, Firefox)
- ✅ Mobile browsers (tested by user)

## 📝 Known Limitations

1. **Gas Balance:** Facilitator wallet has low SUI (~0.17 SUI). Recommended to fund for extended testing.
2. **TypeScript Checks:** Widget build skips strict type checking for faster deployment. Should be fixed post-hackathon.
3. **Cold Starts:** Railway free tier may have cold starts after idle periods.

## 🔒 Security Notes

- Private keys stored as Railway environment variables (encrypted at rest)
- Google OAuth properly configured with production redirect URIs
- Enoki allowed origins configured (no trailing paths)
- Client-side PTB verification ensures payment amount matches invoice
- JWT signature verification for invoices

## 📚 Documentation

- See `RAILWAY-DEPLOYMENT-SUMMARY.md` for deployment details
- See `ZKLOGIN-ERROR-FAILED-TO-FETCH.md` for OAuth troubleshooting
- See `.env.testnet.example` files for environment variable templates

## 🎯 ETH Global HackMoney Ready!

This release is production-ready for the HackMoney hackathon demo. Judges can:
1. Visit https://merchant-production-0255.up.railway.app
2. Click "Get Premium Data"
3. Authenticate with Google
4. Complete payment on Sui testnet
5. Access premium content

**All services are live and working!** 🚀

## 🙏 Credits

- **Sui Foundation** - Blockchain platform and zkLogin
- **Mysten Labs** - Enoki zkLogin SDK
- **Railway.app** - Deployment platform
- **Google Cloud** - OAuth provider

---

## Upgrade Instructions

To deploy this version:

```bash
# Switch to the deployment branch
git checkout vercel-deploy

# Verify you're on the right branch
git branch --show-current

# Pull latest changes
git pull origin vercel-deploy

# Deploy each service (from respective directories)
cd facilitator && railway up
cd ../merchant && railway up
cd ../widget && railway up
```

## Support

For issues or questions:
- Check `RAILWAY-DEPLOYMENT-SUMMARY.md` for troubleshooting
- Review Railway logs: `railway logs`
- Verify environment variables: `railway variables`

---

**Happy Hacking! 🚀**
