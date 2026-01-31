# Pay402 (SuiPay402) - Detailed Architecture Document

**Project:** Zero-Friction x402 Payment Facilitator on SUI Blockchain  
**Hackathon:** ETH Global HackMoney (January 2026)  
**Status:** ✅ Architecture Complete - Ready to Implement  
**Date:** January 31, 2026

---

## 🎯 Quick Start Summary

**What:** First x402 facilitator with zkLogin (Google → blockchain address, no wallet!)

**Tech Stack:**
- Blockchain: SUI (Move language)
- Backend: Node.js + Express + @mysten/sui.js
- Frontend: TypeScript + React + @mysten/dapp-kit
- Widget: Compiled JS (embedded like Stripe)

**Key Decisions (All Finalized):**
- ✅ Generic `Coin<T>` contract (not USDC-only)
- ✅ Fixed fee ($0.01 per tx, not percentage)
- ✅ TypeScript everywhere (compiles to JS for browser)
- ✅ Anti-front-running via `&mut Coin<T>` (atomic settlement)
- ✅ Mysten Enoki for salt service (deterministic, no state)
- ✅ Configurable payment amounts (from 402 headers)

**Build Time:** 24 hours (hackathon-ready)

**Ready to Build:** All architecture questions resolved, implementation can start immediately.

---

## Executive Summary

**Pay402** is the first x402 payment facilitator that combines SUI blockchain, zkLogin authentication, and an embedded widget to enable zero-friction micropayments for API access. Users pay for premium content with a Google login—no wallet installation, no seed phrases, no crypto knowledge required.

### Unique Value Propositions

1. 🎯 **zkLogin Integration** - Only x402 facilitator with Google OAuth → blockchain address
2. 🎯 **Embedded Widget** - No user installation (like Stripe/PayPal)
3. 🎯 **SUI-Native** - First x402 implementation on Move blockchain
4. 🎯 **CCTP-Ready** - Future cross-chain payments to Base/Ethereum/Solana

### Core Innovation

**Problem:** Existing crypto payment solutions require users to:
- Install wallet extensions (MetaMask, etc.)
- Manage seed phrases (complex, scary)
- Manually acquire crypto
- Understand blockchain concepts
This is the biggest friction point for micropayments by humans.

**Solution:** Pay402 enables payments with just a Google login:
```
User Flow: Click link → Login with Google → Pay → Content delivered
Total Clicks: 3
Installation Required: 0
Crypto Knowledge: 0
```

---

## System Architecture Overview

### High-Level Component Diagram

```
┌───────────────────────────────────────────────────────────────┐
│                       User's Browser                          │
│                                                               │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │  Pay402 Widget (JavaScript)                              │ │
│  │  - Detects 402 responses                                 │ │
│  │  - Triggers zkLogin (Google OAuth)                       │ │
│  │  - Auto-discovers SUI address                            │ │
│  │  - Checks balance via facilitator                        │ │
│  │  - Confirms payment                                      │ │
│  │  - Displays content                                      │ │
│  └──────────────────────────────────────────────────────────┘ │
│         │                    │                      │         │
└─────────┼────────────────────┼──────────────────────┴─────────┘
          │                    │                      │
          ↓                    ↓                      ↓
  ┌───────────────┐     ┌──────────────────────┐     ┌──────────────────────┐
  │   Merchant    │     │     Facilitator      │     │     SUI Chain        │
  │   (Reuse)     │     │     (Build)          │     │     (Existing)       │
  ├───────────────┤     ├──────────────────────┤     ├──────────────────────┤
  │ - x402 Echo   │     │ - Check balance      │     │ - USDC coins         │
  │ - PayAI       │     │ - Verify signature   │     │ - PTB execution      │
  │               │     │ - Settle PTB         │     │   (Programmable      │
  │               │     │   (Programmable      │     │    Transaction Block)│
  │               │     │    Transaction Block)│     │ - Events / indexing  │
  │               │     │ - Gas sponsor        │     │                      │
  └───────────────┘     └──────────────────────┘     └──────────────────────┘
          ↑                        ↑                        ↑
          └────────────────────────┴────────────────────────┘
                           All via HTTP/RPC

  ┌─────────────────────────────────────────────────────────┐
  │  External Services (Reuse)                              │
  ├─────────────────────────────────────────────────────────┤
  │  - Google OAuth (authentication)                        │
  │  - Mysten zkLogin Prover (ZK proof generation)          │
  │  - Mysten Salt Service (address derivation)*            │
  │    * Prevents address enumeration attack                │
  │    * Deterministic (no state storage needed!)           │
  │  - Circle USDC Faucet (testnet funding)                 │
  └─────────────────────────────────────────────────────────┘
```

### Salt Service Explained

**What:** The salt is a secret value used in zkLogin address derivation

**Formula:**
```typescript
SUI_Address = hash(JWT_sub + salt)
// JWT_sub = Google user ID (permanent, unique)
// salt = Secret value (adds entropy)
```

**Why Needed:** Prevents address enumeration attack

```typescript
// WITHOUT salt (INSECURE):
address = hash(google_user_id)
// Attack: Hacker gets leaked Google ID list → computes all addresses!
const stolenIds = ["12345", "67890", ...];
const addresses = stolenIds.map(id => hash(id));  // All addresses revealed!

// WITH salt (SECURE):
address = hash(google_user_id + secret_salt)
// Attack prevented: Hacker has Google IDs but NOT salts
const addresses = stolenIds.map(id => hash(id + "???"));  // Can't compute!
```

**State Management:** NO persistent storage needed! ✅

```typescript
// Mysten Enoki (Recommended for MVP)
// Derives salt deterministically from JWT
const salt = await fetch('https://salt.api.mystenlabs.com/get_salt', {
  method: 'POST',
  body: JSON.stringify({ jwt })
});
// Same JWT → ALWAYS same salt (no database!)

// Self-Hosted Alternative (Production)
function deriveSalt(googleUserId: string): string {
  return HKDF(
    masterSecret,  // Your secret key (one value, never changes)
    googleUserId,  // From JWT
    'zklogin-salt'  // Context string
  );
}
// Same Google ID → ALWAYS same salt (deterministic!)
```

**Multiple Addresses:** Different salts → different addresses (privacy!)

```typescript
// Same Google account, different apps
address1 = hash(google_id + salt_for_app_A)  // Shopping app
address2 = hash(google_id + salt_for_app_B)  // Gaming app
// Compromise of one app doesn't reveal other addresses
```

---

## Complete User Flow (Demo Flow)

### The "Dumb Buyer" Journey - Zero Prior Setup

**Starting Condition:** User has NOTHING installed (no wallet, no crypto, no SUI)

#### Step 1: User Hits Paywall
```http
Browser → GET https://api.merchant.com/premium-data

Merchant → 402 Payment Required
Headers:
  WWW-Authenticate: x402
    amount=1000000               # 1 USDC (6 decimals)
    currency=USDC
    merchant=0xMERCHANT_SUI_ADDRESS
    facilitator=https://facilitator.pay402.com
    network=sui:testnet
    request_id=abc123
```

**Auto-Discovery #1:** Widget learns payment requirements from 402 headers

#### Step 2: Widget Triggers zkLogin
```javascript
// Widget detects 402, shows modal
┌─────────────────────────────────────┐
│ Payment Required: 0.1 USDC          │
│                                     │
│ No wallet? No problem!              │
│ [Login with Google] ← Button        │
└─────────────────────────────────────┘

// User clicks → Google OAuth
1. Generate ephemeral keypair (browser)
2. Redirect to Google OAuth
3. User logs in (familiar Google screen)
4. Google redirects back with JWT
5. Derive SUI address from JWT + salt
```

**Auto-Discovery #2:** SUI address computed from Google account (no wallet installation!)

#### Step 3: Check Balance
```javascript
// Widget asks facilitator to check balance
POST https://facilitator.pay402.com/check-balance
{
  "address": "0xABC...DEF",  // zkLogin address
  "network": "sui:testnet"
}

// Facilitator uses devInspectTransactionBlock
Response:
{
  "balance": 0,           // 0 USDC
  "hasEnough": false,
  "needsAmount": 100000  // 0.1 USDC
}
```

**Auto-Discovery #3:** Current balance determined (no manual wallet checks!)

#### Step 4: Get USDC (Manual Step - Unavoidable)
```
┌─────────────────────────────────────┐
│ Your SUI Address:                   │
│ 0xABC...DEF                         │
│                                     │
│ Your Balance: 0 USDC ❌             │
│ Need: 1 USDC                        │
│                                     │
│ [Get 20 USDC from Faucet] ← Opens  │
│  https://faucet.circle.com/         │
└─────────────────────────────────────┘

// User manually:
// 1. Copies SUI address
// 2. Pastes into faucet
// 3. Gets 20 USDC (testnet)
// 4. Returns to page
```

**Note:** For production, replace with credit card on-ramp

#### Step 5: Confirm Payment
```
┌─────────────────────────────────────┐
│ ✅ Balance: 20 USDC                 │
│                                     │
│ Confirm Payment                     │
│ Amount: 0.1 USDC                      │
│ To: api.merchant.com                │
│ Via: Pay402 Facilitator             │
│                                     │
│ After payment: 19.9 USDC              │
│                                     │
│ [Confirm & Pay] ← Signs PTB         │
└─────────────────────────────────────┘

// User clicks → Payment authorization
1. Sign payment intent (ephemeral key)
2. Send to facilitator: POST /verify-payment
3. Facilitator verifies signature + balance
4. Returns payment token (JWT)
```

**Settlement:** Facilitator submits PTB to blockchain (async)

#### Step 6: Retry with Payment Token
```javascript
// Widget retries original request with payment proof
GET https://api.merchant.com/premium-data
Headers:
  X-Payment: eyJhbGc...  // Payment token (JWT)

// Merchant validates token with facilitator
// Content delivered!
```

**Success:** User got content with 3 clicks (link → Google login → Pay)

#### Step 7: Show Transaction Receipt
```
┌─────────────────────────────────────┐
│ ✅ Payment Successful!              │
│                                     │
│ Transaction:                        │
│ testnet.suivision.xyz/txblock/0x... │
│                                     │
│ New Balance: 19.9SDC                │
└─────────────────────────────────────┘
```

---

## Component Details

### 1. Move Smart Contract (SUI Blockchain)

**Location:** `contracts/payment.move`  
**Complexity:** ★★☆☆☆ (Low)  
**Time:** 4-6 hours  

#### Contract Structure

```move
module pay402::payment {
    use sui::coin::{Self, Coin};
    use sui::clock::{Self, Clock};
    use sui::event;
    
    // ===== Ephemeral Receipt (Zero Storage Cost!) =====
    public struct EphemeralReceipt has drop {
        payment_id: vector<u8>,
        buyer: address,
        merchant: address,
        amount: u64,
        coin_type: vector<u8>,  // Type name for verification
        timestamp_ms: u64,
    }
    
    // ===== Events (For Indexing) =====
    public struct PaymentSettled has copy, drop {
        payment_id: vector<u8>,
        buyer: address,
        merchant: address,
        facilitator: address,
        amount: u64,
        facilitator_fee: u64,
        coin_type: vector<u8>,  // e.g., "USDC", "SUI", etc.
        timestamp_ms: u64,
    }
    
    // ===== Core Payment Function (GENERIC!) =====
    /// Split Coin<T>: merchant + facilitator, return receipt
    /// Generic over any coin type (USDC, SUI, USDT, etc.)
    /// 
    /// SECURITY: Uses &mut Coin<T> to prevent buyer front-running!
    /// The coin is locked during transaction and version-incremented after.
    /// Buyer cannot spend the coin elsewhere during settlement.
    public fun settle_payment<T>(
        buyer_coin: &mut Coin<T>,  // ← Generic! Mutable prevents front-running
        amount: u64,
        merchant: address,
        facilitator_fee: u64,      // FIXED FEE (not percentage)
        payment_id: vector<u8>,
        clock: &Clock,
        ctx: &mut TxContext
    ): EphemeralReceipt {
        let facilitator = ctx.sender();  // Facilitator calls this
        
        // Split coin (merchant portion + fee)
        // ATOMIC: Buyer cannot front-run during this transaction!
        let merchant_payment = coin::split(buyer_coin, amount, ctx);
        
        // Split facilitator fee from merchant payment
        let fee_payment = coin::split(&mut merchant_payment, facilitator_fee, ctx);
        
        // Transfer merchant payment (minus fee)
        transfer::public_transfer(merchant_payment, merchant);
        
        // Transfer facilitator fee
        transfer::public_transfer(fee_payment, facilitator);
        
        // Get coin type name for event/receipt
        let coin_type = type_name::into_string(type_name::get<T>());
        
        // Emit event for indexing
        let timestamp_ms = clock::timestamp_ms(clock);
        event::emit(PaymentSettled {
            payment_id,
            buyer: ctx.sender(),  // Or derive from coin ownership
            merchant,
            facilitator,
            amount,
            facilitator_fee,
            coin_type: *std::string::bytes(&coin_type),
            timestamp_ms,
        });
        
        // Return ephemeral receipt (no storage!)
        EphemeralReceipt {
            payment_id,
            buyer: ctx.sender(),
            merchant,
            amount,
            coin_type: *std::string::bytes(&coin_type),
            timestamp_ms,
        }
    }
}
```

#### Key Design Decisions

1. **Generic `Coin<T>`:** Supports any coin type (USDC, SUI, USDT, custom tokens)
   - More idiomatic Move code
   - Future-proof architecture
   - Type safety enforced at compile time

2. **Ephemeral Receipts:** Struct with only `drop` ability = zero on-chain storage

3. **Events:** Permanent audit trail without storage cost

4. **PTB-Compatible:** Public function can be called from Programmable Transaction Blocks

5. **Anti-Front-Running:** Uses `&mut Coin<T>` to prevent buyer from spending coin before facilitator settles
   - Coin locked during transaction
   - Version incremented atomically
   - No race condition possible

6. **Fixed Fee Model:** Facilitator fee is flat amount (e.g., 0.01 USDC), not percentage
   - Predictable cost structure
   - Fair for micropayments
   - Aligns with facilitator's cost model (gas + overhead)

#### Deployment Info

- **Package ID:** `0xc4753b6f4b651b295b0311a05cc19991c4eb7ddd7c57f3fe1947767ba46f49cf` (hello_world test)
- **Network:** SUI Testnet
- **Gas Cost:** ~12 SUI deployment (~$0.12), ~2.8 SUI per call (~$0.003)

---

### 2. Facilitator Service (Backend API)

**Technology:** Node.js + Express + @mysten/sui.js  
**Complexity:** ★★★★☆ (High)  
**Time:** 8-10 hours  

#### API Endpoints

##### POST /check-balance
**Purpose:** Check if buyer has sufficient coins and discover coin objects

```typescript
// Request
{
  "address": "0xABC...DEF",
  "network": "sui:testnet",
  "coinType": "0xa1ec7fc00a6f40db9693ad1415d0c193ad3906494428cf252621037bd7117e29::usdc::USDC"
}

// Implementation
async function checkBalance(req, res) {
  const { address, network, coinType } = req.body;
  
  // Validate coin type matches x402 request
  if (coinType !== EXPECTED_COIN_TYPE) {
    return res.status(400).json({ 
      error: 'Currency mismatch',
      expected: EXPECTED_COIN_TYPE,
      received: coinType
    });
  }
  
  // Use devInspectTransactionBlock (off-chain, free)
  const client = new SuiClient({ url: getFullnodeUrl('testnet') });
  
  // Get all coin objects owned by address
  const coins = await client.getCoins({
    owner: address,
    coinType  // e.g., USDC type
  });
  
  // Sum balances across all coin objects
  const totalBalance = coins.data.reduce((sum, coin) => 
    sum + BigInt(coin.balance), 0n
  );
  
  // Return coin IDs for settlement PTB
  return res.json({
    balance: totalBalance.toString(),
    hasEnough: totalBalance >= REQUIRED_AMOUNT,
    needsAmount: REQUIRED_AMOUNT.toString(),
    coinIds: coins.data.map(c => c.coinObjectId),  // For PTB construction
    coinType  // Confirmed type
  });
}
```

**Response:**
```json
{
  "balance": "20000000",     // 20 USDC (6 decimals)
  "hasEnough": true,
  "needsAmount": "100000",   // 0.1 USDC (configurable!)
  "coinIds": [               // Discovered coin objects
    "0xCOIN1...",
    "0xCOIN2..."
  ],
  "coinType": "0xa1ec...::usdc::USDC"
}
```

##### POST /verify-payment
**Purpose:** Verify payment authorization, return payment token

```typescript
// Request
{
  "paymentRequest": {
    "amount": "1000000",
    "merchant": "0xMERCHANT...",
    "requestId": "abc123"
  },
  "buyerAddress": "0xBUYER...",
  "signature": "0x..."  // Signed by buyer's ephemeral key
}

// Implementation
async function verifyPayment(req, res) {
  const { paymentRequest, buyerAddress, signature } = req.body;
  
  // 1. Verify signature
  const message = encodePaymentRequest(paymentRequest);
  const isValid = await verifySignature(message, signature, buyerAddress);
  if (!isValid) {
    return res.status(403).json({ error: 'Invalid signature' });
  }
  
  // 2. Check balance (again, to prevent race conditions)
  const hasBalance = await checkBalance(buyerAddress);
  if (!hasBalance) {
    return res.status(402).json({ error: 'Insufficient balance' });
  }
  
  // 3. Generate payment token (JWT signed by facilitator)
  const paymentToken = jwt.sign({
    paymentId: paymentRequest.requestId,
    buyer: buyerAddress,
    merchant: paymentRequest.merchant,
    amount: paymentRequest.amount,
    timestamp: Date.now(),
    network: 'sui:testnet'
  }, FACILITATOR_PRIVATE_KEY, {
    expiresIn: '5m'  // Token valid for 5 minutes
  });
  
  // 4. Queue async settlement (non-blocking)
  settlementQueue.add({
    paymentToken,
    buyerAddress,
    merchantAddress: paymentRequest.merchant,
    amount: paymentRequest.amount
  });
  
  return res.json({
    paymentToken,
    valid: true,
    expiresAt: Date.now() + 300000  // 5 minutes
  });
}
```

**Response:**
```json
{
  "paymentToken": "eyJhbGc...",
  "valid": true,
  "expiresAt": 1738392000000
}
```

##### POST /settle-payment (Internal)
**Purpose:** Submit PTB to blockchain (async worker)

```typescript
async function settlePayment(job) {
  const { paymentToken, buyerAddress, merchantAddress, amount, coinType } = job.data;
  
  try {
    // 1. Get buyer's coin objects
    const coins = await client.getCoins({
      owner: buyerAddress,
      coinType  // Generic! Works with USDC, SUI, etc.
    });
    
    // 2. Find coin with sufficient balance (or merge coins)
    const suitableCoin = coins.data.find(c => 
      BigInt(c.balance) >= BigInt(amount)
    );
    
    if (!suitableCoin) {
      // TODO: Merge smaller coins into one (advanced)
      throw new Error('No suitable coin found');
    }
    
    // 3. Build PTB (Programmable Transaction Block)
    const tx = new TransactionBlock();
    
    // Calculate fixed facilitator fee (e.g., 0.01 USDC = 10,000 microUSDC)
    const FIXED_FEE = 10000;  // $0.01 in microUSDC (6 decimals)
    
    // Call generic Move contract
    tx.moveCall({
      target: `${PACKAGE_ID}::payment::settle_payment`,
      typeArguments: [coinType],  // ← Generic type parameter!
      arguments: [
        tx.object(suitableCoin.coinObjectId),  // &mut Coin<T>
        tx.pure(amount, 'u64'),
        tx.pure(merchantAddress, 'address'),
        tx.pure(FIXED_FEE, 'u64'),              // ← Fixed fee!
        tx.pure(paymentToken, 'vector<u8>'),    // payment_id
        tx.object(CLOCK_ID)                     // Clock object
      ]
    });
    
    // 4. Sign and submit (facilitator sponsors gas)
    const client = new SuiClient({ url: getFullnodeUrl('testnet') });
    const result = await client.signAndExecuteTransactionBlock({
      transactionBlock: tx,
      signer: facilitatorKeypair,  // ← Facilitator pays SUI gas!
      options: {
        showEffects: true,
        showEvents: true
      }
    });
    
    // 5. Verify success
    if (result.effects?.status?.status !== 'success') {
      throw new Error(`Settlement failed: ${result.effects?.status?.error}`);
    }
    
    // 6. Log success
    console.log('Payment settled:', result.digest);
    console.log('Facilitator fee:', FIXED_FEE, 'micro' + coinType);
    
    // 7. Notify merchant (webhook)
    await notifyMerchant(merchantAddress, {
      paymentToken,
      txHash: result.digest,
      status: 'settled',
      amount,
      coinType
    });
    
    return result.digest;
    
  } catch (error) {
    console.error('Settlement failed:', error);
    // Retry logic here (with exponential backoff)
    throw error;
  }
}
```

##### POST /verify-token (For Merchants)
**Purpose:** Validate payment token from buyer

```typescript
// Request
{
  "paymentToken": "eyJhbGc..."
}

// Implementation
async function verifyToken(req, res) {
  const { paymentToken } = req.body;
  
  try {
    // Verify JWT signature
    const decoded = jwt.verify(paymentToken, FACILITATOR_PUBLIC_KEY);
    
    // Check expiration
    if (decoded.expiresAt < Date.now()) {
      return res.json({ valid: false, reason: 'expired' });
    }
    
    // Check if payment settled on-chain (optional)
    // const settled = await checkOnChain(decoded.paymentId);
    
    return res.json({
      valid: true,
      buyer: decoded.buyer,
      merchant: decoded.merchant,
      amount: decoded.amount,
      timestamp: decoded.timestamp
    });
    
  } catch (error) {
    return res.json({ 
      valid: false, 
      reason: 'invalid_signature' 
    });
  }
}
```

**Response:**
```json
{
  "valid": true,
  "buyer": "0xBUYER...",
  "merchant": "0xMERCHANT...",
  "amount": "1000000",
  "timestamp": 1738391000000
}
```

#### Architecture Decisions

1. **Async Settlement:** Verify returns token immediately, settlement happens in background
2. **Gas Sponsorship:** Facilitator pays SUI gas (better UX, recoups via fixed fee)
3. **Fixed Fee Model:** $0.01 per transaction (not percentage-based)
   - Rationale: Facilitator is infrastructure (like RPC), not payment processor (like Stripe)
   - Cost is fixed (gas + overhead), so fee should be fixed
   - Fair for micropayments (10% of $0.10 is acceptable)
   - Encourages high-value usage ($0.01 on $100 is trivial)
4. **JWT Tokens:** Standard, widely supported, easy to verify
5. **Queue-Based:** Bull/BullMQ for reliable async processing
6. **Idempotency:** Payment IDs (nonces) prevent double-spending/replay
7. **Generic Coins:** Support any `Coin<T>` via type arguments
8. **Coin Discovery:** Automatic discovery of coin objects by address
9. **Currency Validation:** Match x402 request currency against available coins

---

### 3. Browser Widget (Frontend)

**Technology:** React + @mysten/dapp-kit + @x402/fetch  
**Complexity:** ★★★★☆ (High)  
**Time:** 8-10 hours  

#### Widget Architecture

```typescript
// Main Widget Class
class Pay402Widget {
  private zkLoginManager: ZkLoginManager;
  private facilitatorUrl: string;
  private modalContainer: HTMLElement;
  
  constructor(config: Pay402Config) {
    this.facilitatorUrl = config.facilitatorUrl;
    this.zkLoginManager = new ZkLoginManager(config.googleClientId);
    this.interceptFetch();
  }
  
  // Intercept fetch to detect 402
  private interceptFetch() {
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      const response = await originalFetch(...args);
      
      if (response.status === 402) {
        await this.handlePaymentRequired(response);
      }
      
      return response;
    };
  }
  
  // Main payment flow
  private async handlePaymentRequired(response: Response) {
    try {
      // 1. Parse 402 headers
      const paymentRequest = this.parse402Headers(response);
      
      // 2. Show modal
      this.showModal();
      
      // 3. Check if user logged in (zkLogin session)
      let user = this.zkLoginManager.getSession();
      
      if (!user) {
        // 3a. Show Google login button
        this.showLoginStep();
        user = await this.zkLoginManager.login();
        this.showBalanceStep();
      }
      
      // 4. Check balance
      const balance = await this.checkBalance(user.address);
      
      if (!balance.hasEnough) {
        // 4a. Guide to faucet
        this.showFaucetStep(user.address, balance.needsAmount);
        await this.waitForBalance(user.address);
      }
      
      // 5. Show payment confirmation
      this.showConfirmStep(paymentRequest, balance);
      const confirmed = await this.waitForConfirmation();
      
      if (confirmed) {
        // 6. Sign payment
        this.showProcessingStep();
        const signature = await this.zkLoginManager.signPayment(paymentRequest);
        
        // 7. Get payment token from facilitator
        const paymentToken = await this.getPaymentToken(
          paymentRequest,
          user.address,
          signature
        );
        
        // 8. Retry request with token
        this.showRetryingStep();
        const content = await this.retryWithToken(
          response.url,
          paymentToken
        );
        
        // 9. Show success
        this.showSuccessStep(paymentToken, content);
        
        return content;
      }
      
    } catch (error) {
      this.showErrorStep(error);
    }
  }
}
```

#### zkLogin Integration

```typescript
class ZkLoginManager {
  private googleClientId: string;
  private ephemeralKeyPair: Ed25519Keypair | null = null;
  private zkProof: any = null;
  private session: UserSession | null = null;
  
  async login(): Promise<UserSession> {
    // 1. Generate ephemeral keypair
    this.ephemeralKeyPair = new Ed25519Keypair();
    const randomness = generateRandomness();
    
    // 2. Calculate max epoch
    const client = new SuiClient({ url: getFullnodeUrl('testnet') });
    const { epoch } = await client.getLatestSuiSystemState();
    const maxEpoch = Number(epoch) + 10;  // Valid for 10 epochs (~10 days)
    
    // 3. Generate nonce
    const nonce = generateNonce(
      this.ephemeralKeyPair.getPublicKey(),
      maxEpoch,
      randomness
    );
    
    // 4. Build OAuth URL
    const params = new URLSearchParams({
      client_id: this.googleClientId,
      redirect_uri: window.location.origin + '/callback',
      response_type: 'id_token',
      scope: 'openid',
      nonce: nonce,
    });
    
    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
    
    // 5. Redirect to Google (page reloads)
    window.location.href = authUrl;
    
    // (Continued in handleCallback after redirect...)
  }
  
  async handleCallback(): Promise<UserSession> {
    // 6. Extract JWT from URL
    const jwt = this.extractJWT(window.location.hash);
    
    // 7. Get salt (from Mysten service or your backend)
    const salt = await this.getSalt(jwt);
    
    // 8. Get ZK proof from Mysten prover (takes ~3 seconds)
    this.zkProof = await this.getZKProof(
      jwt,
      this.ephemeralKeyPair,
      randomness,
      maxEpoch
    );
    
    // 9. Derive SUI address
    const address = jwtToAddress(jwt, salt);
    
    // 10. Create session
    this.session = {
      jwt,
      address,
      ephemeralKeyPair: this.ephemeralKeyPair,
      zkProof: this.zkProof,
      maxEpoch,
      expiresAt: Date.now() + maxEpoch * 24 * 3600 * 1000
    };
    
    // 11. Store session in localStorage
    this.saveSession(this.session);
    
    return this.session;
  }
  
  async signPayment(paymentRequest: PaymentRequest): Promise<string> {
    if (!this.session || !this.ephemeralKeyPair) {
      throw new Error('Not logged in');
    }
    
    // 1. Encode payment request as message
    const message = encodePaymentRequest(paymentRequest);
    
    // 2. Sign with ephemeral key
    const userSignature = this.ephemeralKeyPair.signData(message);
    
    // 3. Combine with ZK proof
    const zkLoginSignature = getZkLoginSignature({
      inputs: this.zkProof,
      maxEpoch: this.session.maxEpoch,
      userSignature
    });
    
    return zkLoginSignature;
  }
}
```

#### React Components

```typescript
// Modal Component
function PaymentModal({ paymentRequest, onComplete, onCancel }) {
  const [step, setStep] = useState<Step>('login');
  const [user, setUser] = useState<UserSession | null>(null);
  const [balance, setBalance] = useState<Balance | null>(null);
  
  return (
    <Modal isOpen onClose={onCancel}>
      {step === 'login' && (
        <LoginStep onLogin={(user) => {
          setUser(user);
          setStep('balance');
        }} />
      )}
      
      {step === 'balance' && (
        <BalanceStep 
          address={user.address}
          requiredAmount={paymentRequest.amount}
          onBalanceChecked={(bal) => {
            setBalance(bal);
            if (bal.hasEnough) {
              setStep('confirm');
            } else {
              setStep('faucet');
            }
          }}
        />
      )}
      
      {step === 'faucet' && (
        <FaucetStep
          address={user.address}
          needsAmount={balance.needsAmount}
          onFunded={() => setStep('confirm')}
        />
      )}
      
      {step === 'confirm' && (
        <ConfirmStep
          paymentRequest={paymentRequest}
          balance={balance}
          onConfirm={() => setStep('processing')}
          onCancel={onCancel}
        />
      )}
      
      {step === 'processing' && (
        <ProcessingStep />
      )}
      
      {step === 'success' && (
        <SuccessStep
          txHash={txHash}
          onClose={onComplete}
        />
      )}
      
      {step === 'error' && (
        <ErrorStep
          error={error}
          onRetry={() => setStep('login')}
          onCancel={onCancel}
        />
      )}
    </Modal>
  );
}

// Login Step
function LoginStep({ onLogin }) {
  const zkLogin = useZkLogin();
  
  return (
    <div className="step-container">
      <h2>Payment Required</h2>
      <p>Login with Google to continue</p>
      
      <button 
        className="google-login-btn"
        onClick={async () => {
          const user = await zkLogin.login();
          onLogin(user);
        }}
      >
        <GoogleIcon />
        Login with Google
      </button>
      
      <p className="subtitle">
        No wallet needed. Your blockchain address will be created automatically.
      </p>
    </div>
  );
}

// Confirm Step
function ConfirmStep({ paymentRequest, balance, onConfirm, onCancel }) {
  return (
    <div className="step-container">
      <h2>Confirm Payment</h2>
      
      <div className="payment-details">
        <div className="detail-row">
          <span>Amount:</span>
          <strong>{formatUSDC(paymentRequest.amount)}</strong>
        </div>
        <div className="detail-row">
          <span>To:</span>
          <span>{shortenAddress(paymentRequest.merchant)}</span>
        </div>
        <div className="detail-row">
          <span>Your Balance:</span>
          <span>{formatUSDC(balance.balance)}</span>
        </div>
        <div className="detail-row">
          <span>After Payment:</span>
          <span>{formatUSDC(balance.balance - paymentRequest.amount)}</span>
        </div>
      </div>
      
      <div className="button-group">
        <button className="btn-cancel" onClick={onCancel}>
          Cancel
        </button>
        <button className="btn-primary" onClick={onConfirm}>
          Confirm & Pay
        </button>
      </div>
    </div>
  );
}
```

#### Widget Distribution

**CDN-Hosted (Production):**
```html
<!-- Merchant adds to their website -->
<script src="https://cdn.pay402.com/widget.js"></script>
<script>
  Pay402.init({
    facilitatorUrl: 'https://facilitator.pay402.com',
    googleClientId: 'MERCHANT_GOOGLE_CLIENT_ID'
  });
</script>
```

**npm Package (Developers):**
```bash
npm install @pay402/widget
```

```typescript
import { Pay402 } from '@pay402/widget';

Pay402.init({
  facilitatorUrl: process.env.FACILITATOR_URL,
  googleClientId: process.env.GOOGLE_CLIENT_ID
});
```

---

### 4. Widget Deployment Model

**Deployment Strategy:** CDN-Hosted Embedded Widget (Stripe/PayPal Model)  
**Complexity:** ★★☆☆☆ (Medium)  
**Distribution:** Zero User Installation  

#### Physical Architecture

```
┌────────────────────────────────────────────────────────────────┐
│  Production Deployment                                         │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│  1. Build & Upload                                             │
│     ┌──────────────────┐                                      │
│     │ widget/          │  npm run build                       │
│     │   src/           ├────────────────────┐                 │
│     │   *.tsx          │                    │                 │
│     └──────────────────┘                    ▼                 │
│                                    ┌─────────────────┐         │
│                                    │ webpack         │         │
│                                    │ - TypeScript    │         │
│                                    │ - React JSX     │         │
│                                    │ - Tree shaking  │         │
│                                    │ - Minification  │         │
│                                    └────────┬────────┘         │
│                                             │                  │
│                                             ▼                  │
│                                    ┌─────────────────┐         │
│                                    │ widget.js       │         │
│                                    │ (~150 KB gzip)  │         │
│                                    └────────┬────────┘         │
│                                             │                  │
│                                   Upload to CDN                │
│                                             │                  │
│  2. CDN Distribution                        ▼                  │
│     ┌─────────────────────────────────────────────┐           │
│     │ Cloudflare CDN / AWS CloudFront             │           │
│     │ https://cdn.pay402.com/                     │           │
│     │                                             │           │
│     │ ├── widget.js          (main bundle)       │           │
│     │ ├── widget.js.map      (source maps)       │           │
│     │ └── widget.css         (optional styles)   │           │
│     └─────────────────────────────────────────────┘           │
│                              │                                │
│                              │ Global edge caching            │
│                              │                                │
└──────────────────────────────┼────────────────────────────────┘
                               │
                               │ HTTP GET
                               │
┌──────────────────────────────┼────────────────────────────────┐
│  Merchant's Website          ▼                                │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│  <!-- merchant.com/index.html -->                             │
│  <html>                                                        │
│    <head>                                                      │
│      <!-- ONE-TIME SETUP: Add script tag -->                  │
│      <script src="https://cdn.pay402.com/widget.js"></script> │
│      <script>                                                  │
│        Pay402.init({                                           │
│          facilitatorUrl: 'https://facilitator.pay402.com',    │
│          googleClientId: 'MERCHANT_GOOGLE_ID'                 │
│        });                                                     │
│      </script>                                                 │
│    </head>                                                     │
│    <body>                                                      │
│      <button onclick="fetchData()">Get Premium Data</button>  │
│      <script>                                                  │
│        async function fetchData() {                            │
│          // Normal fetch - widget intercepts 402!             │
│          const res = await fetch('/api/premium');             │
│          // Widget handles payment automatically              │
│        }                                                       │
│      </script>                                                 │
│    </body>                                                     │
│  </html>                                                       │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

#### Runtime Behavior

**Widget Lifecycle:**

```typescript
// 1. PAGE LOAD
// - Merchant's page loads
// - <script src="cdn.pay402.com/widget.js"> downloads
// - Widget initializes in background (invisible)

┌─────────────────────────────────────────────┐
│ User's Browser (merchant.com)               │
│                                             │
│ [Page Content]                              │
│                                             │
│ (Widget running silently in background)     │
│  ✓ Listening for fetch() calls              │
│  ✓ zkLogin session check (localStorage)    │
│  ✓ Modal container created (display:none)  │
└─────────────────────────────────────────────┘

// 2. USER CLICKS BUTTON
// - JavaScript calls fetch('/api/premium')
// - Widget intercepts via monkey-patched window.fetch

┌─────────────────────────────────────────────┐
│ Widget: Intercepting fetch()                │
│                                             │
│ const originalFetch = window.fetch;         │
│ window.fetch = async (...args) => {         │
│   const res = await originalFetch(...args); │
│   if (res.status === 402) {                 │
│     await widget.handlePayment(res);        │
│   }                                         │
│   return res;                               │
│ };                                          │
└─────────────────────────────────────────────┘

// 3. SERVER RETURNS 402
// - Merchant API returns 402 Payment Required
// - Widget detects, parses WWW-Authenticate header

┌─────────────────────────────────────────────┐
│ HTTP/1.1 402 Payment Required               │
│ WWW-Authenticate: x402                      │
│   amount=100000                             │
│   currency=USDC                             │
│   merchant=0xMERCHANT                       │
│   facilitator=https://facilitator.pay402... │
└─────────────────────────────────────────────┘

// 4. WIDGET SHOWS MODAL
// - Modal container visibility: block
// - React portal renders payment UI

┌─────────────────────────────────────────────┐
│ User's Browser (merchant.com)               │
│                                             │
│ [Dimmed Page Content]                       │
│                                             │
│  ┌────────────────────────────────────┐    │
│  │ ⚡ Payment Required                │    │
│  │                                    │    │
│  │ Amount: 0.1 USDC                   │    │
│  │ Merchant: api.merchant.com         │    │
│  │                                    │    │
│  │ [Login with Google] ← Button       │    │
│  └────────────────────────────────────┘    │
│                                             │
└─────────────────────────────────────────────┘

// 5. PAYMENT FLOW
// (zkLogin → balance check → confirm → settle)

// 6. WIDGET RETRIES FETCH
// - Adds X-Payment header
// - Returns content to merchant's JavaScript

┌─────────────────────────────────────────────┐
│ GET /api/premium                            │
│ X-Payment: eyJhbGc...                       │
│                                             │
│ → 200 OK                                    │
│   {"data": "premium content"}               │
└─────────────────────────────────────────────┘

// 7. MODAL CLOSES
// - Widget hides modal (display:none)
// - Content delivered to merchant's callback
```

#### Comparison: Distribution Models

| Model | User Experience | Merchant Integration | Security | Our Choice |
|-------|----------------|---------------------|----------|-----------|
| **Browser Extension** (MetaMask) | ❌ Must install extension<br>❌ 5+ clicks<br>❌ Chrome Web Store approval | ✅ Just add code | ✅ Isolated context | ❌ Too much friction |
| **Embedded Widget** (Stripe) | ✅ Zero installation<br>✅ 3 clicks<br>✅ Works everywhere | ✅ One `<script>` tag | ⚠️ Runs in page context | ✅ **CHOSEN** |
| **Native Protocol** (Web Payments) | ✅ Browser-native UI<br>✅ 2 clicks | ⚠️ Requires browser support | ✅ Browser-level | ❌ Not available yet |
| **Separate App** (Venmo) | ❌ Must install app<br>❌ Context switch<br>❌ Mobile-only | ❌ Deep linking complex | ✅ Sandboxed | ❌ Poor UX |

**Winner: Embedded Widget** ✅

#### Build & Deployment Process

**Development:**
```bash
cd widget
npm run dev  # Webpack dev server on localhost:3000
```

**Production Build:**
```bash
cd widget
npm run build

# Output: widget/dist/
├── widget.js         # 150 KB (minified + gzipped)
├── widget.js.map     # Source maps (debugging)
└── widget.css        # Styles (optional, can be inlined)

# Build includes:
# - TypeScript → JavaScript
# - React JSX → vanilla JS
# - Tree shaking (remove unused code)
# - Minification (uglify)
# - Code splitting (lazy load modal components)
```

**Upload to CDN:**
```bash
# AWS CloudFront
aws s3 cp dist/widget.js s3://pay402-cdn/widget.js \
  --cache-control "public, max-age=31536000, immutable"
aws cloudfront create-invalidation \
  --distribution-id E12345EXAMPLE \
  --paths "/widget.js"

# Cloudflare (recommended)
wrangler publish widget.js
# Or via dashboard: Upload to R2 + enable CDN

# Vercel Edge
vercel deploy --prod
```

**Versioning:**
```bash
# Production (stable)
https://cdn.pay402.com/widget.js           # Latest stable

# Versioned (for backward compatibility)
https://cdn.pay402.com/v1/widget.js        # Major version 1
https://cdn.pay402.com/v1.2/widget.js      # Minor version 1.2
https://cdn.pay402.com/v1.2.3/widget.js    # Exact version 1.2.3

# Merchants choose:
<script src="https://cdn.pay402.com/widget.js"></script>        # Auto-update
<script src="https://cdn.pay402.com/v1/widget.js"></script>     # Stable v1.x
<script src="https://cdn.pay402.com/v1.2.3/widget.js"></script> # Pin exact version
```

**Subresource Integrity (SRI):**
```bash
# Generate hash during build
openssl dgst -sha384 -binary dist/widget.js | openssl base64 -A
# Output: oqVuAfXRKap7fdgcCY5uykM6+R9GqQ8K/uxy9rx7HNQlGYl1kPzQho1wx4JwY8wC

# Merchants can verify integrity
<script 
  src="https://cdn.pay402.com/v1.2.3/widget.js"
  integrity="sha384-oqVuAfXRKap7fdgcCY5uykM6+R9GqQ8K/uxy9rx7HNQlGYl1kPzQho1wx4JwY8wC"
  crossorigin="anonymous">
</script>
# Browser verifies hash before executing!
```

#### Security Considerations

**Threat: CDN Compromise**
- **Risk:** Attacker modifies widget.js on CDN
- **Mitigation:** 
  - Subresource Integrity (SRI) validation
  - Immutable URLs with version hashing
  - CSP (Content Security Policy) headers

**Threat: Merchant XSS**
- **Risk:** Merchant's page has XSS, attacker steals zkLogin keys
- **Mitigation:**
  - Store ephemeral keys in sessionStorage (not localStorage)
  - Short max_epoch (~10 epochs = 10 days)
  - Clear keys on window close

**Threat: Malicious Merchant**
- **Risk:** Fake merchant impersonates real merchant
- **Mitigation:**
  - Widget shows merchant address (not domain)
  - User confirms recipient in modal
  - Event logs on-chain (audit trail)

**Threat: Supply Chain Attack**
- **Risk:** Compromised npm package in build process
- **Mitigation:**
  - Lock file (package-lock.json)
  - Audit dependencies (npm audit)
  - Minimal dependencies (React + SUI SDK only)

#### Demo Setup: Widget in Action

**For Hackathon Demo:**

```html
<!-- demo/index.html -->
<!DOCTYPE html>
<html>
<head>
  <title>Pay402 Demo - Premium Weather API</title>
  
  <!-- Load widget from CDN (or localhost during dev) -->
  <script src="http://localhost:3000/widget.js"></script>
  
  <script>
    // Initialize widget
    Pay402.init({
      facilitatorUrl: 'http://localhost:3001',  // Local facilitator
      googleClientId: 'YOUR_GOOGLE_CLIENT_ID'
    });
  </script>
  
  <style>
    body { font-family: sans-serif; max-width: 600px; margin: 50px auto; }
    button { padding: 12px 24px; font-size: 16px; cursor: pointer; }
    #result { margin-top: 20px; padding: 20px; background: #f0f0f0; }
  </style>
</head>
<body>
  <h1>🌤️ Premium Weather API Demo</h1>
  <p>Click below to fetch premium weather data (costs $0.01 in USDC)</p>
  
  <button onclick="fetchWeatherData()">
    Get Weather Data ($0.01)
  </button>
  
  <div id="result" style="display:none;"></div>
  
  <script>
    async function fetchWeatherData() {
      try {
        // Normal fetch - widget automatically intercepts 402!
        const response = await fetch('https://x402.payai.network/echo?message=weather_data');
        
        // Widget handles payment flow if 402
        // On success, response is automatically retried with payment token
        
        if (response.ok) {
          const data = await response.text();
          document.getElementById('result').innerHTML = `
            <h3>✅ Success!</h3>
            <pre>${data}</pre>
          `;
          document.getElementById('result').style.display = 'block';
        }
      } catch (error) {
        console.error('Error:', error);
        alert('Payment failed: ' + error.message);
      }
    }
  </script>
</body>
</html>
```

**What Merchant Sees:**
```
Demo Page:
┌────────────────────────────────┐
│ 🌤️ Premium Weather API Demo    │
│                                │
│ Click below to fetch premium   │
│ weather data (costs $0.01)     │
│                                │
│ [Get Weather Data ($0.01)]     │
└────────────────────────────────┘

(After click, widget modal appears automatically)
```

**Merchant Code Changes:**
- **Before Pay402:** Merchant handles 402 manually (complex!)
- **After Pay402:** Just add `<script>` tag (automatic!)

#### Real-World Examples (Similar Distribution)

**Stripe Checkout:**
```html
<script src="https://js.stripe.com/v3/"></script>
<script>
  const stripe = Stripe('pk_test_XXX');
  stripe.redirectToCheckout({ ... });
</script>
```

**PayPal Buttons:**
```html
<script src="https://www.paypal.com/sdk/js?client-id=XXX"></script>
<script>
  paypal.Buttons({ ... }).render('#paypal-button');
</script>
```

**Google Analytics:**
```html
<script async src="https://www.googletagmanager.com/gtag/js?id=G-XXX"></script>
<script>
  gtag('config', 'G-XXX');
</script>
```

**Pay402 uses the EXACT SAME pattern!** ✅

#### Summary: Widget Deployment Mental Model

```
┌─────────────────────────────────────────────────────────────┐
│                     Widget Deployment                       │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  WHERE:  CDN (Cloudflare/AWS)                               │
│  WHAT:   Compiled JavaScript bundle (~150 KB)              │
│  HOW:    Merchant adds <script> tag (one-time)             │
│  WHEN:   Loaded on page load (before 402)                  │
│  WHO:    Runs in buyer's browser (on merchant's page)      │
│  WHY:    Zero installation for users!                      │
│                                                             │
│  ┌───────────────────────────────────────────────────┐     │
│  │ NOT in 402 response!                              │     │
│  │ NOT a browser extension!                          │     │
│  │ NOT a separate app!                               │     │
│  │                                                   │     │
│  │ Pre-loaded via <script> tag                       │     │
│  │ Listening for 402 responses                       │     │
│  │ Ready to show modal when needed                   │     │
│  └───────────────────────────────────────────────────┘     │
│                                                             │
│  Model: Stripe Checkout / PayPal Buttons                   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Confidence: 100%** - This is the standard embedded payment widget model.

---

## Demo Setup

### For Hackathon Demo

#### Merchant: x402 Echo (Reuse - Don't Build)

**Why x402 Echo:**
- ✅ Already implements x402 protocol
- ✅ Returns 402 with correct headers
- ✅ Validates payment tokens
- ✅ Chain-agnostic (doesn't care about SUI vs. EVM)
- ✅ Instant refunds (free testing)
- ✅ Proves interoperability

**Usage:**
```bash
# Returns 402 Payment Required
curl https://x402.payai.network/echo?message=hello
```

**Response:**
```http
HTTP/1.1 402 Payment Required
WWW-Authenticate: x402
  amount=1000000
  currency=USDC
  merchant=0xMERCHANT_ADDRESS
  facilitator=https://facilitator.pay402.com
  network=sui:testnet
  request_id=abc123
```

#### Demo Page: How Widget is Used

**Key Points:**
- ✅ Widget is **pre-loaded** via `<script>` tag (NOT in 402 response!)
- ✅ Widget **intercepts** all fetch() calls automatically
- ✅ Merchant writes **normal JavaScript** (no special payment handling!)
- ✅ Widget **injects modal** on top of merchant's page when 402 detected

```html
<!DOCTYPE html>
<html>
<head>
  <title>Pay402 Demo - Premium Weather API</title>
  
  <!-- STEP 1: Load widget from CDN (runs on page load) -->
  <script src="http://localhost:3000/widget.js"></script>
  
  <script>
    // STEP 2: Initialize widget (one-time setup)
    Pay402.init({
      facilitatorUrl: 'http://localhost:3001',
      googleClientId: 'YOUR_GOOGLE_CLIENT_ID'
    });
  </script>
  
  <style>
    body { font-family: sans-serif; max-width: 600px; margin: 50px auto; }
    button { padding: 12px 24px; font-size: 16px; cursor: pointer; }
    #result { margin-top: 20px; padding: 20px; background: #f0f0f0; }
  </style>
</head>
<body>
  <h1>🌤️ Premium Weather API Demo</h1>
  <p>Click below to access premium weather data ($0.01 per request)</p>
  
  <!-- STEP 3: Normal button (no special payment handling!) -->
  <button onclick="fetchWeatherData()">Get Weather Data ($0.01)</button>
  
  <div id="result" style="display:none;"></div>
  
  <script>
    // STEP 4: Normal fetch call (merchant doesn't handle payment!)
    async function fetchWeatherData() {
      try {
        // Merchant writes normal fetch code
        const response = await fetch('https://x402.payai.network/echo?message=weather_data');
        
        // Widget automatically intercepts 402 responses!
        // - Detects 402 status
        // - Parses WWW-Authenticate header
        // - Shows payment modal
        // - Handles zkLogin flow
        // - Retries fetch with payment token
        // - Returns final response
        
        if (response.ok) {
          const data = await response.text();
          document.getElementById('result').innerHTML = `
            <h3>✅ Success!</h3>
            <pre>${data}</pre>
          `;
          document.getElementById('result').style.display = 'block';
        }
      } catch (error) {
        console.error('Error:', error);
        alert('Payment failed: ' + error.message);
      }
    }
  </script>
  
  <!-- STEP 5: Widget handles everything automatically! -->
  <!-- Merchant doesn't write any payment code -->
</body>
</html>
```

**Visual Flow in Demo:**

```
1. User visits demo page
   ┌────────────────────────────────┐
   │ 🌤️ Premium Weather API Demo    │
   │                                │
   │ Click below to access premium  │
   │ weather data ($0.01)           │
   │                                │
   │ [Get Weather Data ($0.01)]     │
   └────────────────────────────────┘
   
   (Widget loaded in background, listening)

2. User clicks button → fetch() called

3. Server returns 402 → Widget detects!

4. Widget shows modal (overlays page)
   ┌────────────────────────────────┐
   │ [Page Content - DIMMED]        │
   │                                │
   │  ┌──────────────────────────┐  │
   │  │ ⚡ Payment Required       │  │
   │  │                          │  │
   │  │ Amount: 0.01 USDC        │  │
   │  │ Merchant: x402.payai...  │  │
   │  │                          │  │
   │  │ [Login with Google]      │  │
   │  └──────────────────────────┘  │
   │                                │
   └────────────────────────────────┘

5. Payment flow (zkLogin → pay → settle)

6. Widget closes modal, delivers content
   ┌────────────────────────────────┐
   │ 🌤️ Premium Weather API Demo    │
   │                                │
   │ ✅ Success!                    │
   │ weather_data response here     │
   └────────────────────────────────┘
```

**Critical Understanding:**
- Widget is **NOT** sent in the 402 response!
- Widget is **pre-loaded** by merchant (like Stripe Checkout)
- Widget **monkey-patches** window.fetch to intercept 402s
- Merchant writes **normal code**, widget handles payment automatically

### Demo Script (60 Seconds)

```
[Screen recording with voiceover]

"Hi, I'm a regular user. I want to access premium weather data from this API.

[Click 'Get Weather Data']

I see a payment is required - but look, no MetaMask popup!

[Payment modal appears]

Instead, I just click 'Login with Google'.

[Click Google button, OAuth screen]

I use my regular Google account.

[Redirect back]

Boom! My blockchain address is created automatically from my Google login.

[Show address: 0xABC...DEF]

The system checks my balance - I have 20 USDC.

[Show balance]

I confirm the payment - just $0.01.

[Click 'Confirm & Pay']

Payment settles on the SUI blockchain...

[Show processing]

And my content is delivered!

[Show weather data]

That's it. Three clicks. No wallet installation. No seed phrases.

Behind the scenes, zkLogin created my SUI address, the payment was verified, 
and settled on-chain. All invisible to me as a user.

This is Pay402 - bringing Stripe-level UX to crypto payments."
```

---

## Technical Specifications

### PTB (Programmable Transaction Block) Mental Model

**Critical Understanding: Where is PTB Construction Done?**

**Answer: In TypeScript (client-side), NOT in Move contracts!**

This is fundamentally different from EVM/Solidity development and critical to understand:

#### SUI/Move Model vs EVM/Solidity Model

```
┌─────────────────────────────────────────────────────────────────┐
│  EVM/Solidity Model (IN-CONTRACT COMPOSITION)                   │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Smart Contract (Solidity):                                     │
│  ┌────────────────────────────────────────────────────────┐    │
│  │ function payMerchant() external {                      │    │
│  │   // CONTRACT orchestrates multiple calls              │    │
│  │   USDC.transferFrom(buyer, address(this), amount);     │    │
│  │   USDC.transfer(merchant, amount - fee);               │    │
│  │   USDC.transfer(facilitator, fee);                     │    │
│  │   emit PaymentSettled(...);                            │    │
│  │ }                                                      │    │
│  └────────────────────────────────────────────────────────┘    │
│                                                                 │
│  TypeScript (Hardhat Script):                                   │
│  ┌────────────────────────────────────────────────────────┐    │
│  │ // Just ONE contract call                              │    │
│  │ await contract.payMerchant();                          │    │
│  └────────────────────────────────────────────────────────┘    │
│                                                                 │
│  ✅ Composition happens IN CONTRACT                             │
│  ✅ Script just triggers entry point                            │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  SUI/Move Model (CLIENT-SIDE COMPOSITION)                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Move Contract (Simple Logic ONLY):                             │
│  ┌────────────────────────────────────────────────────────┐    │
│  │ public fun settle_payment<T>(                          │    │
│  │   buyer_coin: &mut Coin<T>,  // Takes coin reference   │    │
│  │   amount: u64,                                         │    │
│  │   merchant: address,                                   │    │
│  │   fee: u64,                                            │    │
│  │   // ...                                               │    │
│  │ ): Receipt {                                           │    │
│  │   // Simple split & transfer logic                     │    │
│  │   let payment = coin::split(buyer_coin, amount, ctx);  │    │
│  │   transfer::public_transfer(payment, merchant);        │    │
│  │   // No orchestration - just pure logic!               │    │
│  │ }                                                      │    │
│  └────────────────────────────────────────────────────────┘    │
│                                                                 │
│  TypeScript (PTB Construction - THE ORCHESTRATOR):              │
│  ┌────────────────────────────────────────────────────────┐    │
│  │ const tx = new TransactionBlock();                     │    │
│  │                                                        │    │
│  │ // CLIENT orchestrates multiple operations!            │    │
│  │ const [coin] = tx.splitCoins(tx.gas, [amount]);       │    │
│  │                                                        │    │
│  │ tx.moveCall({                                          │    │
│  │   target: `${PKG}::payment::settle_payment`,          │    │
│  │   typeArguments: [coinType],                          │    │
│  │   arguments: [                                         │    │
│  │     tx.object(coinObjectId),  // Which coin?          │    │
│  │     tx.pure(amount, 'u64'),   // How much?            │    │
│  │     tx.pure(merchant, 'address'), // To whom?         │    │
│  │     // ...                                             │    │
│  │   ]                                                   │    │
│  │ });                                                    │    │
│  │                                                        │    │
│  │ // Add more calls if needed (e.g., merge coins first)  │    │
│  │ // All executed ATOMICALLY in one transaction          │    │
│  │                                                        │    │
│  │ await client.signAndExecuteTransactionBlock({ tx });   │    │
│  └────────────────────────────────────────────────────────┘    │
│                                                                 │
│  ✅ Composition happens IN TYPESCRIPT (client-side)             │
│  ✅ Move contract is just simple, reusable functions            │
│  ✅ PTB = "Transaction script" built by client                  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

#### Key Differences

| Aspect | EVM/Solidity | SUI/Move |
|--------|-------------|----------|
| **Orchestration** | In contract (Solidity) | In client (TypeScript) |
| **Contract Role** | Entry point + logic | Pure functions only |
| **Transaction Construction** | Contract decides flow | Client decides flow |
| **Flexibility** | Fixed in contract | Dynamic per call |
| **Gas Optimization** | Contract optimizes | Client optimizes |
| **Script Language** | Solidity (contract calls Solidity) | TypeScript (client calls Move) |

#### Where PTBs Live in Our Codebase

```
pay402/
├── move/
│   └── payment/
│       └── sources/
│           └── payment.move          ← Pure logic functions
│                                       ❌ NO PTB construction here!
│                                       ✅ Just settle_payment() function
│
├── facilitator/
│   └── src/
│       ├── api/
│       │   └── settle-payment.ts     ← PTB construction HERE! ✅
│       │       // const tx = new TransactionBlock();
│       │       // tx.moveCall({ ... })
│       │
│       └── services/
│           └── sui-client.ts         ← PTB construction HERE! ✅
│                                       (for balance checks via devInspect)
│
└── widget/
    └── src/
        └── ZkLoginManager.ts         ← PTB construction HERE! ✅
            // User might construct PTB in browser
            // (if we allow client-side settlement)
```

#### Example: Payment Settlement PTB

**Move Contract (move/payment/sources/payment.move):**
```move
// Simple function - NO orchestration!
public fun settle_payment<T>(
    buyer_coin: &mut Coin<T>,
    amount: u64,
    merchant: address,
    facilitator_fee: u64,
    // ...
): EphemeralReceipt {
    // Just split & transfer logic
    let payment = coin::split(buyer_coin, amount, ctx);
    let fee = coin::split(&mut payment, facilitator_fee, ctx);
    transfer::public_transfer(payment, merchant);
    transfer::public_transfer(fee, ctx.sender());
    // Return receipt
}
```

**TypeScript (facilitator/src/api/settle-payment.ts):**
```typescript
// PTB construction - THE ORCHESTRATOR!
async function settleMerchant(buyerAddress: string, amount: string) {
  // 1. Discover coins (client-side logic)
  const coins = await client.getCoins({ owner: buyerAddress, coinType });
  
  // 2. Find suitable coin (client-side logic)
  const coin = coins.data.find(c => BigInt(c.balance) >= BigInt(amount));
  
  // 3. BUILD PTB (client-side orchestration!)
  const tx = new TransactionBlock();
  
  // 4. Call Move function (one operation in PTB)
  tx.moveCall({
    target: `${PACKAGE_ID}::payment::settle_payment`,
    typeArguments: [coinType],  // Client specifies coin type!
    arguments: [
      tx.object(coin.coinObjectId),  // Client chooses which coin!
      tx.pure(amount, 'u64'),
      tx.pure(merchantAddress, 'address'),
      tx.pure(FIXED_FEE, 'u64'),
      tx.object(CLOCK_ID),
    ]
  });
  
  // 5. Could add more operations (e.g., merge coins first)
  // tx.mergeCoins(...)
  // tx.moveCall(...)  // Another call
  // All atomic!
  
  // 6. Sign and execute (client submits!)
  const result = await client.signAndExecuteTransactionBlock({
    transactionBlock: tx,
    signer: facilitatorKeypair,
  });
  
  return result.digest;
}
```

#### Why This Matters

**Move Contracts:**
- ✅ Keep them **simple** (just pure logic)
- ✅ Make functions **reusable** (one function, many use cases)
- ✅ Focus on **correctness** (Move's strong typing helps)
- ❌ DON'T try to orchestrate complex flows
- ❌ DON'T worry about coin discovery
- ❌ DON'T handle conditionals/branches

**TypeScript Code:**
- ✅ Do **all orchestration** (discover, choose, compose)
- ✅ Handle **complex logic** (if/else, loops, retries)
- ✅ Optimize **gas costs** (merge coins, batch operations)
- ✅ Provide **flexibility** (different PTBs for different scenarios)

#### Mental Model Summary

```
┌─────────────────────────────────────────────────────────────────┐
│  "Move contracts are like SQL stored procedures                 │
│   TypeScript PTBs are like SQL queries"                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Move:       CREATE FUNCTION get_user(id) RETURNS user { ... } │
│              ↑ Define WHAT can be done                          │
│                                                                 │
│  TypeScript: SELECT * FROM users WHERE id = 123;               │
│              ↑ Decide WHEN and HOW to do it                     │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Confidence: 100%** - This is the fundamental SUI programming model!

---

### Blockchain Details

**Network:** SUI Testnet (mainnet-ready)  
**Token:** USDC (`0xa1ec7fc00a6f40db9693ad1415d0c193ad3906494428cf252621037bd7117e29::usdc::USDC`)  
**Gas Token:** SUI  
**Consensus:** Narwhal-Bullshark (sub-second finality)  

**Gas Costs:**
- Contract deployment: ~12 SUI (~$0.12 USD)
- Payment settlement: ~2.8 SUI (~$0.003 USD)
- Balance check (devInspect): 0 SUI (off-chain)

### API Performance

**Facilitator Response Times:**
- `/check-balance`: < 200ms (RPC query)
- `/verify-payment`: < 100ms (signature verification)
- `/settle-payment`: ~2-4s (blockchain submission)

**Total Payment Flow:**
- zkLogin (first time): ~3-5s (ZK proof generation)
- zkLogin (cached): < 1s (session reuse)
- Payment confirmation: < 5s (user decision time)
- Settlement: ~2-4s (async, non-blocking)
- **Total: ~10-15s first payment, ~5-10s repeat payments**

### Anti-Front-Running Design

**Problem: Buyer Could Front-Run Facilitator**

```typescript
// Attack scenario:
// 1. Buyer gets payment token from facilitator (off-chain)
const token = await facilitator.verifyPayment(signature);

// 2. Buyer IMMEDIATELY spends their coin elsewhere (front-runs!)
tx.moveCall({
  target: 'dex::swap',
  arguments: [buyerCoin, ...]  // Spends the USDC!
});

// 3. Facilitator tries to settle (FAILS!)
tx.moveCall({
  target: 'pay402::settle_payment',
  arguments: [buyerCoin, ...]  // Coin already spent! ❌
});
```

**Solution: Atomic Settlement with `&mut Coin<T>`**

The Move contract uses a **mutable reference** to prevent front-running:

```move
public fun settle_payment<T>(
    buyer_coin: &mut Coin<T>,  // ← Mutable reference locks coin!
    // ...
) {
    // Split happens ATOMICALLY in this transaction
    let payment = coin::split(buyer_coin, amount, ctx);
    transfer::public_transfer(payment, merchant);
    
    // Buyer's coin balance is reduced immediately
    // Version incremented - no other transaction can use it!
}
```

**Why This Works:**

1. **Ownership Lock:** `&mut` requires exclusive access during transaction
2. **Atomic Execution:** Split + transfer happen in single PTB (all-or-nothing)
3. **Version Increment:** Coin version increases after mutation (prevents reuse)
4. **Consensus Ordering:** SUI consensus ensures only one transaction per object succeeds

**Result:** Buyer **cannot** front-run because:
- Facilitator's settlement PTB locks the coin
- Any attempt to spend coin elsewhere sees "object version mismatch"
- Transaction ordering is deterministic (consensus-guaranteed)

**Confidence: 100%** - This is SUI's owned object model in action!

### Security

**zkLogin Security:**
- Non-custodial (user controls keys via OAuth)
- Ephemeral keypairs (browser-generated, session-only)
- ZK proofs (hide Google account details on-chain)
- Salt service (consistent address derivation, prevents address enumeration)

**Payment Security:**
- Signature verification (prevent forgery)
- Nonce checking (prevent replay attacks)
- Balance checks (prevent insufficient funds)
- Token expiration (5-minute validity)
- Event logging (permanent audit trail)
- **Anti-Front-Running:** `&mut Coin<T>` locks coin during settlement (buyer cannot spend elsewhere)

**Fee Model - Fixed, Not Percentage:**
```typescript
// Fixed facilitator fee: $0.01 per transaction
const FACILITATOR_FEE_USDC = 10000;  // 0.01 USDC (6 decimals)

// Economic rationale:
// - Facilitator cost is FIXED (gas ~$0.003 + overhead ~$0.002 = ~$0.005)
// - Revenue should be FIXED (not scale with payment size)
// - Infrastructure pricing model (like RPC nodes), not payment processing (like Stripe)
// 
// Examples:
// $0.10 payment → $0.01 fee (10%) → $0.09 to merchant
// $1.00 payment → $0.01 fee (1%) → $0.99 to merchant
// $10.00 payment → $0.01 fee (0.1%) → $9.99 to merchant
// 
// Profit margin: ~50% ($0.005 cost, $0.01 revenue, $0.005 profit)
```

**Infrastructure Security:**
- Open-source widget (transparency)
- Subresource Integrity (CDN verification)
- Rate limiting (DDoS protection)
- Gas sponsorship limits (budget control)

---

## Development Roadmap

### MVP (24 Hours - Hackathon)

**Day 1 (8 hours):**
- ✅ Move contract implementation (4h)
- ✅ Facilitator API skeleton (4h)

**Day 2 (8 hours):**
- ✅ zkLogin integration (4h)
- ✅ x402 client implementation (4h)

**Day 3 (6 hours):**
- ✅ Browser widget UI (4h)
- ✅ Demo page setup (2h)

**Day 4 (2 hours):**
- ✅ Testing & bug fixes
- ✅ Demo video recording

**Total: 24 hours**

### Post-Hackathon (Phase 1: Months 1-3)

- [ ] CCTP integration (cross-chain to Base/Ethereum)
- [ ] Payment channels (for AI agents)
- [ ] Reputation system (merchant ratings)
- [ ] Analytics dashboard
- [ ] Self-hosting guide
- [ ] Production deployment (mainnet)

### Future (Phase 2: Months 4-12)

- [ ] AI agent SDK (headless client)
- [ ] Cloudflare Workers integration
- [ ] Multi-token support (beyond USDC)
- [ ] Mobile SDKs (iOS/Android)
- [ ] Browser extension (backup option)
- [ ] Merchant dashboard

---

## Competitive Analysis

### Comparison Matrix

| Feature | Coinbase x402 | PayAI | Pay402 (Us) |
|---------|---------------|-------|-------------|
| **Networks** | Base, Ethereum, Polygon | Solana, Base, Polygon | SUI (+ CCTP) |
| **zkLogin** | ❌ No | ❌ No | ✅ YES |
| **Embedded Widget** | ❓ Unknown | ❓ Unknown | ✅ YES |
| **Gas Sponsorship** | ✅ Yes | ✅ Yes | ✅ Yes |
| **Open Source** | ❌ No | ⚠️ Partial | ✅ YES |
| **Cross-Chain** | ✅ EVM only | ✅ Multi-chain | ✅ CCTP-ready |
| **AI Agent Support** | ✅ Yes | ✅ Yes | ⚠️ Roadmap |
| **Zero-Friction UX** | ❌ Wallet required | ❌ Wallet required | ✅ Google login |

### Unique Advantages

1. **zkLogin Integration** - ONLY x402 facilitator with Google OAuth → blockchain
2. **Embedded Widget** - No user installation (Stripe/PayPal model)
3. **SUI-Native** - First x402 on Move blockchain
4. **CCTP-Ready** - Cross-chain to 8+ blockchains
5. **Zero Installation** - Works in any browser
6. **Open Source** - Full transparency

---

## Success Metrics

### Hackathon Goals

- ✅ Working demo (3-click payment flow)
- ✅ Deployed on SUI testnet
- ✅ Open-source on GitHub
- ✅ Demo video recorded
- 🎯 Prize: SUI Track Winner
- 🎯 Prize: Best x402 Implementation

### Post-Hackathon (3 Months)

- 10 merchants using Pay402
- $1,000 in payment volume
- 100 unique users
- 1 partnership (e.g., Cloudflare)

### Long-Term (12 Months)

- 1,000 merchants
- $100,000 in payment volume
- 10,000 unique users
- Multi-chain support (via CCTP)
- Revenue: $10,000/month (from facilitator fees)

---

## Questions & Decisions

### Resolved ✅

1. **Architecture:** Embedded widget (like Stripe) ✅
2. **Demo:** Human user flow (not AI agent) ✅
3. **Merchant:** Use x402 Echo (don't build) ✅
4. **Scope:** SUI-only for MVP (CCTP later) ✅
5. **Faucet:** Manual step acceptable (production = on-ramp) ✅
6. **Contract:** Generic `Coin<T>` (not USDC-only) ✅
7. **Fee Model:** Fixed $0.01 (not percentage-based) ✅
8. **Widget:** TypeScript compiled to JavaScript ✅
9. **Front-Running:** Prevented by `&mut Coin<T>` (atomic settlement) ✅
10. **Coin Discovery:** Automatic via `client.getCoins()` ✅
11. **Salt Service:** Use Mysten Enoki for MVP (self-host later) ✅
12. **Amount:** Configurable via 402 response headers ✅

### Open Questions ❓

1. **Gas Sponsorship:** Always sponsor or make it optional? → **Decision: Always for MVP**
2. **Merchant Onboarding:** What documentation needed? → **Defer to post-hackathon**
3. **Revenue Model:** Free tier limits? → **Decision: No free tier, $0.01 per tx**
4. **CCTP Priority:** Build now or after hackathon? → **Decision: After (show diagram only)**
5. **zkLogin Session:** How long to cache? → **Decision: Use max_epoch from zkLogin (~10 days)**

---

## Resources & References

### SUI Documentation
- SUI Docs: https://docs.sui.io/
- Move Book: https://move-book.com/
- zkLogin Guide: https://docs.sui.io/guides/developer/cryptography/zklogin-integration
- dApp Kit: https://sdk.mystenlabs.com/dapp-kit
- TypeScript SDK: https://sdk.mystenlabs.com/typescript

### x402 Protocol
- Coinbase x402 Docs: https://docs.cdp.coinbase.com/x402/
- PayAI Docs: https://docs.payai.network/
- x402 Echo (test merchant): https://x402.payai.network/
- x402 Spec: https://github.com/base-org/x402

### CCTP & Cross-Chain
- Circle CCTP: https://www.circle.com/en/cross-chain-transfer-protocol
- SUI Bridge: https://bridge.sui.io/
- Circle USDC on SUI: https://developers.circle.com/stablecoins/sui

### Code Examples
- Hello World Contract: `/home/hamiha70/Projects/ETHGlobal/HackMoney_Jan26/HackMoney_Research/SUI_as_a_Sponsor/07_Code_Experiments/move_contracts/hello_world/`
- zkLogin Demo: https://github.com/MystenLabs/sui/tree/main/sdk/zklogin/examples/demo
- PayAI Reference: https://github.com/payai-network/payai

---

## Repository Structure (Proposed)

```
pay402/
├── README.md
├── LICENSE (MIT)
├── docs/
│   ├── ARCHITECTURE.md (this file)
│   ├── DEMO.md
│   ├── API_REFERENCE.md
│   └── DEPLOYMENT.md
├── contracts/
│   ├── Move.toml
│   ├── sources/
│   │   └── payment.move
│   └── tests/
│       └── payment_tests.move
├── facilitator/
│   ├── package.json
│   ├── src/
│   │   ├── api/
│   │   │   ├── check-balance.ts
│   │   │   ├── verify-payment.ts
│   │   │   └── settle-payment.ts
│   │   ├── services/
│   │   │   ├── sui-client.ts
│   │   │   ├── signature-verifier.ts
│   │   │   └── settlement-queue.ts
│   │   └── index.ts
│   └── Dockerfile
├── widget/
│   ├── package.json
│   ├── src/
│   │   ├── Pay402.ts
│   │   ├── ZkLoginManager.ts
│   │   ├── components/
│   │   │   ├── Modal.tsx
│   │   │   ├── LoginStep.tsx
│   │   │   ├── BalanceStep.tsx
│   │   │   ├── ConfirmStep.tsx
│   │   │   └── SuccessStep.tsx
│   │   └── index.ts
│   └── webpack.config.js
├── demo/
│   ├── index.html
│   └── assets/
└── scripts/
    ├── deploy-contract.sh
    ├── setup-facilitator.sh
    └── test-flow.sh
```

---

## Next Steps

### Immediate (Start Building)

1. **Initialize project structure**
   ```bash
   mkdir -p pay402/{contracts,facilitator,widget,demo,docs}
   cd pay402
   git init
   ```

2. **Set up Move contract**
   ```bash
   cd contracts
   sui move new payment
   # Copy hello_world patterns
   ```

3. **Set up facilitator API**
   ```bash
   cd facilitator
   npm init -y
   npm install express @mysten/sui.js bull jsonwebtoken
   ```

4. **Set up widget**
   ```bash
   cd widget
   npm init -y
   npm install react @mysten/dapp-kit @mysten/zklogin
   ```

5. **Register Google OAuth app**
   - Go to Google Cloud Console
   - Create new project
   - Enable OAuth 2.0
   - Get Client ID

### Development Order

1. Move contract (4-6h)
2. Facilitator `/check-balance` endpoint (2h)
3. Facilitator `/verify-payment` endpoint (3h)
4. Facilitator `/settle-payment` worker (3h)
5. Widget zkLogin integration (4h)
6. Widget payment flow UI (4h)
7. Demo page (2h)
8. Testing & debugging (4h)

**Total: ~26 hours**

---

## Conclusion

Pay402 represents a significant step forward in crypto UX by combining:
- **SUI blockchain** (fast, cheap, object-oriented)
- **zkLogin** (Google OAuth → blockchain address)
- **x402 protocol** (standard HTTP micropayments)
- **Embedded widget** (zero installation)

The architecture is sound, the demo flow is impressive, and the implementation is achievable within hackathon timeframe. All components are well-defined with clear interfaces and responsibilities.

**We are ready to build!** 🚀

---

**Document Version:** 1.0  
**Last Updated:** January 31, 2026  
**Status:** Ready for Implementation  
**Next:** Initialize project structure and start coding
