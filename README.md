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
1. **Move Contract:** Generic `Coin<T>` payment settlement (4-6 hours)
2. **Facilitator API:** Balance checking, verification, settlement (8-10 hours)
3. **Browser Widget:** zkLogin + x402 integration (8-10 hours)
4. **Demo Page:** Showcase implementation (2 hours)

**Total Build Time:** 24 hours (hackathon-ready!)

See [ARCHITECTURE.md](docs/ARCHITECTURE.md) for full details.

---

## Tech Stack

### Blockchain
- **SUI:** Move language, sub-second finality
- **USDC:** Native Circle USDC on SUI
- **zkLogin:** Google OAuth → blockchain address

### Backend (Facilitator)
- **Node.js + Express:** API server
- **@mysten/sui.js:** SUI SDK
- **Bull:** Job queue for async settlement
- **TypeScript:** Type-safe development

### Frontend (Widget)
- **React:** UI components
- **@mysten/dapp-kit:** zkLogin integration
- **@x402/fetch:** x402 protocol client
- **TypeScript:** Compiled to JavaScript for embedding

### Infrastructure
- **Mysten Enoki:** Salt service (zkLogin)
- **Mysten Prover:** ZK proof generation
- **Circle Faucet:** Testnet USDC funding

---

## Project Structure

```
pay402/
├── README.md                     # This file
├── LICENSE                       # MIT License
├── docs/
│   ├── ARCHITECTURE.md           # Detailed architecture (READ THIS!)
│   ├── DEMO.md                   # Demo script & video
│   ├── API_REFERENCE.md          # Facilitator API docs
│   └── DEPLOYMENT.md             # Deployment guide
├── contracts/                    # SUI Move contracts
│   ├── Move.toml
│   ├── sources/
│   │   └── payment.move          # Generic Coin<T> settlement
│   └── tests/
│       └── payment_tests.move
├── facilitator/                  # Backend API
│   ├── package.json
│   ├── src/
│   │   ├── api/                  # API endpoints
│   │   ├── services/             # SUI client, queue, etc.
│   │   └── index.ts
│   └── Dockerfile
├── widget/                       # Frontend widget
│   ├── package.json
│   ├── src/
│   │   ├── Pay402.ts             # Main widget class
│   │   ├── ZkLoginManager.ts     # zkLogin integration
│   │   └── components/           # React components
│   └── webpack.config.js
├── demo/                         # Demo page
│   ├── index.html
│   └── assets/
└── scripts/                      # Build & deployment scripts
    ├── deploy-contract.sh
    ├── setup-facilitator.sh
    └── test-flow.sh
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
- SUI CLI (for contract development)
- Google OAuth credentials

### Setup

```bash
# Clone repository
git clone https://github.com/yourusername/pay402.git
cd pay402

# Install dependencies
npm install

# Set up environment
cp .env.example .env
# Edit .env with your credentials

# Deploy contract
cd contracts
sui move build
sui client publish --gas-budget 100000000

# Start facilitator
cd ../facilitator
npm run dev

# Build widget
cd ../widget
npm run build

# Run demo
cd ../demo
npm start
```

See [ARCHITECTURE.md](docs/ARCHITECTURE.md) for detailed setup instructions.

---

## Demo

### Live Demo (Coming Soon)
**URL:** https://demo.pay402.com

### Video Demo
[Watch on YouTube](https://youtube.com/...) (coming soon)

### Demo Script (60 seconds)
See [DEMO.md](docs/DEMO.md) for full script and recording instructions.

---

## Resources

### Documentation
- [Architecture Guide](docs/ARCHITECTURE.md) - Complete technical design
- [API Reference](docs/API_REFERENCE.md) - Facilitator API docs
- [Deployment Guide](docs/DEPLOYMENT.md) - Production deployment

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
