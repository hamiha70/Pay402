# X-402 V2 Compliance & Cross-Chain Strategy

**Date:** February 3, 2026  
**Status:** 🎯 Implementation Plan  
**Version:** 1.0

---

## Table of Contents

1. [Research Findings](#research-findings)
2. [X-402 V2 Specification](#x-402-v2-specification)
3. [PayAI Cross-Chain Model](#payai-cross-chain-model)
4. [Our Implementation Strategy](#our-implementation-strategy)
5. [CAIP Standards Integration](#caip-standards-integration)
6. [Move Contract Design Rationale](#move-contract-design-rationale)
7. [Cross-Chain USDC via CCTP](#cross-chain-usdc-via-cctp)
8. [Arc by Circle Integration](#arc-by-circle-integration)
9. [Implementation Roadmap](#implementation-roadmap)

---

## Research Findings

### Key Discoveries

**1. X-402 V2 Released (December 11, 2025)**

- 100M+ payments processed since May 2025 launch
- Major upgrade with cross-chain, sessions, and extensibility
- CAIP standards for chain-agnostic asset identification
- Plugin architecture for new chains/payment schemes

**2. PayAI's Cross-Chain Solution**

- **NOT atomic cross-chain PTBs** (impossible)
- **Facilitator float model**: Maintain liquidity on each chain
- Accept payment on source chain → Async settle on destination chain
- Facilitator takes on bridge risk/cost
- Supports: Solana, Base, Polygon, Avalanche, Sei, xLayer, SKALE

**3. X-402-Exec Extension**

- Atomic settlement with programmable hooks
- Similar to our PTB approach (payment + business logic in one tx)
- Enables NFT minting, revenue splits, loyalty programs

**4. CAIP Standards (Chain Agnostic Improvement Proposals)**

- **CAIP-2**: Blockchain ID (`sui:mainnet`, `eip155:1`)
- **CAIP-10**: Account ID (`sui:mainnet:0x...`)
- **CAIP-19**: Asset ID (`sui:mainnet/coin:0x2::usdc::USDC`)
- Used by X-402 V2 for multi-chain compatibility

---

## X-402 V2 Specification

### What's New in V2

#### 1. Unified Payment Interface

```typescript
// V2 uses CAIP standards for network/asset identification
{
  "network": "eip155:1",  // CAIP-2: Chain ID
  "asset": "eip155:1/erc20:0xA0b86991...",  // CAIP-19: Asset ID
  "payTo": "eip155:1:0xMerchant..."  // CAIP-10: Account ID
}
```

**For Sui:**

```typescript
{
  "network": "sui:mainnet",
  "asset": "sui:mainnet/coin:0x2::usdc::USDC",
  "payTo": "sui:mainnet:0xMerchant..."
}
```

#### 2. Extensible Architecture

- **Stable spec**: Adding chains requires zero spec changes
- **Plugin-driven SDK**: Register chains/assets/schemes
- **Lifecycle hooks**: Inject custom logic at payment flow points
- **Modernized headers**: `PAYMENT-SIGNATURE`, `PAYMENT-REQUIRED`, `PAYMENT-RESPONSE`

#### 3. Wallet-Based Sessions (NEW!)

```
Old (V1): Pay on every API call
New (V2): Connect wallet once → session token → no repayment
```

**Benefits:**

- Lower latency
- Fewer on-chain transactions
- Subscription-like patterns
- High-frequency workloads viable

#### 4. Dynamic Payment Routing

```typescript
{
  "payTo": {
    "type": "split",
    "recipients": [
      { "address": "0xMerchant", "percentage": 80 },
      { "address": "0xPlatform", "percentage": 20 }
    ]
  }
}
```

#### 5. Automatic Discovery

- Services expose structured metadata
- Facilitators automatically crawl/index
- Pricing/routes stay synchronized
- No manual catalog updates

---

## PayAI Cross-Chain Model

### How PayAI Solves Cross-Chain

**Architecture:**

```
Buyer (Ethereum USDC)
  ↓
POST /verify (Ethereum signature)
  ↓
POST /settle (Execute Ethereum tx)
  ↓
Facilitator receives USDC on Ethereum
  ↓
Facilitator async bridges to destination
  ↓
Facilitator pays merchant on Solana
```

### Key Features

1. **Facilitator as Multi-Chain Hub**

   - Maintains liquidity pools on each supported chain
   - Accepts payment on buyer's preferred chain
   - Settles to merchant on merchant's preferred chain

2. **Gasless for Both Parties**

   - Facilitator covers ALL gas fees
   - Buyer only needs payment token (USDC)
   - Merchant receives net payment

3. **Auto-OFAC Compliance**

   - Built-in sanctions screening
   - Regulatory compliance layer

4. **No Atomic Requirement**
   - Source chain tx confirms
   - Bridge happens async
   - Destination chain tx settles
   - Facilitator fronts liquidity

### Supported Networks

**Mainnet:**

- Solana (native)
- Base (EVM)
- Polygon (EVM)
- Avalanche
- Sei
- xLayer
- Peaq
- SKALE Base

**Testnet:**

- Solana Devnet
- Base Sepolia
- Avalanche Fuji
- Polygon Amoy
- xLayer Testnet
- Sei Testnet
- SKALE Base Sepolia

---

## Our Implementation Strategy

### Phase 1: Single-Chain (Sui) - Hackathon MVP ✅

**Current Implementation:**

- Sui-only payments
- USDC on Sui
- PTB-based settlement
- Sponsored transactions (gasless for buyer)
- Receipt events on-chain

**Status:** ✅ Core complete, needs X-402 V2 compliance updates

### Phase 2: X-402 V2 Compliance - Immediate

**Add CAIP-formatted fields to invoice:**

```typescript
// Current invoice
interface InvoiceJWT {
  resource: string;
  amount: string;
  merchantRecipient: string;
  facilitatorFee: string;
  facilitatorRecipient: string;
  coinType: string; // ← Raw type
  nonce: string;
  iat: number;
  exp: number;
}

// X-402 V2 compliant invoice
interface InvoiceJWTV2 {
  // X-402 V2 required fields
  network: string; // CAIP-2: "sui:mainnet" or "sui:testnet"
  assetType: string; // CAIP-19: "sui:mainnet/coin:0x2::usdc::USDC"
  payTo: string; // CAIP-10: "sui:mainnet:0xMerchant..."
  paymentId: string; // Unique payment identifier
  description: string; // Human-readable description

  // Our existing fields (keep for backward compat)
  resource: string;
  amount: string;
  merchantRecipient: string; // Extracted from payTo
  facilitatorFee: string;
  facilitatorRecipient: string;
  coinType: string; // Extracted from assetType
  nonce: string; // Same as paymentId
  iat: number;
  exp: number;
}
```

### Phase 3: Cross-Chain via CCTP - Post-Hackathon

**Our Unique Approach: Sui as Settlement Hub**

```
┌─────────────────────────────────────────────────────────┐
│ Cross-Chain Payment Flow (USDC-Centric)                │
├─────────────────────────────────────────────────────────┤
│                                                         │
│ 1. Buyer on Arc (Circle's EVM chain)                   │
│    - Has USDC on Arc                                    │
│    - Wants to pay merchant on Sui                       │
│                                                         │
│ 2. Merchant Invoice (Sui-based)                        │
│    {                                                    │
│      "network": "sui:mainnet",                          │
│      "assetType": "sui:mainnet/coin:0x2::usdc::USDC",   │
│      "payTo": "sui:mainnet:0xMerchant...",              │
│      "acceptedNetworks": [                              │
│        {                                                │
│          "network": "eip155:42170",  // Arc by Circle   │
│          "asset": "eip155:42170/erc20:0xUSDC...",       │
│          "settlementTime": "~15min", // CCTP finality   │
│          "conversionFee": "0.1%"     // Bridge cost     │
│        },                                               │
│        {                                                │
│          "network": "sui:mainnet",   // Native Sui      │
│          "asset": "sui:mainnet/coin:0x2::usdc::USDC",   │
│          "settlementTime": "instant",                   │
│          "conversionFee": "0%"                          │
│        }                                                │
│      ]                                                  │
│    }                                                    │
│                                                         │
│ 3. Buyer Chooses Arc Payment                           │
│    - Signs ERC-20 transfer on Arc                       │
│    - Sends USDC to facilitator on Arc                   │
│                                                         │
│ 4. Facilitator Receives on Arc                         │
│    - Confirms Arc transaction                           │
│    - Initiates CCTP burn on Arc                         │
│                                                         │
│ 5. CCTP Bridge (Circle's Native Bridge)                │
│    - Burn USDC on Arc                                   │
│    - Mint USDC on Sui (~15 min)                         │
│    - Attestation verified                               │
│                                                         │
│ 6. Facilitator Settles on Sui                          │
│    - Receives minted USDC on Sui                        │
│    - Builds PTB with settle_payment                     │
│    - Transfers to merchant on Sui                       │
│    - Emits receipt event                                │
│                                                         │
│ 7. Merchant Receives Payment                           │
│    - Native USDC on Sui                                 │
│    - On-chain receipt                                   │
│    - ~15 min total time (CCTP finality)                 │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### Why This Approach is BRILLIANT

**1. No Facilitator Float Required! ✅**

Unlike PayAI (which maintains liquidity on every chain), we:

- ✅ Use CCTP for native USDC bridging
- ✅ No capital locked on multiple chains
- ✅ Circle handles the bridge (trustless)
- ✅ Facilitator just orchestrates

**2. Sui as Settlement Layer ✅**

- ✅ All receipts on Sui (single source of truth)
- ✅ PTB atomic settlement (payment + receipt)
- ✅ Fast finality on Sui (~400ms)
- ✅ Merchant gets native Sui USDC

**3. CCTP Native Bridge ✅**

- ✅ Circle's official bridge (not third-party)
- ✅ Native USDC (burn on source, mint on dest)
- ✅ No wrapped tokens
- ✅ ~15 min finality (acceptable for non-instant payments)

**4. Hackathon Demo-Ready ✅**

- ✅ Arc by Circle = hackathon sponsor
- ✅ CCTP integration = technical depth
- ✅ Cross-chain = innovation showcase
- ✅ USDC-centric = real-world use case

---

## CAIP Standards Integration

### CAIP-2: Blockchain ID Specification

**Format:** `namespace:reference`

**Examples:**

```
sui:mainnet        → Sui mainnet
sui:testnet        → Sui testnet
eip155:1           → Ethereum mainnet
eip155:42170       → Arc by Circle
eip155:8453        → Base
solana:mainnet     → Solana mainnet
```

**Implementation:**

```typescript
function getCAIP2NetworkId(network: string): string {
  const mapping = {
    "sui-mainnet": "sui:mainnet",
    "sui-testnet": "sui:testnet",
    "sui-devnet": "sui:devnet",
    arc: "eip155:42170", // Arc by Circle
    base: "eip155:8453", // Base
    ethereum: "eip155:1", // Ethereum mainnet
  };
  return mapping[network] || network;
}
```

### CAIP-10: Account ID Specification

**Format:** `chain_id:account_address`

**Examples:**

```
sui:mainnet:0x1234...                    → Sui address
eip155:42170:0xabcd...                   → Arc address
eip155:1:0x5678...                       → Ethereum address
```

**Implementation:**

```typescript
function getCAIP10AccountId(network: string, address: string): string {
  const chainId = getCAIP2NetworkId(network);
  return `${chainId}:${address}`;
}
```

### CAIP-19: Asset Type and Asset ID Specification

**Format:** `chain_id/asset_namespace:asset_reference`

**Examples:**

```
sui:mainnet/coin:0x2::usdc::USDC                    → Sui USDC
eip155:42170/erc20:0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48  → Arc USDC
eip155:1/erc20:0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48     → Ethereum USDC
```

**Implementation:**

```typescript
function getCAIP19AssetId(network: string, coinType: string): string {
  const chainId = getCAIP2NetworkId(network);

  if (network.startsWith("sui")) {
    // Sui: coin type is already in format "0x2::usdc::USDC"
    return `${chainId}/coin:${coinType}`;
  } else if (
    network.startsWith("eip155") ||
    network === "arc" ||
    network === "base"
  ) {
    // EVM: coin type is contract address
    return `${chainId}/erc20:${coinType}`;
  }

  return `${chainId}/${coinType}`;
}
```

---

## Move Contract Design Rationale

### Our Approach: More Arguments, No Hash

**Decision:** Pass explicit parameters to Move contract, validate on-chain, but NO invoice hash.

**Move Function Signature:**

```move
public entry fun settle_payment<T>(
    payment_coin: Coin<T>,
    buyer: address,
    amount: u64,
    merchant: address,
    facilitator_fee: u64,
    payment_id: vector<u8>,
    clock: &Clock,
    ctx: &mut TxContext
)
```

### Why More Arguments?

**✅ Pros:**

1. **On-chain validation** of critical parameters
2. **Receipt integrity** - all fields verified before emission
3. **Developer ergonomics** - clear function signature
4. **Defense in depth** - blockchain validates, not just client

**⚠️ Cons:**

1. **Higher gas cost** - more arguments = more data
2. **More complex PTB** - more parameters to verify
3. **Less flexible** - schema changes require contract upgrade

### Why NO Invoice Hash?

**Initial Consideration:**

```move
// Option: Add invoice_hash parameter
public entry fun settle_payment<T>(
    // ... existing params ...
    invoice_hash: vector<u8>,  // H(invoiceJWT)
    // ...
)
```

**Rejected Because:**

1. **Facilitator can compute matching hash for attack signature**

   - If facilitator is malicious, they can create a fake invoice
   - Compute hash of fake invoice
   - Pass to Move contract
   - Contract has no way to verify original invoice

2. **Buyer already validates PTB client-side**

   - Buyer's verifier checks PTB matches invoice
   - Buyer signs PTB = buyer approves terms
   - On-chain hash doesn't add security

3. **Merchant doesn't need hash for settlement**
   - Merchant checks receipt event
   - Receipt contains all payment details
   - Hash only useful for dispute resolution (can be added later)

**What We DO Instead:**

```typescript
// Client-side verifier (buyer's security boundary)
function verifyPaymentPTB(ptbBytes: Uint8Array, invoice: InvoiceJWT) {
  // 1. Parse PTB bytes
  const ptb = deserializeTransaction(ptbBytes);

  // 2. Extract MoveCall arguments
  const moveCall = ptb.commands.find(
    (cmd) =>
      cmd.$kind === "MoveCall" && cmd.MoveCall.function === "settle_payment"
  );

  // 3. Verify each argument matches invoice
  assert(moveCall.arguments.buyer === invoice.buyerAddress);
  assert(moveCall.arguments.amount === invoice.amount);
  assert(moveCall.arguments.merchant === invoice.merchantRecipient);
  assert(moveCall.arguments.facilitator_fee === invoice.facilitatorFee);
  assert(moveCall.arguments.payment_id === invoice.nonce);

  // 4. Verify coin type in typeArguments
  assert(moveCall.typeArguments[0] === invoice.coinType);

  // ✅ Buyer's signature = approval of these exact terms
}
```

**Key Insight:**

> **Buyer's signature on PTB IS the security boundary.**  
> On-chain validation provides receipt integrity and defense-in-depth,  
> but cannot protect against facilitator creating fake invoices.  
> Only buyer's client-side verification prevents that attack.

### Future Enhancement: Optional Invoice Hash

**For dispute resolution, we CAN add invoice hash:**

```move
// V2: Add optional invoice_hash for audit trail
public entry fun settle_payment_v2<T>(
    // ... existing params ...
    invoice_hash: Option<vector<u8>>,  // Optional for backward compat
    // ...
) {
    // Emit receipt with invoice_hash if provided
    event::emit(PaymentSettled {
        // ... existing fields ...
        invoice_hash: option::get_with_default(&invoice_hash, vector::empty()),
    });
}
```

**Use case:**

- Merchant stores invoice JWT
- Receipt includes hash of JWT
- Dispute: Merchant proves "I issued invoice X, receipt shows hash(X)"
- Buyer can't claim "I paid for different terms"

**But this is post-hackathon enhancement.**

---

## Cross-Chain USDC via CCTP

### What is CCTP?

**Circle Cross-Chain Transfer Protocol:**

- Native USDC bridge between blockchains
- Burn on source chain → Mint on destination chain
- No wrapped tokens (native USDC everywhere)
- ~15 minute finality (attestation period)
- Supported chains: Ethereum, Avalanche, Arbitrum, Base, Optimism, Polygon, **Arc by Circle**

### CCTP Flow for Pay402

```typescript
// 1. Buyer initiates payment on Arc
const arcTx = await arcContract.transferFrom(
  buyerAddress,
  facilitatorAddress,
  amount
);

// 2. Facilitator burns USDC on Arc via CCTP
const burnTx = await cctpContract.depositForBurn(
  amount,
  SUI_DOMAIN_ID, // Destination: Sui
  facilitatorSuiAddress,
  usdcAddress
);

// 3. Wait for Circle attestation (~15 min)
const attestation = await waitForAttestation(burnTx.hash);

// 4. Mint USDC on Sui
const mintTx = await cctpSuiContract.receiveMessage(
  attestation.message,
  attestation.signature
);

// 5. Facilitator now has USDC on Sui
// Build PTB and settle to merchant
const ptb = new Transaction();
ptb.moveCall({
  target: `${packageId}::payment::settle_payment`,
  typeArguments: [SUI_USDC_TYPE],
  arguments: [
    // ... merchant payment ...
  ],
});
```

### CCTP Integration Points

**1. Invoice Enhancement:**

```typescript
interface CrossChainInvoice extends InvoiceJWT {
  acceptedNetworks: Array<{
    network: string; // CAIP-2: "eip155:42170"
    asset: string; // CAIP-19: "eip155:42170/erc20:0xUSDC..."
    settlementTime: string; // "~15min"
    conversionFee: string; // "0.1%"
  }>;
}
```

**2. Facilitator CCTP Service:**

```typescript
class CCTPBridgeService {
  async bridgeToSui(
    sourceChain: string,
    amount: bigint,
    buyerTxHash: string
  ): Promise<string> {
    // 1. Verify buyer's payment on source chain
    const sourceTx = await verifySourcePayment(sourceChain, buyerTxHash);

    // 2. Initiate CCTP burn
    const burnTx = await initiateBurn(sourceChain, amount);

    // 3. Wait for attestation
    const attestation = await pollForAttestation(burnTx.hash);

    // 4. Mint on Sui
    const mintTx = await mintOnSui(attestation);

    // 5. Return Sui tx hash
    return mintTx.digest;
  }
}
```

**3. Payment Status Tracking:**

```typescript
enum CrossChainPaymentStatus {
  PENDING_SOURCE_CONFIRMATION = "pending_source",
  BURNING_ON_SOURCE = "burning",
  AWAITING_ATTESTATION = "awaiting_attestation",
  MINTING_ON_DESTINATION = "minting",
  SETTLING_TO_MERCHANT = "settling",
  COMPLETED = "completed",
  FAILED = "failed",
}
```

---

## Arc by Circle Integration

### Why Arc?

1. **Hackathon Sponsor** ✅

   - Circle is sponsoring ETH Global HackMoney
   - Arc integration = sponsor engagement

2. **Native USDC** ✅

   - Arc is Circle's EVM chain
   - Native USDC support
   - CCTP native integration

3. **EVM Compatibility** ✅

   - Standard ERC-20 interface
   - Existing tooling (ethers.js, viem)
   - Easy for developers

4. **Cross-Chain Demo** ✅
   - Arc → Sui via CCTP
   - Showcases technical depth
   - Real-world use case

### Arc Technical Details

**Network:**

- Chain ID: `42170` (EIP-155)
- CAIP-2: `eip155:42170`
- RPC: TBD (Circle's Arc RPC endpoint)

**USDC Contract:**

- Address: TBD (Circle's Arc USDC contract)
- CAIP-19: `eip155:42170/erc20:0x[USDC_ADDRESS]`

**CCTP Contract:**

- TokenMessenger: TBD
- MessageTransmitter: TBD

### Demo Flow: Arc → Sui Payment

```
┌─────────────────────────────────────────────────────────┐
│ Hackathon Demo: Cross-Chain Payment (Arc → Sui)        │
├─────────────────────────────────────────────────────────┤
│                                                         │
│ [0:00] Setup                                            │
│   - Merchant on Sui (wants USDC on Sui)                │
│   - Buyer on Arc (has USDC on Arc)                     │
│   - Facilitator supports both chains                    │
│                                                         │
│ [0:15] Buyer requests premium API                      │
│   GET /api/premium-data                                 │
│   ← 402 Payment Required                                │
│   ← Invoice JWT (Sui-based, accepts Arc)                │
│                                                         │
│ [0:30] Buyer chooses Arc payment                       │
│   - Sees: "Pay with USDC on Arc (~15 min settlement)"  │
│   - Approves ERC-20 transfer                            │
│   - Signs Arc transaction                               │
│                                                         │
│ [0:45] Facilitator receives on Arc                     │
│   - Confirms Arc transaction                            │
│   - Shows: "Payment received on Arc"                    │
│   - Shows: "Bridging to Sui via CCTP..."               │
│                                                         │
│ [1:00 - 15:00] CCTP Bridge (background)                │
│   - Burn USDC on Arc                                    │
│   - Circle attestation                                  │
│   - Mint USDC on Sui                                    │
│   - Status updates every 30s                            │
│                                                         │
│ [15:00] Settlement on Sui                              │
│   - Facilitator builds PTB                              │
│   - Calls settle_payment on Sui                         │
│   - Emits receipt event                                 │
│   - Shows: "Payment settled on Sui!"                    │
│                                                         │
│ [15:15] Merchant delivers content                      │
│   - Verifies receipt on Sui                             │
│   - Delivers premium data                               │
│   - Shows: "Paid via Arc → Sui (CCTP)"                 │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## Implementation Roadmap

### Phase 1: X-402 V2 Compliance (Immediate - 4 hours)

**1.1 Update Invoice Schema**

- [ ] Add `network` (CAIP-2)
- [ ] Add `assetType` (CAIP-19)
- [ ] Add `payTo` (CAIP-10)
- [ ] Add `paymentId` (alias for `nonce`)
- [ ] Add `description`
- [ ] Keep existing fields for backward compat

**1.2 Update PTB Builder**

- [ ] Parse CAIP-formatted fields
- [ ] Extract raw addresses/types from CAIP IDs
- [ ] Pass to Move contract

**1.3 Update Verifier**

- [ ] Validate CAIP-formatted fields
- [ ] Check network matches expected
- [ ] Check assetType matches expected

**1.4 Update Tests**

- [ ] Add CAIP field tests
- [ ] Test CAIP parsing
- [ ] Test backward compatibility

**1.5 Documentation**

- [ ] Update ARCHITECTURE.md with CAIP fields
- [ ] Document X-402 V2 compliance
- [ ] Add CAIP examples

### Phase 2: Single-Chain Polish (Hackathon - 8 hours)

**2.1 Complete E2E Flow**

- [ ] Fix build-ptb Move call
- [ ] Implement settle-payment endpoint
- [ ] Add optimistic/pessimistic modes
- [ ] Verify on-chain receipts

**2.2 Widget Integration**

- [ ] Sign → Submit → Receipt flow
- [ ] Error handling
- [ ] Loading states

**2.3 Demo Preparation**

- [ ] Demo merchant setup
- [ ] Test flow end-to-end
- [ ] Prepare demo script

### Phase 3: CCTP Integration (Post-Hackathon - 2 weeks)

**3.1 Arc Integration**

- [ ] Arc RPC connection
- [ ] Arc USDC contract integration
- [ ] ERC-20 transfer flow

**3.2 CCTP Bridge Service**

- [ ] Burn on Arc
- [ ] Attestation polling
- [ ] Mint on Sui
- [ ] Error handling & retries

**3.3 Cross-Chain Invoice**

- [ ] `acceptedNetworks` field
- [ ] Multi-chain payment options
- [ ] Settlement time estimates

**3.4 Status Tracking**

- [ ] Cross-chain payment status enum
- [ ] Real-time status updates
- [ ] Webhook notifications

**3.5 Testing**

- [ ] Arc testnet integration
- [ ] CCTP testnet flow
- [ ] End-to-end cross-chain tests

### Phase 4: Production Hardening (Post-Hackathon - 4 weeks)

**4.1 Multi-Chain Support**

- [ ] Base integration
- [ ] Ethereum integration
- [ ] Optimism integration

**4.2 Facilitator Float (Optional)**

- [ ] Liquidity management
- [ ] Auto-rebalancing
- [ ] Risk monitoring

**4.3 Advanced Features**

- [ ] Session tokens (X-402 V2)
- [ ] Dynamic payment routing
- [ ] Revenue splits

---

## Open Questions & Decisions Needed

### 1. CCTP Finality Trade-off

**Question:** Is ~15 min settlement time acceptable for cross-chain payments?

**Options:**

- **A. Accept CCTP delay** (our proposal)
  - ✅ No facilitator float needed
  - ✅ Native USDC (not wrapped)
  - ⚠️ 15 min wait time
- **B. Facilitator float model** (PayAI approach)

  - ✅ Instant settlement
  - ⚠️ Requires capital on all chains
  - ⚠️ Bridge risk/cost

- **C. Hybrid approach**
  - Instant for small amounts (facilitator fronts)
  - CCTP for large amounts (wait for bridge)

**User's Proposed:** Option A (CCTP with delay)

**Challenge/Validation:**

- ✅ Acceptable for non-instant use cases (API access, content)
- ⚠️ Not suitable for real-time (gaming, streaming)
- ✅ Merchant can deliver after CCTP finality
- ✅ Buyer sees clear "~15 min" estimate upfront

**Decision:** ✅ Proceed with CCTP delay model for hackathon demo

### 2. Optimistic Settlement for Cross-Chain?

**Question:** Should facilitator deliver content before CCTP finality?

**Options:**

- **A. Pessimistic** (wait for CCTP)
  - ✅ Zero risk
  - ⚠️ 15 min wait
- **B. Optimistic** (deliver after Arc confirmation)
  - ✅ ~1 min wait
  - ⚠️ Facilitator risk if CCTP fails
  - ⚠️ Requires facilitator float as backup

**Recommendation:** Start with pessimistic (A) for hackathon, add optimistic post-launch

### 3. Do We Have Full Picture?

**Checklist:**

✅ **X-402 V2 Compliance**

- CAIP standards
- Required fields
- Header format

✅ **Cross-Chain Strategy**

- CCTP integration
- Arc by Circle
- Settlement flow

✅ **Move Contract Design**

- More arguments, no hash
- Client-side verification
- On-chain validation

✅ **Architecture**

- Sui as settlement layer
- PTB atomic settlement
- Receipt events

⚠️ **Missing/TBD:**

- [ ] Arc RPC endpoints (need from Circle)
- [ ] Arc USDC contract address
- [ ] Arc CCTP contract addresses
- [ ] CCTP Sui integration (does Sui support CCTP natively?)
- [ ] Session token implementation (X-402 V2)
- [ ] Dynamic payment routing (future)

---

## Summary

### What We're Building

**Phase 1 (Hackathon):**

- ✅ Sui-native payments with USDC
- ✅ X-402 V2 compliant invoice format
- ✅ CAIP standards for chain-agnostic IDs
- ✅ PTB-based atomic settlement
- ✅ On-chain receipt events

**Phase 2 (Post-Hackathon Demo):**

- ✅ Arc → Sui cross-chain payments
- ✅ CCTP native USDC bridge
- ✅ ~15 min settlement time
- ✅ No facilitator float required
- ✅ Hackathon sponsor integration (Circle/Arc)

### Key Innovations

1. **Sui as Settlement Hub**

   - All receipts on Sui (single source of truth)
   - PTB atomic settlement (payment + receipt)
   - Fast finality on Sui side

2. **CCTP Native Bridge**

   - No wrapped tokens
   - No facilitator float
   - Circle's official bridge

3. **X-402 V2 Compliant**

   - CAIP standards
   - Multi-chain ready
   - Plugin architecture

4. **Client-Side Security**
   - Buyer verifies PTB
   - On-chain validation for integrity
   - Defense in depth

---

**Next Steps:**

1. Implement CAIP fields in invoice schema
2. Update PTB builder and verifier
3. Complete single-chain E2E flow
4. Document Arc integration plan
5. Test with Arc testnet (post-hackathon)

**Last Updated:** February 3, 2026  
**Version:** 1.0
