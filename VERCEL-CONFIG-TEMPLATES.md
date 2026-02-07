# Vercel Configuration Templates - Pay402

**Purpose:** Ready-to-use Vercel configuration files for each component  
**Usage:** Copy these files into your Pay402 directories

---

## 1. Facilitator Configuration

### `facilitator/vercel.json`

```json
{
  "version": 2,
  "name": "pay402-facilitator",
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "installCommand": "npm install",
  "framework": null,
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/api/index"
    }
  ],
  "functions": {
    "api/**/*.js": {
      "memory": 1024,
      "maxDuration": 10
    }
  },
  "env": {
    "NODE_ENV": "production"
  },
  "headers": [
    {
      "source": "/api/(.*)",
      "headers": [
        {
          "key": "Access-Control-Allow-Origin",
          "value": "https://pay402-widget.vercel.app"
        },
        {
          "key": "Access-Control-Allow-Methods",
          "value": "GET, POST, OPTIONS"
        },
        {
          "key": "Access-Control-Allow-Headers",
          "value": "Content-Type, Authorization, X-402-Invoice"
        },
        {
          "key": "Access-Control-Allow-Credentials",
          "value": "true"
        }
      ]
    }
  ]
}
```

### `facilitator/.vercelignore`

```
# Tests
__tests__/
**/*.test.ts
**/*.test.js
*.test.ts
*.test.js
coverage/
.vitest/

# Development
node_modules/
src/
tsconfig.json
.env
.env.*
!.env.production

# Documentation
*.md
docs/

# Scripts
scripts/

# Git
.git/
.gitignore

# IDE
.vscode/
.idea/
*.swp
*.swo
```

### `facilitator/api/index.ts` (Vercel Serverless Wrapper)

**Option A: Automatic (Recommended)**
```typescript
// No changes needed! Vercel auto-wraps Express
// Just deploy - src/index.ts will work as-is
```

**Option B: Manual Wrapper (If Option A fails)**
```typescript
// facilitator/api/index.ts
import { VercelRequest, VercelResponse } from '@vercel/node';
import express from 'express';
import app from '../src/index.js'; // Your Express app

export default async (req: VercelRequest, res: VercelResponse) => {
  // Forward to Express
  return app(req, res);
};
```

---

## 2. Merchant Configuration

### `merchant/vercel.json`

```json
{
  "version": 2,
  "name": "pay402-merchant",
  "buildCommand": "echo 'No build needed'",
  "installCommand": "npm install",
  "framework": null,
  "routes": [
    {
      "src": "/api/(.*)",
      "dest": "/src/index.js"
    },
    {
      "src": "/(.*)",
      "dest": "/public/$1"
    }
  ],
  "functions": {
    "src/index.js": {
      "memory": 512,
      "maxDuration": 10
    }
  },
  "public": true,
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "Access-Control-Allow-Origin",
          "value": "https://pay402-widget.vercel.app"
        }
      ]
    }
  ]
}
```

### `merchant/.vercelignore`

```
# Development
node_modules/
.env
.env.*
!.env.production

# Documentation
*.md
README.md

# Scripts
scripts/
setup-keys.js

# Git
.git/
.gitignore
```

---

## 3. Widget Configuration

### `widget/vercel.json`

```json
{
  "version": 2,
  "name": "pay402-widget",
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "installCommand": "npm install",
  "framework": "vite",
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ],
  "headers": [
    {
      "source": "/assets/(.*)",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=31536000, immutable"
        }
      ]
    }
  ]
}
```

### `widget/.vercelignore`

```
# Tests
__tests__/
**/*.test.ts
**/*.test.tsx
*.test.ts
*.test.tsx
coverage/
.vitest/

# Development
node_modules/
src/
index.html
tsconfig.json
vite.config.ts
.env
.env.*
!.env.production

# Documentation
*.md

# Git
.git/
.gitignore

# IDE
.vscode/
```

---

## 4. Environment Variables

### Facilitator (Vercel Dashboard)

**Go to:** Vercel Dashboard → pay402-facilitator → Settings → Environment Variables

| Key | Value | Environment | Sensitive? |
|-----|-------|-------------|------------|
| `SUI_NETWORK` | `testnet` | Production, Preview | No |
| `PACKAGE_ID` | `0x...` (your deployed contract) | Production, Preview | No |
| `USDC_TYPE` | `0xa1ec7fc00232b0b1848ad6699c837b5440ca83a947c43a9664ab14ff0c1e7a8a::usdc::USDC` | Production, Preview | No |
| `FACILITATOR_PRIVATE_KEY` | `suiprivkey1q...` | Production, Preview | **YES** |
| `NODE_ENV` | `production` | Production | No |
| `NODE_ENV` | `preview` | Preview | No |

**CLI commands:**
```bash
cd facilitator
vercel env add SUI_NETWORK production
# Enter: testnet

vercel env add PACKAGE_ID production
# Enter: 0x... (your package ID)

vercel env add USDC_TYPE production
# Enter: 0xa1ec7fc... (Circle USDC)

vercel env add FACILITATOR_PRIVATE_KEY production
# Enter: suiprivkey1q... (mark as sensitive!)
```

### Merchant (Vercel Dashboard)

| Key | Value | Environment | Sensitive? |
|-----|-------|-------------|------------|
| `MERCHANT_PRIVATE_KEY` | `suiprivkey1q...` | Production, Preview | **YES** |
| `FACILITATOR_URL` | `https://pay402-facilitator.vercel.app` | Production | No |
| `FACILITATOR_URL` | `https://pay402-facilitator-git-[branch].vercel.app` | Preview | No |
| `NODE_ENV` | `production` | Production | No |

### Widget (Vercel Dashboard)

| Key | Value | Environment | Sensitive? |
|-----|-------|-------------|------------|
| `VITE_FACILITATOR_URL` | `https://pay402-facilitator.vercel.app` | Production | No |
| `VITE_MERCHANT_URL` | `https://pay402-merchant.vercel.app` | Production | No |
| `VITE_GOOGLE_CLIENT_ID` | `300529773657-....apps.googleusercontent.com` | Production, Preview | No |
| `VITE_ENOKI_PUBLIC_KEY` | `enoki_public_...` | Production, Preview | No |

**⚠️ IMPORTANT:** Widget env vars are embedded in browser bundle!

---

## 5. Package.json Scripts (Vercel-Compatible)

### Facilitator `package.json` (Update if needed)

```json
{
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js",
    "vercel-build": "npm run build",
    "test": "vitest"
  }
}
```

### Merchant `package.json` (Update if needed)

```json
{
  "scripts": {
    "dev": "node --env-file=.env src/index.js",
    "start": "node src/index.js",
    "vercel-build": "echo 'No build needed'"
  }
}
```

### Widget `package.json` (Already good)

```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "preview": "vite preview",
    "vercel-build": "npm run build"
  }
}
```

---

## 6. CORS Update (Facilitator)

### `facilitator/src/index.ts` (Update CORS section)

**Find this:**
```typescript
import cors from 'cors';
app.use(cors()); // ❌ Allows all origins
```

**Replace with:**
```typescript
import cors from 'cors';

// Get allowed origins from environment (or hardcode for demo)
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',')
  : [
      'https://pay402-widget.vercel.app',
      'https://pay402-merchant.vercel.app',
      'http://localhost:5173',
      'http://localhost:3002',
    ];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.warn(`CORS blocked origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-402-Invoice'],
}));

// Handle preflight
app.options('*', cors());
```

**Optional: Add to facilitator env vars**
```bash
vercel env add ALLOWED_ORIGINS production
# Enter: https://pay402-widget.vercel.app,https://pay402-merchant.vercel.app
```

---

## 7. Submit + Poll Pattern (Recommended)

### `facilitator/src/controllers/payment-status.ts` (NEW FILE)

```typescript
import { Request, Response } from 'express';
import { client } from '../sui.js';

/**
 * GET /api/payment-status/:digest
 * Poll transaction status (client calls this repeatedly)
 */
export async function getPaymentStatus(req: Request, res: Response) {
  try {
    const { digest } = req.params;
    
    if (!digest) {
      return res.status(400).json({ error: 'Missing transaction digest' });
    }
    
    // Query transaction status
    const tx = await client.getTransactionBlock({
      digest,
      options: {
        showEffects: true,
        showEvents: true,
      },
    });
    
    // Parse status
    const status = tx.effects?.status?.status || 'pending';
    const isSuccess = status === 'success';
    
    res.json({
      digest,
      status: isSuccess ? 'confirmed' : (status === 'failure' ? 'failed' : 'pending'),
      confirmedAt: tx.checkpoint ? Number(tx.checkpoint) : null,
      gasUsed: tx.effects?.gasUsed,
      events: tx.events || [],
      error: status === 'failure' ? tx.effects?.status?.error : null,
    });
    
  } catch (error: any) {
    // Transaction not found yet (pending)
    if (error.message?.includes('not found') || error.message?.includes('Could not find')) {
      return res.json({
        digest: req.params.digest,
        status: 'pending',
        confirmedAt: null,
      });
    }
    
    console.error('Error checking payment status:', error);
    res.status(500).json({ 
      error: 'Failed to check payment status',
      details: error.message 
    });
  }
}
```

### `facilitator/src/index.ts` (Add route)

```typescript
import { getPaymentStatus } from './controllers/payment-status.js';

// ... existing routes ...

app.get('/api/payment-status/:digest', getPaymentStatus);
```

### `facilitator/src/controllers/submit-payment.ts` (Update to return immediately)

```typescript
// Before (blocks for confirmation):
export async function submitPayment(req, res) {
  const result = await client.signAndExecuteTransactionBlock({ ... });
  await client.waitForTransactionBlock(result.digest); // ❌ Blocks up to 10s
  res.json({ success: true, digest: result.digest });
}

// After (returns immediately):
export async function submitPayment(req, res) {
  const result = await client.signAndExecuteTransactionBlock({ ... });
  
  res.json({ 
    digest: result.digest,
    status: 'pending',
    pollUrl: `/api/payment-status/${result.digest}`,
    message: 'Transaction submitted, poll for confirmation'
  });
}
```

### `widget/src/lib/pay402-client.ts` (Update to poll)

```typescript
async function waitForPaymentConfirmation(digest: string): Promise<PaymentStatus> {
  const maxAttempts = 30; // 30 seconds max
  const pollInterval = 1000; // 1 second
  
  for (let i = 0; i < maxAttempts; i++) {
    const response = await fetch(
      `${FACILITATOR_URL}/api/payment-status/${digest}`
    );
    
    if (!response.ok) {
      throw new Error('Failed to check payment status');
    }
    
    const status = await response.json();
    
    if (status.status === 'confirmed') {
      return status;
    }
    
    if (status.status === 'failed') {
      throw new Error(`Payment failed: ${status.error}`);
    }
    
    // Still pending, wait and try again
    await new Promise(resolve => setTimeout(resolve, pollInterval));
  }
  
  throw new Error('Payment confirmation timeout (30s)');
}
```

---

## 8. Deployment Commands

### One-Time Setup

```bash
# Install Vercel CLI
npm install -g vercel

# Login to Vercel
vercel login

# Link each project to Vercel
cd facilitator
vercel link  # Select "Create new project"

cd ../merchant
vercel link

cd ../widget
vercel link
```

### Deploy to Production

```bash
# Deploy facilitator
cd facilitator
vercel --prod

# Copy the deployment URL (e.g., https://pay402-facilitator.vercel.app)

# Deploy merchant (update FACILITATOR_URL first!)
cd ../merchant
vercel env add FACILITATOR_URL production
# Enter: https://pay402-facilitator.vercel.app
vercel --prod

# Deploy widget (update URLs first!)
cd ../widget
vercel env add VITE_FACILITATOR_URL production
# Enter: https://pay402-facilitator.vercel.app
vercel env add VITE_MERCHANT_URL production
# Enter: https://pay402-merchant.vercel.app
vercel --prod
```

### Deploy Preview (Testing)

```bash
# Deploy to preview URL (not production)
cd facilitator
vercel

# Test preview URL before promoting to production
# Visit: https://pay402-facilitator-git-[branch]-[team].vercel.app
```

### Promote Preview to Production

```bash
# After testing preview
vercel --prod
```

---

## 9. Testing Checklist

### After First Deploy

```bash
# 1. Test facilitator health
curl https://pay402-facilitator.vercel.app/health

# Expected: { "status": "ok", "network": "testnet", ... }

# 2. Test merchant health
curl https://pay402-merchant.vercel.app/api/health

# Expected: { "status": "ok", ... }

# 3. Test widget loads
open https://pay402-widget.vercel.app

# Expected: Widget UI loads (may show error if no invoice yet)

# 4. Test CORS (from widget)
# Open browser console on widget page:
fetch('https://pay402-facilitator.vercel.app/health')
  .then(r => r.json())
  .then(console.log);

# Expected: No CORS error, returns health data
```

### End-to-End Flow

1. Visit `https://pay402-merchant.vercel.app`
2. Click "Get Premium Data"
3. Should redirect to widget with invoice JWT
4. Login with Google
5. Confirm payment
6. Wait for confirmation (polling)
7. Return to merchant with success

---

## 10. Debugging

### View Logs

```bash
# Real-time logs
vercel logs https://pay402-facilitator.vercel.app --follow

# Recent logs
vercel logs https://pay402-facilitator.vercel.app
```

### Inspect Deployment

```bash
# Get deployment details
vercel inspect https://pay402-facilitator.vercel.app

# List all deployments
vercel ls
```

### Rollback

```bash
# List deployments
vercel ls pay402-facilitator

# Rollback to previous
vercel rollback https://pay402-facilitator-[previous].vercel.app --yes
```

---

## 11. Custom Domains (Optional)

### If you have pay402demo.com

```bash
# Add domains to each project
vercel domains add widget.pay402demo.com pay402-widget
vercel domains add merchant.pay402demo.com pay402-merchant
vercel domains add facilitator.pay402demo.com pay402-facilitator

# Vercel will provide DNS records to add
# Update your domain registrar with those records
```

---

## Summary

**Files to create:**
1. `facilitator/vercel.json`
2. `facilitator/.vercelignore`
3. `merchant/vercel.json`
4. `merchant/.vercelignore`
5. `widget/vercel.json`
6. `widget/.vercelignore`

**Files to update:**
1. `facilitator/src/index.ts` (CORS)
2. `facilitator/src/controllers/submit-payment.ts` (return immediately)
3. `facilitator/src/controllers/payment-status.ts` (NEW FILE)
4. `widget/src/lib/pay402-client.ts` (add polling)

**Time estimate:** 1-2 hours to implement all

**Ready to start?** Begin with creating the `.vercelignore` files (easiest win).
