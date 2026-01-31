# Pay402

**Cross-chain x402 payment facilitator with zero-friction onboarding**

> Building at HackMoney 2026

---

## What is Pay402?

Pay402 is an x402 payment facilitator that enables seamless USDC payments across blockchains. We're exploring how zkLogin and CCTP can create a Stripe-level UX for crypto payments.

### Key Features

- **Zero-friction onboarding**: Users pay with Google login via zkLogin (no wallet installation)
- **Embedded widget**: Merchants add one script tag to accept payments
- **Cross-chain**: Built on SUI, expanding to Base and Ethereum via CCTP
- **x402 protocol**: Compatible with existing x402 ecosystem

---

## How It Works

```
1. User visits merchant website
2. Hits paywall (HTTP 402)
3. Widget appears: "Login with Google"
4. SUI address auto-discovered via zkLogin
5. Payment confirmed
6. Content delivered
```

**Demo:** Coming soon

---

## Tech Stack

- **Blockchain:** SUI (Move contracts, PTBs, zkLogin)
- **Payment Protocol:** x402
- **Cross-chain:** CCTP (Circle's Cross-Chain Transfer Protocol)
- **Auth:** zkLogin (Google OAuth → SUI address)
- **Frontend:** React (embedded widget)
- **Backend:** Node.js/TypeScript (facilitator API)

---

## Architecture

Pay402 consists of three main components:

1. **Move Contracts** (SUI blockchain)
   - Payment settlement
   - Ephemeral receipts (zero-cost proof of payment)
   - USDC handling

2. **Facilitator API** (Backend)
   - Balance checking via `devInspectTransactionBlock`
   - Payment verification
   - PTB construction and settlement
   - Cross-chain CCTP integration

3. **Browser Widget** (Frontend)
   - zkLogin integration
   - x402 client
   - Payment UI
   - Merchant embedding

---

## Current Status

🚧 **Under active development during HackMoney 2026**

- ✅ SUI environment setup
- 
---

## Getting Started

### Prerequisites

- SUI CLI (v1.15.0+)
- Node.js (v18+)
- Git

### Setup

```bash
# Clone the repository (HTTPS)
git clone https://github.com/hamiha70/Pay402.git
cd Pay402

# Or clone via SSH
git clone git@github.com:hamiha70/Pay402.git
cd Pay402

# More setup instructions coming soon
```

---

## Development

More documentation coming as we build during the hackathon!

---

## Resources

### x402 Protocol
- Coinbase x402 Docs: https://docs.cdp.coinbase.com/x402/
- x402 Echo (test merchant): https://x402.payai.network/

### SUI & zkLogin
- SUI Docs: https://docs.sui.io/
- zkLogin Guide: https://docs.sui.io/guides/developer/cryptography/zklogin-integration
- PTBs: https://docs.sui.io/guides/developer/sui-101/building-ptb

### CCTP
- Circle CCTP: https://www.circle.com/en/cross-chain-transfer-protocol
- SUI Bridge: https://blog.sui.io/circle-usdc-cctp-sui-bridge-integration/

---

## Contributing

This is a hackathon project under active development. Contributions, ideas, and feedback welcome!

---

## License

MIT License (to be added)

---

**Built for HackMoney 2026** 🚀

*Pay402: Bringing Stripe-level UX to crypto payments*
