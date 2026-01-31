# Architecture Documentation Updates

**Date:** January 31, 2026  
**Status:** Complete - Ready for Implementation

---

## 🎯 Questions Addressed

### 1. ✅ Widget Deployment Model
**Question:** "Where does the widget live in production? Is it embedded in merchant page or in x402 response?"

**Answer:** CDN-hosted JavaScript, embedded in merchant's page (Stripe/PayPal model)

**Documentation:**
- `docs/ARCHITECTURE.md` - Section 4: Widget Deployment Model (physical architecture, runtime behavior)
- `docs/WIDGET_DEPLOYMENT.md` - Standalone quick reference guide

**Key Points:**
- Widget is **PRE-LOADED** via `<script>` tag (NOT in 402 response!)
- Hosted on CDN (Cloudflare/AWS/Vercel)
- Merchant adds one-time `<script src="cdn.pay402.com/widget.js">`
- Widget intercepts fetch() calls automatically
- Shows modal overlay when 402 detected
- Zero user installation required

### 2. ✅ PTB Construction Location
**Question:** "Where are PTBs constructed? In Move contracts or TypeScript?"

**Answer:** In TypeScript (client-side), NOT in Move contracts!

**Documentation:**
- `docs/ARCHITECTURE.md` - Technical Specifications: PTB Mental Model

**Key Points:**
- **Move contracts:** Simple pure functions (just logic)
- **TypeScript code:** ALL orchestration (PTB construction)
- Fundamental difference from EVM/Solidity (client vs contract composition)
- Move = SQL stored procedures, TypeScript = SQL queries
- PTBs live in `facilitator/src/` and `widget/src/` (NOT in `move/`)

---

## 📚 Documentation Structure

```
Pay402/docs/
├── ARCHITECTURE.md              ← Main architecture document (2,366 lines)
│   ├── Quick Start Summary
│   ├── System Architecture
│   ├── Complete User Flow
│   ├── Component Details
│   │   ├── 1. Move Contract
│   │   ├── 2. Facilitator API
│   │   ├── 3. Browser Widget
│   │   └── 4. Widget Deployment Model ← NEW!
│   ├── Demo Setup
│   ├── Technical Specifications
│   │   ├── PTB Mental Model ← NEW!
│   │   ├── Blockchain Details
│   │   ├── API Performance
│   │   ├── Anti-Front-Running
│   │   └── Security
│   ├── Development Roadmap
│   └── Resources & References
│
├── WIDGET_DEPLOYMENT.md         ← NEW! Quick reference (320 lines)
│   ├── Key Question Answered
│   ├── Physical Location
│   ├── Merchant Integration
│   ├── Runtime Flow
│   ├── Common Misconceptions
│   ├── Build & Deploy Process
│   ├── Security (SRI, versioning)
│   ├── Demo Setup
│   └── Mental Model Summary
│
└── ARCHITECTURE_UPDATES.md      ← This file
```

---

## 🆕 What Was Added

### Widget Deployment Model (ARCHITECTURE.md)

**Physical Architecture:**
```
Build Process:
  widget/src/*.tsx 
    → webpack (TypeScript → JS, minify) 
    → widget/dist/widget.js 
    → CDN upload 
    → https://cdn.pay402.com/widget.js

Merchant Integration:
  <script src="https://cdn.pay402.com/widget.js"></script>
  <script>Pay402.init({ ... })</script>

Runtime:
  Page load 
    → Widget downloads 
    → Intercepts fetch() 
    → Listens for 402 
    → Shows modal when detected 
    → Handles payment 
    → Retries with token
```

**Key Sections:**
1. Physical deployment architecture (diagram)
2. Runtime behavior (lifecycle)
3. Distribution model comparison (table)
4. Build & deployment process
5. Security considerations (SRI, XSS, versioning)
6. Demo setup with visual flow
7. Real-world examples (Stripe, PayPal, Google Analytics)

### PTB Mental Model (ARCHITECTURE.md)

**SUI vs EVM Comparison:**
```
EVM/Solidity:
  - Contract orchestrates (calls other contracts)
  - TypeScript just triggers entry point
  - Composition happens IN CONTRACT

SUI/Move:
  - Move functions are pure logic only
  - TypeScript orchestrates (builds PTB)
  - Composition happens IN CLIENT (TypeScript)
```

**Where PTBs Live:**
```
pay402/
├── move/payment/sources/payment.move    ← Pure logic (NO PTBs!)
├── facilitator/src/api/settle-payment.ts ← PTB construction ✅
└── widget/src/ZkLoginManager.ts          ← PTB construction ✅
```

**Key Sections:**
1. SUI/Move model vs EVM/Solidity model (diagrams)
2. Key differences table (orchestration, role, flexibility)
3. Where PTBs live in codebase
4. Example: Payment settlement PTB (side-by-side)
5. Why this matters (what goes where)
6. Mental model summary (SQL analogy)

---

## 📊 Visual Comparisons Added

### Widget Distribution Models
| Model | User Install? | Merchant Effort | Our Choice |
|-------|--------------|-----------------|-----------|
| Browser Extension | ❌ Yes | Low | ❌ Friction |
| **Embedded Widget** | ✅ No | Very Low | ✅ **CHOSEN** |
| Native Protocol | ✅ No | None | ❌ Not available |
| Separate App | ❌ Yes | High | ❌ Context switch |

### PTB Construction: SUI vs EVM
| Aspect | EVM/Solidity | SUI/Move |
|--------|-------------|----------|
| Orchestration | In contract (Solidity) | In client (TypeScript) |
| Contract Role | Entry point + logic | Pure functions only |
| Transaction Construction | Contract decides flow | Client decides flow |
| Flexibility | Fixed in contract | Dynamic per call |

---

## 🔄 Documentation Flow

```
Question 1: "Where does widget live?"
    ↓
ARCHITECTURE.md → Section 4: Widget Deployment Model
    ↓
WIDGET_DEPLOYMENT.md → Quick Reference
    ↓
Answer: CDN-hosted, merchant-embedded (Stripe model)

Question 2: "Where are PTBs constructed?"
    ↓
ARCHITECTURE.md → PTB Mental Model
    ↓
Answer: In TypeScript (facilitator & widget), NOT in Move!
```

---

## ✅ Completeness Checklist

### Widget Documentation
- [x] Physical deployment location (CDN)
- [x] Merchant integration (one `<script>` tag)
- [x] Runtime behavior (load → intercept → modal → retry)
- [x] Distribution model comparison
- [x] Build & deployment process
- [x] Security (SRI, versioning)
- [x] Demo setup
- [x] Common misconceptions addressed
- [x] Real-world examples (Stripe, PayPal)

### PTB Documentation
- [x] Where PTBs are constructed (TypeScript)
- [x] SUI vs EVM mental model
- [x] Client-side vs contract-side composition
- [x] Where PTBs live in codebase
- [x] Move contract role (pure logic only)
- [x] TypeScript role (orchestration)
- [x] Side-by-side code examples
- [x] Key differences table
- [x] Mental model summary (SQL analogy)

---

## 🎯 Key Takeaways

### Widget Deployment
```
NOT in 402 response! ❌
NOT a browser extension! ❌
NOT downloaded per API call! ❌

Pre-loaded via <script> tag ✅
Runs on merchant's page ✅
Zero user installation ✅
Stripe/PayPal model ✅
```

### PTB Construction
```
NOT in Move contracts! ❌
NOT in smart contract logic! ❌

In TypeScript (facilitator) ✅
In TypeScript (widget) ✅
Client-side orchestration ✅
Move = pure functions only ✅
```

---

## 🚀 Ready for Implementation

**Git Status:**
```bash
13 commits total
Latest 3:
  - e4ab438: docs: add PTB mental model
  - 41893f3: docs: add widget deployment quick reference
  - a99d13d: docs: add comprehensive widget deployment architecture
```

**Architecture Status:**
- ✅ 100% complete
- ✅ All questions resolved
- ✅ Mental models documented
- ✅ Ready to code!

**Next Step:**
```bash
cd /home/hamiha70/Projects/ETHGlobal/HackMoney_Jan26/Pay402
# Create move/ folder and start coding Move contract
```

---

## 📖 Reading Guide

**For Quick Understanding:**
1. Read `WIDGET_DEPLOYMENT.md` (5 min)
2. Read `ARCHITECTURE.md` - PTB Mental Model section (5 min)

**For Deep Dive:**
1. Read `ARCHITECTURE.md` - Complete (30 min)
2. Focus on:
   - Section 4: Widget Deployment Model
   - Technical Specifications: PTB Mental Model
   - Component Details (Facilitator API, Browser Widget)

**For Implementation:**
1. Start with Move contract (`move/payment/sources/payment.move`)
2. Then Facilitator API (`facilitator/src/api/settle-payment.ts`)
3. Then Widget (`widget/src/Pay402.ts`, `ZkLoginManager.ts`)
4. Refer to ARCHITECTURE.md for each component's specifications

---

**Confidence: 100%** - Documentation is complete and accurate!

**Ready to build!** 🚀
