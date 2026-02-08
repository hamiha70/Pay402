# Pay402 Documentation Index

**Purpose:** Navigation guide for hackathon judges and developers

---

## 🎯 Start Here (Judges & Evaluators)

1. **[README.md](./README.md)** - Project overview, problem statement, live demo
2. **[Problem Statement](./docs/PROBLEM_STATEMENT.md)** - Why x402? Why SUI? Market analysis
3. **[Flow Diagram](./docs/architecture/FLOW_DIAGRAM.md)** - Visual architecture with Mermaid diagrams
4. **[Live Demo](https://merchant-production-0255.up.railway.app)** - Try it on SUI testnet!

---

## 📊 Architecture & Technical Design

### Core Architecture
- **[Technical Specification](./docs/architecture/ARCHITECTURE.md)** - Canonical spec (locked for hackathon)
- **[Component Breakdown](./docs/architecture/COMPONENT_BREAKDOWN.md)** - Widget, Facilitator, Contract details
- **[Design Rationale](./docs/architecture/DESIGN_RATIONALE.md)** - Trade-offs and alternatives considered

### Security & Trust Model
- **[Security Model](./docs/SECURITY_MODEL.md)** - Trust boundaries, PTB verification tiers
- **[PTB Verifier Explainer](./docs/reference/VERIFIER_EXPLAINER.md)** - How buyer-side verification works
- **[PTB Verifier Security](./docs/security/PTB_VERIFIER_SECURITY.md)** - Security guarantees

### Data & Receipts
- **[Receipt Architecture](./docs/RECEIPT_ARCHITECTURE.md)** - On-chain event design for merchant audit

---

## 🚀 Deployment & Demo

### Live Services (Railway)
- **[Railway Deployment Summary](./RAILWAY-DEPLOYMENT-SUMMARY.md)** - Deployed URLs, configuration
- **[Release Notes v1.1.0](./RELEASE-NOTES-v1.1.0-railway-prod.md)** - Latest production release
- **[Demo Guide](./HACKMONEY-DEMO-READY.md)** - How to run the demo

### Deployment Info
- **Facilitator:** https://pay402-production.up.railway.app
- **Widget:** https://widget-production-8b65.up.railway.app
- **Merchant Demo:** https://merchant-production-0255.up.railway.app
- **Network:** SUI Testnet
- **Proof:** [Live Transaction](https://suiscan.xyz/testnet/tx/EV7D7z9gjzjrAQSKWSW8S1iLGdk8aEVPjn3zLA1aUSLE)

---

## 🛠️ Developer Documentation

### Getting Started
- **[Development Guide](./docs/development/DEVELOPMENT_GUIDE.md)** - Setup, tooling, best practices
- **[Widget Deployment](./docs/deployment/WIDGET_DEPLOYMENT.md)** - Build and deploy the payment widget

### Component-Specific
- **[Facilitator README](./facilitator/README.md)** - Backend service setup
- **[Merchant README](./merchant/README.md)** - Demo merchant setup
- **[Widget README](./widget/README.md)** - Frontend payment UI
- **[Move Contract README](./move/mock_usdc/README.md)** - Smart contract details

### Configuration
- **[zkLogin Setup Guide](./ZKLOGIN-SETUP-GUIDE.md)** - Google OAuth + Enoki configuration
- **[Enoki Portal Navigation](./ENOKI-PORTAL-NAVIGATION.md)** - Using Mysten Labs Enoki dashboard
- **[Network Switching](./NETWORK-SWITCHING.md)** - Localnet, Testnet, Mainnet

### Reference
- **[Explorer Links](./EXPLORER-LINKS.md)** - SUI Explorer URLs for debugging
- **[Facilitator Asset Links](./FACILITATOR-ASSET-LINKS.md)** - Package IDs, addresses
- **[Testnet Treasury Funding](./TESTNET-TREASURY-FUNDING.md)** - How to fund testnet wallets

---

## 🏆 Hackathon Submission Materials

### Presentation & Branding
- **[Presentation Outline v2](./submission_artefacts/PRESENTATION_OUTLINE_v2.md)** - Full pitch deck content
- **[Logo Prompts](./submission_artefacts/LOGO_PROMPTS.md)** - Logo/banner generation instructions
- **[Screenshots](./submission_artefacts/screenshots/)** - Demo flow screenshots

### Success Milestones
- **[zkLogin Success](./ZKLOGIN-SUCCESS.md)** - Breakthrough: OAuth → blockchain working
- **[Demo Ready Status](./HACKMONEY-DEMO-READY.md)** - Full testnet flow confirmed

---

## 📚 Additional Resources

### Historical Context (Archive)
If you're curious about the development journey:
- **[docs/archive/milestones/](./docs/archive/milestones/)** - Phase completion docs
- **[docs/archive/zklogin_debugging/](./docs/archive/zklogin_debugging/)** - zkLogin troubleshooting history
- **[docs/archive/deployment_planning/](./docs/archive/deployment_planning/)** - Pre-Railway deployment attempts

---

## 🎓 Understanding Pay402

### Key Concepts

**x402 Protocol:**
- HTTP 402 "Payment Required" status code
- Machine-readable micropayment spec
- Used by PayAI (Base), others on Solana

**zkLogin (SUI-Specific):**
- OAuth → blockchain address derivation
- No wallet installation required
- Google login → SUI address

**Programmable Transaction Blocks (PTBs):**
- Atomic multi-step transactions
- Client-side verification before signing
- Split coin + payment + receipt in one transaction

**Gas Sponsorship:**
- Facilitator pays SUI gas fees
- Buyer needs only USDC
- Native SUI feature

**Object Model:**
- Owned objects prevent front-running
- No global state (unlike EVM)
- Parallel execution (unlike Solana account locking)

---

## 📞 Quick Links

| Resource | URL |
|----------|-----|
| **Live Demo** | https://merchant-production-0255.up.railway.app |
| **GitHub Repo** | [hamiha70/Pay402](https://github.com/hamiha70/Pay402) |
| **SUI Docs** | https://docs.sui.io |
| **zkLogin Docs** | https://docs.sui.io/guides/developer/cryptography/zklogin |
| **Enoki Docs** | https://enoki.mystenlabs.com |
| **x402 Spec** | https://github.com/OpenAgentsInc/x402 |

---

## 🔍 Finding Specific Information

**Looking for...** → **Go to:**
- Project overview? → [README.md](./README.md)
- Why SUI? → [Problem Statement](./docs/PROBLEM_STATEMENT.md)
- How it works? → [Flow Diagram](./docs/architecture/FLOW_DIAGRAM.md)
- Security model? → [Security Model](./docs/SECURITY_MODEL.md)
- Setup instructions? → [Development Guide](./docs/development/DEVELOPMENT_GUIDE.md)
- Demo guide? → [Demo Ready](./HACKMONEY-DEMO-READY.md)
- Component details? → [Component READMEs](./facilitator/README.md)

---

**Last Updated:** February 8, 2026  
**Status:** Ready for HackMoney Submission  
**Version:** v1.0.0-demo-ready

For questions or issues, see the component READMEs or historical docs in `docs/archive/`.
