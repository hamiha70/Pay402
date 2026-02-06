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
    facilitatorUrl: "https://facilitator.pay402.com",
    googleClientId: "YOUR_GOOGLE_CLIENT_ID",
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
- ✅ Explorer URLs (none → suivision.xyz)
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
   Explorer URL: https://testnet.suivision.xyz/txblock/<digest>
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
