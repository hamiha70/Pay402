# Widget Deployment: Quick Reference

**Last Updated:** January 31, 2026  
**Status:** Architecture Complete

---

## 🎯 Key Question Answered

**Q: Where does the widget live in production?**

**A: CDN-hosted JavaScript, embedded in merchant's page (Stripe model)**

---

## 📦 Physical Location

```
Production:  https://cdn.pay402.com/widget.js
Development: http://localhost:3000/widget.js
Version:     https://cdn.pay402.com/v1.2.3/widget.js
```

**Hosted On:**
- Cloudflare CDN (recommended)
- AWS CloudFront
- Vercel Edge Network

**File Size:** ~150 KB (minified + gzipped)

---

## 🔧 Merchant Integration (One-Time Setup)

```html
<!-- Add to merchant's website -->
<script src="https://cdn.pay402.com/widget.js"></script>
<script>
  Pay402.init({
    facilitatorUrl: 'https://facilitator.pay402.com',
    googleClientId: 'MERCHANT_GOOGLE_CLIENT_ID'
  });
</script>
```

**That's it!** Widget handles everything else automatically.

---

## 🔄 Runtime Flow

### 1. Page Load (Before any 402)
```
User visits merchant.com
  ↓
Browser downloads widget.js from CDN
  ↓
Widget initializes (invisible, background)
  ↓
Widget monkey-patches window.fetch
  ↓
Widget creates modal container (hidden)
  ↓
Ready to intercept 402 responses
```

### 2. User Action (Triggering 402)
```
User clicks "Get Data" button
  ↓
Merchant's JavaScript: fetch('/api/premium')
  ↓
Widget intercepts fetch call
  ↓
Server returns 402 Payment Required
  ↓
Widget detects status === 402
  ↓
Widget parses WWW-Authenticate header
```

### 3. Payment Flow (Widget Takes Over)
```
Widget shows modal overlay (on merchant's page)
  ↓
User: Login with Google (zkLogin)
  ↓
Widget: Check balance (via facilitator)
  ↓
User: Confirm payment
  ↓
Widget: Get payment token (from facilitator)
  ↓
Widget: Retry original fetch with X-Payment header
  ↓
Server returns 200 OK with content
  ↓
Widget closes modal
  ↓
Content delivered to merchant's callback
```

---

## ❌ Common Misconceptions

### ❌ Widget is NOT:
- ❌ Sent in the 402 response (it's pre-loaded!)
- ❌ A browser extension (no installation required!)
- ❌ A separate app (runs on merchant's page!)
- ❌ Downloaded on every API call (cached by CDN!)

### ✅ Widget IS:
- ✅ Pre-loaded via `<script>` tag (like Stripe)
- ✅ Runs in buyer's browser (on merchant's domain)
- ✅ Intercepts fetch() calls automatically
- ✅ Shows modal overlay when 402 detected
- ✅ Zero user installation required

---

## 📊 Comparison: Distribution Models

| Model | User Install? | Merchant Effort | Our Choice |
|-------|--------------|-----------------|-----------|
| **Browser Extension** (MetaMask) | ❌ Yes (Chrome Web Store) | Low | ❌ Too much friction |
| **Embedded Widget** (Stripe) | ✅ No (pre-loaded) | Very Low | ✅ **CHOSEN** |
| **Native Protocol** (Web Payments) | ✅ No (built-in) | None | ❌ Not available yet |
| **Separate App** (Venmo) | ❌ Yes (App Store) | High | ❌ Context switch |

**Winner: Embedded Widget** - Best balance of UX and integration simplicity.

---

## 🏗️ Build & Deploy Process

### Development
```bash
cd widget
npm run dev  # Webpack dev server
```

### Production Build
```bash
npm run build

# Output: widget/dist/
├── widget.js         # Main bundle (~150 KB gzipped)
├── widget.js.map     # Source maps (debugging)
└── widget.css        # Styles (optional)

# Includes:
# - TypeScript → JavaScript
# - React JSX → vanilla JS
# - Tree shaking (remove unused)
# - Minification (uglify)
# - Code splitting (lazy load)
```

### Upload to CDN
```bash
# Cloudflare (recommended)
wrangler publish widget.js

# AWS CloudFront
aws s3 cp dist/widget.js s3://pay402-cdn/
aws cloudfront create-invalidation --paths "/widget.js"

# Vercel Edge
vercel deploy --prod
```

---

## 🔒 Security

### Subresource Integrity (SRI)
```html
<script 
  src="https://cdn.pay402.com/v1.2.3/widget.js"
  integrity="sha384-oqVuAfXRKap7fdgcCY5uykM6+R9GqQ8K/uxy9rx7HNQlGYl1kPzQho1wx4JwY8wC"
  crossorigin="anonymous">
</script>
```

**Protects Against:**
- CDN compromise
- Man-in-the-middle attacks
- Malicious code injection

### Versioning Strategy
```
/widget.js           → Latest (auto-update)
/v1/widget.js        → Stable v1.x (recommended)
/v1.2.3/widget.js    → Pin exact version (maximum control)
```

---

## 🎬 Demo Setup

**For Hackathon:**

```html
<!DOCTYPE html>
<html>
<head>
  <!-- Load widget from local dev server -->
  <script src="http://localhost:3000/widget.js"></script>
  <script>
    Pay402.init({
      facilitatorUrl: 'http://localhost:3001',
      googleClientId: 'YOUR_GOOGLE_CLIENT_ID'
    });
  </script>
</head>
<body>
  <h1>Premium Weather API Demo</h1>
  <button onclick="fetchData()">Get Data ($0.01)</button>
  
  <script>
    async function fetchData() {
      // Normal fetch - widget handles 402 automatically!
      const res = await fetch('https://x402.payai.network/echo?message=test');
      if (res.ok) {
        const data = await res.text();
        alert('Success: ' + data);
      }
    }
  </script>
</body>
</html>
```

**What Happens:**
1. Page loads → Widget initializes
2. User clicks button → fetch() called
3. Server returns 402 → Widget detects
4. Widget shows modal (Google login)
5. User pays → Widget retries fetch
6. Content delivered → Success!

---

## 🎯 Real-World Examples (Same Pattern)

### Stripe Checkout
```html
<script src="https://js.stripe.com/v3/"></script>
<script>
  const stripe = Stripe('pk_test_XXX');
  stripe.redirectToCheckout({ ... });
</script>
```

### PayPal Buttons
```html
<script src="https://www.paypal.com/sdk/js?client-id=XXX"></script>
<script>
  paypal.Buttons({ ... }).render('#paypal-button');
</script>
```

### Google Analytics
```html
<script async src="https://www.googletagmanager.com/gtag/js?id=G-XXX"></script>
<script>
  gtag('config', 'G-XXX');
</script>
```

**Pay402 uses the EXACT SAME pattern!**

---

## 📚 Mental Model Summary

```
┌─────────────────────────────────────────────────────────────┐
│                  Widget Deployment Model                    │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  WHERE:  CDN (Cloudflare/AWS/Vercel)                        │
│  WHAT:   Compiled JavaScript bundle (~150 KB)              │
│  HOW:    Merchant adds <script> tag (one-time)             │
│  WHEN:   Loaded on page load (BEFORE 402 happens)          │
│  WHO:    Runs in buyer's browser (on merchant's page)      │
│  WHY:    Zero installation UX (like Stripe)                │
│                                                             │
│  ┌───────────────────────────────────────────────────┐     │
│  │ Widget is PRE-LOADED (not in 402 response)        │     │
│  │ Widget INTERCEPTS fetch calls (monkey-patch)      │     │
│  │ Widget INJECTS modal (on merchant's page)         │     │
│  │ Widget RETRIES request (with payment token)       │     │
│  └───────────────────────────────────────────────────┘     │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## ✅ Checklist for Implementation

- [ ] Set up Webpack build (TypeScript → JavaScript)
- [ ] Implement fetch() interceptor (monkey-patch)
- [ ] Create modal container (React portal)
- [ ] Integrate zkLogin (ephemeral keys)
- [ ] Add 402 header parser (WWW-Authenticate)
- [ ] Build payment flow UI (React components)
- [ ] Test with x402 Echo (testnet)
- [ ] Deploy to CDN (Cloudflare/AWS)
- [ ] Generate SRI hash (integrity verification)
- [ ] Create demo page (merchant integration)

---

**Confidence: 100%** - This is the industry-standard embedded widget model.

**Next Step:** Start building! (`cd Pay402/move && sui move new payment`)
