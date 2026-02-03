# Pay402 - Zero-Friction x402 Payments on SUI

**The first x402 payment facilitator with Google login → blockchain payments. No wallet installation required.**

🏆 **ETH Global HackMoney January 2026**  
⛓️ **Built on SUI Blockchain**  
🎯 **Live Demo:** [demo.pay402.com](https://demo.pay402.com) (coming soon)

---

## What is Pay402?

Pay402 enables **micropayments for API access** using the x402 HTTP status code, with zero-friction onboarding via zkLogin.

**Traditional crypto payments:**
```
❌ Install wallet extension (MetaMask, etc.)
❌ Save seed phrase (scary!)
❌ Buy crypto on exchange
❌ Connect wallet to every site
❌ Approve transaction in popup
```

**Pay402:**
```
✅ Click link
✅ Login with Google
✅ Pay
✅ Done!
```

**That's it. 3 clicks. No wallet. No crypto knowledge.**

---

## How It Works

### User Flow (60 Seconds)

1. User visits merchant API
2. Gets 402 Payment Required
3. Widget appears: "Login with Google"
4. User logs in (familiar Google OAuth)
5. **Magic:** Blockchain address created from Google account
6. **Magic:** Balance checked automatically
7. User confirms payment ($0.01)
8. Content delivered!

### Behind the Scenes

- **zkLogin:** Google OAuth → SUI address (no wallet needed!)
- **Facilitator:** Verifies payment, settles on blockchain
- **Smart Contract:** Generic `Coin<T>` payment settlement (SUI Move)
- **Embedded Widget:** Like Stripe (merchant adds one script tag)

---

## Unique Features

### 1. zkLogin Integration ✨
**Only x402 facilitator with Google → blockchain address**

No other facilitator (Coinbase, PayAI) has this!

### 2. Embedded Widget 🎨
**Zero user installation**

Like Stripe/PayPal checkout (not a browser extension)

### 3. Generic Coin Support 💰
**Works with any SUI token**

USDC, SUI, USDT, custom tokens - all supported via `Coin<T>` generics

### 4. Fixed Fee Model 📊
**$0.01 per transaction** (not percentage-based)

Fair for micropayments, predictable revenue model

### 5. Anti-Front-Running 🛡️
**Atomic settlement prevents buyer attacks**

Uses `&mut Coin<T>` to lock coins during transaction

### 6. CCTP-Ready 🌉
**Future cross-chain payments**

Via Circle CCTP to Base, Ethereum, Solana, etc.

---

## Quick Start

### For Merchants (Add Widget)

```html
<!-- Add to your website -->
<script src="https://cdn.pay402.com/widget.js"></script>
<script>
  Pay402.init({
    facilitatorUrl: 'https://facilitator.pay402.com',
    googleClientId: 'YOUR_GOOGLE_CLIENT_ID'
  });
</script>
```

That's it! Your API now supports crypto micropayments.

### For Users (Zero Setup)

1. Click merchant's paywall link
2. Login with Google
3. Pay with one click
4. Content delivered

No wallet, no seed phrases, no crypto knowledge required.

---

## Architecture

```
┌──────────────────────────────────────────────────┐
│              User's Browser                      │
│  ┌────────────────────────────────────────────┐  │
│  │  Pay402 Widget                             │  │
│  │  - Detects 402 responses                   │  │
│  │  - Triggers zkLogin (Google)               │  │
│  │  - Auto-discovers SUI address              │  │
│  │  - Confirms payment                        │  │
│  └────────────────────────────────────────────┘  │
└──────────────┬──────────────┬──────────────┬─────┘
               │              │              │
               ↓              ↓              ↓
       ┌────────────┐  ┌────────────┐  ┌──────────┐
       │  Merchant  │  │ Facilitator│  │ SUI Chain│
       │  (x402)    │  │  (Build)   │  │ (Existing)│
       └────────────┘  └────────────┘  └──────────┘
```

**Components:**
1. **Move Contract (move/payment/):** Generic `Coin<T>` payment settlement with atomic transfers
2. **Facilitator API (facilitator/):** PTB construction, gas sponsorship, balance checking
3. **Merchant Service (merchant/):** Invoice generation (JWT), payment verification, content delivery
4. **Payment Widget (widget/):** zkLogin integration, PTB verification, payment UI
5. **Helper Scripts (scripts/):** Test fixture generation, dev environment setup

See [ARCHITECTURE.md](docs/architecture/ARCHITECTURE.md) for full details.

---

## Tech Stack

### Blockchain
- **SUI:** Move language, sub-second finality
- **USDC:** Native Circle USDC on SUI
- **zkLogin:** Google OAuth → blockchain address

### Backend
**Facilitator (facilitator/):**
- **Node.js + Express:** API server
- **@mysten/sui:** SUI SDK with gRPC client
- **TypeScript:** Type-safe development

**Merchant (merchant/):**
- **Node.js + Express:** Demo merchant service
- **jose:** JWT signing with Ed25519
- **JavaScript:** Lightweight implementation

### Frontend (Widget)
- **React + Vite:** UI components and dev server
- **@mysten/enoki:** zkLogin integration
- **TypeScript:** Type-safe development
- **Custom PTB Verifier:** Client-side transaction verification

### Infrastructure
- **Mysten Enoki:** Salt service (zkLogin)
- **Mysten Prover:** ZK proof generation
- **Circle Faucet:** Testnet USDC funding

---

## Project Structure

```
Pay402/
├── README.md                     # This file
├── PORT_STATUS.md                # Service ports reference
├── DOCS_INDEX.md                 # Documentation navigation
├── LICENSE                       # MIT License
├── docs/                         # Documentation
│   ├── architecture/             # System design
│   │   ├── ARCHITECTURE.md       # Detailed architecture
│   │   ├── COMPONENT_BREAKDOWN.md
│   │   └── DESIGN_RATIONALE.md
│   ├── development/              # Dev guides
│   │   ├── DEVELOPMENT_GUIDE.md
│   │   ├── TESTING.md
│   │   ├── GENERATE_TEST_FIXTURES.md
│   │   └── CODEBASE_AUDIT.md
│   ├── security/                 # Security analysis
│   │   └── PTB_VERIFIER_SECURITY.md
│   ├── deployment/               # Deployment guides
│   │   └── WIDGET_DEPLOYMENT.md
│   ├── reference/                # Technical reference
│   │   └── VERIFIER_EXPLAINER.md
│   └── archive/                  # Historical docs
├── move/payment/                 # SUI Move contracts
│   ├── Move.toml
│   ├── sources/
│   │   └── payment.move          # Generic Coin<T> settlement
│   └── tests/
│       └── payment_tests.move    # 18 comprehensive tests
├── facilitator/                  # Backend API
│   ├── package.json
│   ├── src/
│   │   ├── controllers/          # API endpoints
│   │   ├── __tests__/            # 37 passing tests
│   │   ├── utils/                # Helper functions
│   │   ├── config.ts             # Configuration
│   │   ├── sui.ts                # SUI client setup
│   │   └── index.ts              # Entry point
│   └── tsconfig.json
├── merchant/                     # Demo merchant service
│   ├── package.json
│   ├── src/
│   │   ├── controllers/          # Invoice & verification
│   │   ├── utils/                # JWT signing helpers
│   │   ├── config.js             # Configuration
│   │   └── index.js              # Entry point
│   └── public/
│       └── index.html            # Demo UI
├── widget/                       # Payment page (React)
│   ├── package.json
│   ├── src/
│   │   ├── components/           # React components
│   │   ├── lib/
│   │   │   └── verifier.ts       # PTB verification
│   │   ├── hooks/                # React hooks
│   │   ├── __fixtures__/         # Test fixtures
│   │   └── App.tsx               # Main app
│   └── vite.config.ts
└── scripts/                      # Helper scripts
    ├── generate-test-ptbs.js     # Fixture generation
    ├── pay402-tmux.sh            # Dev environment
    └── smoke-test.sh             # Full system test
```

---

## Development Status

### ✅ Completed
- [x] Architecture design
- [x] Technical specifications
- [x] Component breakdown
- [x] Security analysis
- [x] Demo flow design

### 🚧 In Progress (Hackathon)
- [ ] Move contract implementation
- [ ] Facilitator API development
- [ ] Widget implementation
- [ ] Demo page creation
- [ ] End-to-end testing

### 📅 Roadmap (Post-Hackathon)
- [ ] CCTP integration (cross-chain)
- [ ] Payment channels (AI agents)
- [ ] Merchant dashboard
- [ ] Analytics & monitoring
- [ ] Mainnet deployment

---

## Security

### zkLogin Security
- ✅ Non-custodial (user controls keys)
- ✅ ZK proofs (hide Google account on-chain)
- ✅ Salt prevents address enumeration
- ✅ Ephemeral keypairs (session-only)

### Payment Security
- ✅ Signature verification (prevent forgery)
- ✅ Nonce tracking (prevent replay)
- ✅ Anti-front-running (`&mut Coin<T>`)
- ✅ Token expiration (5-minute validity)
- ✅ Event logging (permanent audit trail)

### Infrastructure Security
- ✅ Open-source (full transparency)
- ✅ Subresource Integrity (CDN verification)
- ✅ Rate limiting (DDoS protection)
- ✅ Gas sponsorship limits (budget control)

---

## Economic Model

**Fixed Fee:** $0.01 per transaction (not percentage-based)

**Rationale:**
- Facilitator cost is fixed (gas ~$0.003 + overhead ~$0.002 = ~$0.005)
- Revenue should be fixed (infrastructure pricing, not payment processing)
- Fair for micropayments (10% of $0.10 is acceptable)
- Encourages high-value usage ($0.01 on $100 is trivial)

**Profit Margin:** ~50% ($0.005 cost, $0.01 revenue, $0.005 profit)

**Break-Even:** ~1,000 transactions/day → $10/day → $3,650/year  
**Sustainable:** ~10,000 transactions/day → $100/day → $36,500/year

---

## Getting Started

### Prerequisites
- Node.js 18+
- SUI CLI + Suibase (for local blockchain)
- Google OAuth credentials (for zkLogin)

### Quick Setup

```bash
# 1. Start local SUI network
localnet start

# 2. Deploy Move contract
cd move/payment
sui move build
sui client publish --gas-budget 100000000

# 3. Start all services (tmux)
cd ../../
./scripts/pay402-tmux.sh

# 4. Visit in browser
# Merchant: http://localhost:3002
# Payment Page: http://localhost:5173
# Facilitator API: http://localhost:3001/health
```

### Manual Setup (Alternative)

```bash
# Terminal 1: Facilitator
cd facilitator
npm install
npm run dev

# Terminal 2: Merchant
cd merchant
npm install
npm start

# Terminal 3: Widget
cd widget
npm install
npm run dev
```

See [DEVELOPMENT_GUIDE.md](docs/development/DEVELOPMENT_GUIDE.md) for detailed setup instructions.

---

## Demo

### Live Demo (Coming Soon)
**URL:** https://demo.pay402.com

### Video Demo
[Watch on YouTube](https://youtube.com/...) (coming soon)

### Testing Locally

```bash
# 1. Start services
./scripts/pay402-tmux.sh

# 2. Visit merchant demo
open http://localhost:3002

# 3. Click "Get Premium Data"
# 4. Copy invoice JWT
# 5. Paste in payment page: http://localhost:5173
```

---

## Resources

### Documentation
- [Documentation Index](DOCS_INDEX.md) - Central navigation hub
- [Architecture Guide](docs/architecture/ARCHITECTURE.md) - Complete technical design
- [Development Guide](docs/development/DEVELOPMENT_GUIDE.md) - Setup and build
- [Testing Guide](docs/development/TESTING.md) - Test strategy
- [Widget Deployment](docs/deployment/WIDGET_DEPLOYMENT.md) - Production deployment

### External Links
- **SUI:** https://docs.sui.io/
- **zkLogin:** https://docs.sui.io/guides/developer/cryptography/zklogin-integration
- **x402 Protocol:** https://docs.cdp.coinbase.com/x402/
- **Circle USDC:** https://developers.circle.com/stablecoins/sui

---

## Contributing

We welcome contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

### Areas We Need Help
- [ ] Additional token support (beyond USDC)
- [ ] Mobile SDKs (iOS/Android)
- [ ] Browser extension (backup option)
- [ ] Merchant dashboard
- [ ] Analytics & monitoring

---

## License

MIT License - see [LICENSE](LICENSE) for details.

---

## Team

**Hackathon Team:**
- Architecture & Smart Contracts
- Facilitator Backend
- Widget Frontend
- Documentation & Demo

**Contact:** [Email or Discord]

---

## Acknowledgments

- **Mysten Labs:** zkLogin technology and SUI blockchain
- **Coinbase:** x402 protocol specification
- **Circle:** USDC stablecoin and CCTP
- **ETH Global:** Hackathon organization

---

## Support

- **Issues:** [GitHub Issues](https://github.com/yourusername/pay402/issues)
- **Discussions:** [GitHub Discussions](https://github.com/yourusername/pay402/discussions)
- **Discord:** [Join our Discord](https://discord.gg/...) (coming soon)

---

**Built with ❤️ for ETH Global HackMoney 2026**

**Bringing Stripe-level UX to crypto micropayments!** 🚀
