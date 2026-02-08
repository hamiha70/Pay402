# Pay402 - First x402 Facilitator on SUI

**Zero-friction micropayments for the $600M x402 ecosystem. Google OAuth → Blockchain payments in 600ms. No wallet required.**

🏆 **ETH Global HackMoney January 2026**  
⛓️ **SUI Testnet** | 🎯 **Live Demo:** https://merchant-production-0255.up.railway.app  
📊 **Architecture:** [Flow Diagram](./docs/ARCHITECTURE.md) | 💰 **Example Transaction:** [SuiScan](https://suiscan.xyz/testnet/tx/EV7D7z9gjzjrAQSKWSW8S1iLGdk8aEVPjn3zLA1aUSLE)

**Deployed Services (Railway):**

| Service           | URL                                             |
| ----------------- | ----------------------------------------------- |
| **Facilitator**   | https://pay402-production.up.railway.app        |
| **Widget**        | https://widget-production-8b65.up.railway.app   |
| **Merchant Demo** | https://merchant-production-0255.up.railway.app |

**Smart Contract (SUI Testnet):**

- Package: `0x5f32be9e6eee3aab5c64c2f2df6c7e5e83f0e683fd83fda9bb66aa05b063f1ca`
- Module: `x402_payment`
- Example Transaction: [View on SuiScan](https://suiscan.xyz/testnet/tx/EV7D7z9gjzjrAQSKWSW8S1iLGdk8aEVPjn3zLA1aUSLE)

---

## The Problem: x402 Needs Better UX

### What is x402?

The **HTTP 402 "Payment Required"** status code enables machine-readable micropayments for:

- **API Monetization:** Pay-per-request pricing ($0.01-$1.00 per API call)
- **Content Paywalls:** Microtransactions for premium articles, datasets
- **AI Agent Commerce:** Autonomous agents purchasing resources

### x402 Market Context

**x402 is production-ready technology with massive adoption:**

- **$600M** annualized payment volume (Dec 2025)
- **63M+** monthly transactions
- **$7.5M** monthly USDC volume
- **1,100+** projects using the protocol
- **Live on Base** (Coinbase SDK) and **Solana** (PayAI)

**The Opportunity:** SUI has NO x402 facilitator. We're first.

### Current Limitations (Base/Solana)

Existing x402 implementations face user friction:

- ❌ Require wallet extensions (high friction for new users)
- ❌ Users need native gas tokens (ETH, SOL) in addition to USDC
- ❌ Slow finality on EVM chains (12+ minutes on L1)
- ❌ No seamless Web2 → Web3 onboarding

### Pay402's Innovation: First on SUI

**We leverage SUI-native capabilities to deliver the best x402 implementation:**

---

## Why SUI? Six Unique Advantages

Pay402 leverages SUI-specific capabilities that are **difficult or impossible on EVM/Solana:**

### 1. Onboarding Non-Crypto Users (zkLogin + Enoki)

- **Google OAuth → blockchain address** (deterministic derivation)
- No seed phrases, no wallet installation, no crypto knowledge
- **Pay402 benefit:** 3-click payment flow vs. 10+ steps on other chains

### 2. No Browser Wallet (Gas Sponsorship - Native)

- **Facilitator pays all gas fees** transparently
- User needs only USDC, no SUI tokens required
- **Pay402 benefit:** True Web2 UX, zero gas complexity for users

### 3. Low Latency (Sub-Second Finality)

- **600-700ms blockchain settlement** on testnet
- Real-time payment confirmation
- **Pay402 benefit:** Instant content delivery, superior to EVM's 12+ minutes

### 4. Audit & Conflict Resolution (Cheap On-Chain Events)

- **~$0.0003 per receipt** event (vs $0.50-$5 on EVM)
- Permanent, queryable audit trail
- **Pay402 benefit:** Every payment emits receipt for merchant reconciliation

### 5. Flexible Extensions (Programmable Transaction Blocks)

- **Atomic multi-step transactions** with single signature
- Client-side verification before signing
- **Pay402 benefit:** Split coin + payment + receipt in one transaction

### 6. Massive Scaling (Object Model - Owned Objects)

- **Parallel execution** without shared state bottlenecks
- No global state coordination overhead
- **Pay402 benefit:** Unlimited scalability, no race conditions

---

## User Experience: 3 Clicks vs Traditional Crypto

**Traditional crypto payments:**

```
❌ Install wallet extension (MetaMask, etc.)
❌ Save seed phrase (12-24 words)
❌ Buy crypto on exchange (KYC, wait days)
❌ Transfer to wallet (pay gas, wait confirmation)
❌ Connect wallet to every site
❌ Approve transaction in popup

Total: Days of setup + 6+ steps per payment
```

**Pay402 with zkLogin:**

```
✅ Click merchant link
✅ Login with Google (familiar OAuth)
✅ Confirm payment (1-click)

Total: 3 clicks, 5 seconds, zero crypto knowledge
```

---

## What We Built

**Hackathon Achievements (ETH Global HackMoney 2026):**

| Achievement                | Status      | Technology           |
| -------------------------- | ----------- | -------------------- |
| **OAuth Login**            | ✅ Complete | zkLogin + Enoki SDK  |
| **Gas Sponsorship**        | ✅ Complete | Native SUI PTBs      |
| **PTB Validation**         | ✅ Complete | Client-side verifier |
| **zkLogin Signing**        | ✅ Complete | 1-click payments     |
| **Optimistic Settlement**  | ✅ Complete | Instant delivery     |
| **Pessimistic Settlement** | ✅ Complete | 600-700ms finality   |
| **USDC Persistence**       | ✅ Complete | Circle native USDC   |
| **Merchant Onboarding**    | ✅ Complete | JWT invoices         |
| **On-Chain Receipts**      | ✅ Complete | $0.0003 per event    |

**Testing:** 276 automated tests passing  
**Deployment:** Live on Railway (facilitator + widget + merchant)  
**Network:** SUI Testnet with real Circle USDC

---

## How It Works

### Payment Flow

1. **User visits merchant API** → Gets 402 Payment Required
2. **Widget appears** → "Login with Google"
3. **OAuth authentication** → Google account (familiar flow)
4. **Address creation** → Deterministic SUI address from OAuth (zkLogin magic)
5. **Balance check** → Automatic USDC balance verification
6. **PTB verification** → Widget validates transaction before signing
7. **Payment confirmation** → 1-click sign with zkLogin
8. **Content delivered** → 600-700ms later, with blockchain receipt

### Architecture Components

- **zkLogin:** Google OAuth → SUI address (no wallet needed!)
- **Facilitator:** PTB builder, gas sponsor, balance checker
- **Smart Contract:** Generic `Coin<T>` payment settlement (SUI Move)
- **Widget:** Embeddable payment UI (like Stripe checkout)

**📊 Detailed Architecture:** [View Flow Diagrams](./docs/ARCHITECTURE.md)

---

## Quick Start

### Try the Live Demo (No Setup Required)

**🎯 Visit:** https://merchant-production-0255.up.railway.app

1. Click "Get Premium Data" (triggers HTTP 402)
2. Login with Google (zkLogin authentication)
3. Get test USDC from faucet (automatic, first time only)
4. Review and confirm payment (0.1 USDC)
5. Content delivered with blockchain receipt!

**What you'll see:**

- OAuth login (no wallet extension)
- Automatic SUI address creation
- PTB verification before signing
- Transaction confirmation (~600-700ms)
- On-chain receipt with payment details

---

## Development Setup

### Prerequisites

- **Node.js 18+** - [Download](https://nodejs.org/)
- **SUI CLI** - [Install Guide](https://docs.sui.io/build/install)
- **Enoki Account** - [Sign up](https://portal.enoki.mystenlabs.com)
- **Google OAuth** - [Create credentials](https://console.cloud.google.com)

### Quick Start (Local Development)

```bash
# 1. Clone and install
git clone https://github.com/hamiha70/Pay402.git
cd Pay402
npm install

# 2. Configure (interactive script)
./scripts/setup-env.sh

# 3. Start services
./scripts/pay402-tmux.sh --localnet

# 4. Visit http://localhost:3002
```

**Setup takes ~5 minutes.** See [Developer Docs](./docs/developer/) for detailed instructions.

---

## Documentation

### Judge-Facing Docs

- **[PROBLEM_STATEMENT.md](./docs/PROBLEM_STATEMENT.md)** - Market context and Pay402's value
- **[ARCHITECTURE.md](./docs/ARCHITECTURE.md)** - System design with Mermaid diagrams
- **[TRUST_MODEL.md](./docs/TRUST_MODEL.md)** - Security model and threat analysis

### Developer Docs

- **[Testing Guide](./docs/developer/testing.md)** - Comprehensive test strategy
- **[Railway Deployment](./docs/developer/railway-deployment.md)** - Production deployment
- **[Enoki Setup](./docs/developer/enoki-portal.md)** - zkLogin configuration
- **[Setup Scripts](./docs/developer/setup-scripts.md)** - Development helpers

### Component READMEs

- **[facilitator/README.md](./facilitator/README.md)** - Backend API docs
- **[widget/README.md](./widget/README.md)** - Payment widget with zkLogin
- **[merchant/README.md](./merchant/README.md)** - Demo merchant implementation

---

## Tech Stack

### Blockchain Layer

- **SUI Move:** Smart contracts with generic `Coin<T>` support
- **zkLogin:** Google OAuth → blockchain address (Enoki SDK)
- **PTBs:** Atomic multi-step transactions
- **USDC:** Circle native stablecoin on SUI

### Backend (Facilitator)

- **Node.js + Express:** API server
- **@mysten/sui:** SUI SDK with gRPC
- **TypeScript:** Type-safe development

### Frontend (Widget)

- **React + Vite:** UI framework
- **@mysten/enoki:** zkLogin integration
- **Custom PTB Verifier:** Client-side security

### Infrastructure

- **Mysten Enoki:** Salt service for zkLogin
- **Railway:** Deployment platform
- **Circle Faucet:** Testnet USDC funding

---

## Project Structure

```
Pay402/
├── move/payment/              # SUI Move contracts
│   └── sources/payment.move   # Generic Coin<T> settlement
├── facilitator/               # Backend API (Node.js)
│   ├── src/controllers/       # PTB builder, gas sponsor
│   └── __tests__/             # 37 passing tests
├── widget/                    # Payment UI (React)
│   ├── src/components/        # React components
│   ├── lib/verifier.ts        # PTB verification
│   └── __tests__/             # Widget tests
├── merchant/                  # Demo merchant (Node.js)
│   └── src/controllers/       # Invoice generation
├── scripts/                   # Development helpers
└── docs/                      # Documentation
    ├── ARCHITECTURE.md        # System design
    ├── TRUST_MODEL.md         # Security model
    └── PROBLEM_STATEMENT.md   # Market context
```

---

## Roadmap

### Immediate Next Steps

- [ ] Mainnet deployment
- [ ] Production monitoring (Sentry, uptime)
- [ ] Multi-region facilitator nodes

### Short-Term Goals

- [ ] Browser extension (universal PTB verifier)
- [ ] Embeddable widget (npm package)
- [ ] Merchant SDK for easy integration

### Long-Term Vision

- [ ] CCTP integration (cross-chain settlement)
- [ ] Additional stablecoin support
- [ ] Merchant dashboard for reconciliation
- [ ] Payment channels for AI agents

---

## Resources

### External Documentation

- **SUI Blockchain:** https://docs.sui.io/
- **zkLogin Guide:** https://docs.sui.io/guides/developer/cryptography/zklogin-integration
- **x402 Protocol:** https://docs.cdp.coinbase.com/x402/
- **Circle USDC:** https://developers.circle.com/stablecoins/sui

### Network Explorer

- **SUI Testnet:** https://suiscan.xyz/testnet
- **Example Transaction:** https://suiscan.xyz/testnet/tx/EV7D7z9gjzjrAQSKWSW8S1iLGdk8aEVPjn3zLA1aUSLE

---

## Security Considerations

### zkLogin Security

- ✅ Non-custodial (user controls ephemeral keys)
- ✅ ZK proofs (Google account not revealed on-chain)
- ✅ Salt prevents address enumeration
- ✅ Session-only keys (ephemeral keypairs)

### Payment Security

- ✅ Client-side PTB verification (prevents overcharging)
- ✅ Signature verification (prevents forgery)
- ✅ Owned objects (parallel execution, no race conditions)
- ✅ Event logging (permanent audit trail)

### Infrastructure Security

- ✅ Open-source (full transparency)
- ✅ Rate limiting (DDoS protection)
- ✅ Gas budget limits (cost control)

**Detailed Security Analysis:** [TRUST_MODEL.md](./docs/TRUST_MODEL.md)

---

## License

MIT License - see [LICENSE](LICENSE) for details.

---

## Acknowledgments

- **Mysten Labs:** zkLogin technology, SUI blockchain, Enoki SDK
- **Coinbase:** x402 protocol specification and ecosystem
- **Circle:** USDC stablecoin and future CCTP integration
- **ETH Global:** HackMoney hackathon organization and support

---

## Support

- **GitHub Issues:** [Report bugs](https://github.com/hamiha70/Pay402/issues)
- **Documentation:** [Browse docs](./docs/)
- **Live Demo:** [Try it now](https://merchant-production-0255.up.railway.app)

---

**Built for ETH Global HackMoney 2026**

**Bringing Stripe-level UX to crypto micropayments on SUI!** 🚀

### High-Level Overview

```
┌──────────────────────────────────────────────────┐
│              User's Browser                      │
│  ┌────────────────────────────────────────────┐  │
│  │  Pay402 Widget (React + Enoki)             │  │
│  │  - zkLogin authentication (Google OAuth)   │  │
│  │  - PTB verification before signing         │  │
│  │  - Transaction signing with zkLogin        │  │
│  │  - Payment UX & receipts                   │  │
│  └────────────────────────────────────────────┘  │
└──────────────┬──────────────┬──────────────┬─────┘
               │              │              │
               ↓              ↓              ↓
       ┌────────────┐  ┌────────────┐  ┌──────────┐
       │  Merchant  │  │ Facilitator│  │ SUI Chain│
       │  (x402)    │  │  (Backend) │  │ (Testnet)│
       │            │  │  - Build   │  │          │
       │  Serves    │  │    PTBs    │  │ zkLogin  │
       │  Premium   │  │  - Sponsor │  │ PTBs     │
       │  Content   │  │    Gas     │  │ USDC     │
       │            │  │  - Submit  │  │ Events   │
       └────────────┘  └────────────┘  └──────────┘
```

### Deployed Services (Railway)

| Service           | URL                                             | Purpose                               |
| ----------------- | ----------------------------------------------- | ------------------------------------- |
| **Facilitator**   | https://pay402-production.up.railway.app        | Backend API, PTB builder, gas sponsor |
| **Widget**        | https://widget-production-8b65.up.railway.app   | Payment UI, zkLogin integration       |
| **Merchant Demo** | https://merchant-production-0255.up.railway.app | Demo x402 merchant with paywall       |

**Components:**

1. **Move Contract (move/payment/):** Generic `Coin<T>` payment settlement with atomic transfers
2. **Facilitator API (facilitator/):** PTB construction, gas sponsorship, balance checking
3. **Merchant Service (merchant/):** Invoice generation (JWT), payment verification, content delivery
4. **Payment Widget (widget/):** zkLogin integration, PTB verification, payment UI
5. **Helper Scripts (scripts/):** Test fixture generation, dev environment setup

See [ARCHITECTURE.md](docs/ARCHITECTURE.md) for full details.

---

## Documentation

**Key Documents:**

- [docs/PROBLEM_STATEMENT.md](./docs/PROBLEM_STATEMENT.md) - Market context and Pay402's value proposition
- [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md) - System architecture with Mermaid diagrams
- [docs/TRUST_MODEL.md](./docs/TRUST_MODEL.md) - Security model and threat analysis

**Developer Docs:**

- [docs/developer/testing.md](./docs/developer/testing.md) - Comprehensive testing guide
- [docs/developer/railway-deployment.md](./docs/developer/railway-deployment.md) - Railway deployment instructions
- [docs/developer/enoki-portal.md](./docs/developer/enoki-portal.md) - Enoki zkLogin setup
- [docs/developer/setup-scripts.md](./docs/developer/setup-scripts.md) - Development scripts

**Component READMEs:**

- [facilitator/README.md](./facilitator/README.md) - Facilitator API documentation
- [merchant/README.md](./merchant/README.md) - Merchant demo implementation
- [widget/README.md](./widget/README.md) - Payment widget with dual auth (zkLogin/keypair)

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
- ✅ Owned objects (parallel execution, no shared state)
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

## Network Configuration

Pay402 supports **localnet**, **testnet**, and **mainnet** with automatic configuration switching via environment variables.

> 📘 **Full Testnet Deployment Guide:** See [TESTNET-DEPLOYMENT.md](TESTNET-DEPLOYMENT.md) for detailed testnet deployment instructions, including wallet setup, contract deployment, and troubleshooting.

### 🎛️ Network Switching (Single Environment Variable)

```bash
# Switch entire stack to testnet
export SUI_NETWORK=testnet

# Or stay on localnet (default)
export SUI_NETWORK=localnet
```

**What auto-configures:**

- ✅ RPC endpoint (localhost → Sui fullnode)
- ✅ Payment coin (MockUSDC → Circle USDC)
- ✅ Timeouts (100ms → 2000ms)
- ✅ CLI commands (`lsui` → `tsui`)
- ✅ Explorer URLs (none → suiscan.xyz)
- ✅ Faucet (embedded → Circle)
- ✅ Security rules (SUI payments allowed → blocked)

### 📍 Network Configurations

| Network      | RPC URL                           | Payment Coin | CLI Tool | Confirmation Time |
| ------------ | --------------------------------- | ------------ | -------- | ----------------- |
| **Localnet** | `http://127.0.0.1:9000`           | MockUSDC     | `lsui`   | ~50ms             |
| **Testnet**  | `https://fullnode.testnet.sui.io` | Circle USDC  | `tsui`   | ~1.5s             |
| **Mainnet**  | Not yet supported                 | Circle USDC  | `sui`    | ~2s               |

### 🔧 What YOU Configure (Per Network)

#### Localnet Setup

```bash
# 1. Start blockchain
sui start --with-faucet

# 2. Deploy contracts (auto-configures .env)
./scripts/deploy-mock-usdc.sh
cd move/payment && sui client publish

# 3. Done! Everything else is automatic
export SUI_NETWORK=localnet  # or leave unset (default)
```

#### Testnet Setup

```bash
# 1. Create wallet and fund it
sui client new-address ed25519
sui client switch --env testnet

# 💡 Recommended: Set as Treasury/Deployer (active address)
# This becomes your main testnet account that funds other test addresses
sui client switch --address <your-new-address-alias>

# Fund the Treasury/Deployer address
# Get SUI: https://faucet.testnet.sui.io/
# Get USDC: https://faucet.circle.com (20 USDC per 2 hours)

# 2. Deploy contract
cd move/payment
sui client publish --gas-budget 100000000
# Save the PACKAGE_ID from output

# 3. Find Circle USDC address
# Check: https://developers.circle.com/stablecoins/docs/usdc-on-test-networks
# Or search: "Circle USDC Sui testnet"

# 4. Configure environment
export SUI_NETWORK=testnet
export PACKAGE_ID=0x...        # From step 2
export USDC_TYPE=0x...         # From step 3
export FACILITATOR_PRIVATE_KEY=suiprivkey1q...  # Your wallet

# 5. Validate configuration
cd facilitator
npm run validate-network
```

### 📁 .env File Locations

```
Pay402/
├── facilitator/.env          # Backend configuration
│   SUI_NETWORK=localnet
│   PACKAGE_ID=0x...
│   USDC_TYPE=0x...
│   FACILITATOR_PRIVATE_KEY=...
│   PORT=3001
│
├── merchant/.env             # Merchant configuration
│   MERCHANT_PRIVATE_KEY=...
│   PORT=3002
│
└── widget/.env               # Frontend build config
    VITE_FACILITATOR_URL=http://localhost:3001
    VITE_GOOGLE_CLIENT_ID=...
```

**Important**: The widget `.env` is for **build-time** only. Network switching happens server-side in the facilitator.

### 🔍 Validation

Before deploying to a new network, validate your configuration:

```bash
cd facilitator
npm run validate-network
```

**Output:**

```
✅ Network: Testnet
   RPC URL: https://fullnode.testnet.sui.io:443
   Payment Coin: USDC (6 decimals)

🔐 Security Settings:
   Block SUI Payments: ✅ ENABLED

💰 Funding Strategy: manual
   Circle Faucet: https://faucet.circle.com

🛠️ Helper Functions:
   CLI Command: tsui client tx-block <digest>
   Explorer URL: https://suiscan.xyz/testnet/tx/<digest>
   Optimistic Timeout: 2000ms
   Pessimistic Timeout: 5000ms
```

### 🚨 Critical Security: Block SUI Payments on Testnet

**Why?** On testnet/mainnet, the facilitator needs SUI for gas sponsorship. If users can pay with SUI, they'll drain your gas fund!

**Protection:**

- ✅ `blockSuiPayments: true` on testnet/mainnet (hardcoded in config)
- ⚠️ `blockSuiPayments: false` on localnet (allows SUI for testing)

The facilitator **automatically rejects** SUI payments on testnet:

```
❌ BLOCKED: Cannot use SUI for payments on Testnet!
   Use USDC to prevent draining gas fund.

   Why: Facilitator needs SUI for gas sponsorship.
   Using SUI for payments will drain the gas fund.
```

---

## Getting Started

### Prerequisites

**Required:**

- **Node.js 18+** - [Download](https://nodejs.org/)
- **SUI CLI** - [Installation Guide](https://docs.sui.io/build/install)
- **Suibase** (for localnet) - [Installation Guide](https://suibase.io/how-to/install.html)

**For zkLogin (Production):**

- **Enoki Account** - [Sign up](https://portal.enoki.mystenlabs.com)
- **Google OAuth Client ID** - [Create credentials](https://console.cloud.google.com)

---

### 🚀 **Quick Start (3 Steps)**

#### **Step 1: Clone and Install**

```bash
git clone https://github.com/hamiha70/Pay402.git
cd Pay402
npm install  # Installs all dependencies for facilitator, merchant, widget
```

#### **Step 2: Configure Environment (Interactive)**

```bash
./scripts/setup-env.sh
```

**What this does:**

- ✅ Creates configuration files for localnet and testnet
- ✅ Prompts for Enoki API key (get from [Enoki Portal](https://portal.enoki.mystenlabs.com))
- ✅ Prompts for Google OAuth Client ID (get from [Google Console](https://console.cloud.google.com))
- ✅ Auto-generates facilitator keys for both networks
- ✅ Updates all config files automatically

**Example prompts:**

```
Enter your Enoki API Key (public key): enoki_public_7edbeb7de...
Enter your Google OAuth Client ID: 300529773657-abc123.apps.googleusercontent.com
Do you want to auto-generate new keys? (y/n): y
```

**⏱️ Takes ~2 minutes**

#### **Step 3: Start Pay402**

**For Development (Localnet):**

```bash
./scripts/pay402-tmux.sh --localnet

# Visit:
# - Payment Widget: http://localhost:5173
# - Merchant Demo: http://localhost:3002
# - Facilitator API: http://localhost:3001/health
```

**For Testing (Testnet):**

```bash
# First, fund your facilitator (one-time)
sui client switch --env testnet
sui client faucet  # Funds active address

# Then start services
./scripts/pay402-tmux.sh --testnet

# Visit: http://localhost:5173
```

---

### ⚡ **That's It!**

You should now have Pay402 running locally. Try making a payment:

1. Visit http://localhost:3002 (merchant demo)
2. Click "Get Premium Data"
3. Login with Google
4. Confirm payment

---

### 📖 **First Time Setup Details**

<details>
<summary><b>Click to expand: What happens during setup</b></summary>

**Setup Script (`./scripts/setup-env.sh`) does:**

1. **Checks Prerequisites**

   - Verifies `sui` CLI is installed
   - Shows version information

2. **Copies Configuration Templates**

   - Creates working config files from `.example` templates
   - For facilitator, merchant, and widget
   - For both localnet and testnet

3. **Collects Shared Secrets (Once!)**

   - Enoki API Key - Used for zkLogin authentication
   - Google OAuth Client ID - Used for Google sign-in
   - Updates BOTH localnet and testnet configs (no double entry!)

4. **Generates Facilitator Keys**

   - Creates separate keys for localnet and testnet (security best practice)
   - Option to use existing keys if you prefer

5. **Shows Summary**
   - Lists all configured values
   - Shows next steps

**Time:** ~2-3 minutes total

</details>

<details>
<summary><b>Click to expand: Get Enoki API Key</b></summary>

1. Visit https://portal.enoki.mystenlabs.com
2. Sign up or log in
3. Create a new project (or use existing)
4. Copy the **Public API Key**
   - Format: `enoki_public_[64 hex characters]`
   - Example: `enoki_public_7edbeb7decb38349e30a6d900cdc8843...`
5. Paste into setup script when prompted

**Note:** Use the PUBLIC key, not the private key!

</details>

<details>
<summary><b>Click to expand: Get Google OAuth Client ID</b></summary>

1. Visit https://console.cloud.google.com
2. Create a new project (or use existing)
3. Enable "Google+ API"
4. Go to "Credentials" → "Create Credentials" → "OAuth 2.0 Client ID"
5. Application type: "Web application"
6. Authorized redirect URIs:
   - `http://localhost:5173`
   - `http://localhost:5173/zklogin-test`
7. Copy the Client ID
   - Format: `NNNNNNNN-XXXXXXXX.apps.googleusercontent.com`
   - Example: `300529773657-mfq7blj3s6i.apps.googleusercontent.com`
8. Paste into setup script when prompted

</details>

---

### 🔧 **Advanced Setup Options**

**Reconfigure Environment:**

```bash
./scripts/setup-env.sh --force  # Overwrites existing configs
```

**Manual Configuration:**
If you prefer to configure manually instead of using the setup script, see [ENV-TEMPLATE-STRATEGY.md](ENV-TEMPLATE-STRATEGY.md) for details.

**Network Switching:**

```bash
./scripts/pay402-tmux.sh --kill      # Stop current session
./scripts/pay402-tmux.sh --testnet   # Switch to testnet
./scripts/pay402-tmux.sh --localnet  # Switch back to localnet
```

See [NETWORK-SWITCHING.md](NETWORK-SWITCHING.md) for comprehensive network switching guide.

---

### 🆘 **Troubleshooting**

**"sui CLI not found"**

```bash
# Install Rust first
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Install SUI CLI
cargo install --locked --git https://github.com/MystenLabs/sui.git --branch testnet sui
```

**"Invalid Enoki API key format"**

- Make sure you're using the PUBLIC key (starts with `enoki_public_`)
- Don't use the PRIVATE key (starts with `enoki_private_`)

**"Invalid Google Client ID format"**

- Should end with `.apps.googleusercontent.com`
- Don't include spaces or quotes

**"Localnet not running"**

```bash
localnet start  # Start Suibase localnet
```

**Still stuck?**

- Check [ZKLOGIN-BREAKTHROUGH.md](ZKLOGIN-BREAKTHROUGH.md) for zkLogin troubleshooting
- See full docs: [DEVELOPMENT_GUIDE.md](docs/development/DEVELOPMENT_GUIDE.md)

### Network Configuration Files

Pay402 uses **network-specific configuration templates** to safely switch between environments:

```
facilitator/
  .env                      # Active config (updated by --localnet/--testnet flags)
  .env.localnet.example     # Complete localnet template (committed to git)
  .env.testnet.example      # Complete testnet template (committed to git)

merchant/
  .env                      # Active config
  .env.localnet.example     # Localnet template
  .env.testnet.example      # Testnet template

widget/
  .env.local                # Active config
  .env.localnet.example     # Localnet template
  .env.testnet.example      # Testnet template
```

**Why Complete Templates?**

- ✅ Each `.env.<network>` file contains ALL fields needed for that network
- ✅ Fields not used on a network are commented out (e.g., `MOCK_USDC_*` on testnet)
- ✅ Safe to copy: `cp .env.testnet → .env` replaces entire file with correct config
- ✅ No merge conflicts or missing fields
- ✅ Easy to understand what each network needs

**Example: Facilitator `.env.localnet.example`**

```env
# All localnet fields present:
PACKAGE_ID=0x1d1d...              # Localnet package
TREASURY_OWNER_PRIVATE_KEY=...    # For MockUSDC minting
MOCK_USDC_PACKAGE=...             # MockUSDC contract
# USDC_TYPE=                      # Not used on localnet (commented)
```

**Example: Facilitator `.env.testnet.example`**

```env
# All testnet fields present:
PACKAGE_ID=0x2999...              # Testnet package
USDC_TYPE=0xa1ec...               # Real Circle USDC
# TREASURY_OWNER_PRIVATE_KEY=     # Not used on testnet (commented)
# MOCK_USDC_PACKAGE=              # Not used on testnet (commented)
```

**Switching Networks:**

```bash
# Automatic (recommended):
./scripts/pay402-tmux.sh --testnet   # Copies .env.testnet.example → .env for all services

# Manual:
cp facilitator/.env.testnet.example facilitator/.env
cp merchant/.env.testnet.example merchant/.env
cp widget/.env.testnet.example widget/.env.local
```

---

## Demo

### Live Demo (Coming Soon)

**URL:** https://demo.pay402.com

### Video Demo

[Watch on YouTube](https://youtube.com/...) (coming soon)

### Testing Locally

```bash
# 1. Start services on localnet (easiest for testing)
./scripts/pay402-tmux.sh --localnet

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
- [Testnet Deployment](TESTNET-DEPLOYMENT.md) - Deploy to Sui Testnet
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
