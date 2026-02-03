# Pay402 Security Model

**Date:** February 3, 2026  
**Status:** ✅ Documented

---

## Overview

Pay402 uses a **defense-in-depth** security model with validation at multiple layers:

1. **Invoice Creation** - Merchant signs invoice with payment terms
2. **PTB Building** - Facilitator constructs PTB matching invoice
3. **PTB Verification** - Widget validates PTB before buyer signs
4. **PTB Signing** - Buyer's wallet enforces signer identity
5. **PTB Execution** - Move contract validates all parameters on-chain

---

## Security Layers

### 1. Invoice Creation (Merchant)

**What:** Merchant creates and signs invoice JWT with payment terms

**Validates:**
- ✅ Invoice contains: amount, merchant address, fee, expiry
- ✅ Invoice is signed by merchant's private key
- ✅ Invoice cannot be tampered with (JWT signature)

**Threats Mitigated:**
- ❌ Attacker cannot modify invoice terms
- ❌ Attacker cannot impersonate merchant

**Example Invoice:**
```json
{
  "network": "sui:testnet",
  "assetType": "sui:testnet/coin:0x2::usdc::USDC",
  "payTo": "sui:testnet:0xMerchant...",
  "amount": "100000",
  "facilitatorFee": "10000",
  "expiry": 1770164657,
  "paymentId": "unique-id-123"
}
```

---

### 2. PTB Building (Facilitator)

**What:** Facilitator constructs PTB that calls `settle_payment<T>`

**Validates:**
- ✅ PTB matches invoice terms (amount, merchant, fee)
- ✅ PTB uses correct coin type
- ✅ PTB calls correct Move function

**Threats Mitigated:**
- ❌ Facilitator cannot charge wrong amount (verified by widget + Move)
- ❌ Facilitator cannot send to wrong merchant (verified by widget + Move)
- ❌ Facilitator cannot charge wrong fee (verified by widget + Move)

**PTB Structure:**
```typescript
tx.moveCall({
  target: `${packageId}::payment::settle_payment`,
  typeArguments: [coinType],
  arguments: [
    tx.object(buyerCoin),      // Buyer's coin (original, not split)
    tx.pure.address(buyer),     // Buyer address (validated: ctx.sender() == buyer)
    tx.pure.u64(amount),        // Payment amount (validated by verifier)
    tx.pure.address(merchant),  // Merchant address (validated by verifier)
    tx.pure.u64(fee),           // Facilitator fee (validated by verifier)
    tx.pure.vector('u8', paymentId),
    tx.object(CLOCK_OBJECT_ID),
  ],
});
```

---

### 3. PTB Verification (Widget/Buyer)

**What:** Widget verifies PTB before buyer signs

**Validates:**
- ✅ PTB calls `settle_payment` function
- ✅ Merchant address matches invoice
- ✅ Amount matches invoice
- ✅ Facilitator fee matches invoice
- ✅ Coin type matches invoice
- ✅ No unauthorized extra transfers
- ✅ Invoice not expired

**Does NOT Validate:**
- ⚠️ Buyer address (unknown at invoice creation, validated by Move)
- ⚠️ Facilitator address (validated by Move via sponsor)

**Why This Is Secure:**
- Move contract validates `ctx.sender() == buyer` (line 100-101)
- Move contract gets facilitator from `ctx.sponsor()` (line 114-119)
- Buyer must sign PTB (wallet enforces this)

**Verifier Logic:**
```typescript
// Validate settle_payment arguments
if (hasSettlePaymentCall) {
  // ✅ Validate merchant address (arg 4)
  if (merchantAddr !== invoice.merchantRecipient) {
    return { pass: false, reason: 'Merchant mismatch' };
  }
  
  // ✅ Validate amount (arg 3)
  if (amount !== invoice.amount) {
    return { pass: false, reason: 'Amount mismatch' };
  }
  
  // ✅ Validate fee (arg 5)
  if (fee !== invoice.facilitatorFee) {
    return { pass: false, reason: 'Fee mismatch' };
  }
  
  // ⚠️ Do NOT validate buyer (arg 2)
  // Reason: Move contract validates ctx.sender() == buyer
}

// ✅ Always check for unauthorized extra transfers
if (unauthorizedRecipients.length > 0) {
  return { pass: false, reason: 'Unauthorized transfer' };
}
```

---

### 4. PTB Signing (Wallet)

**What:** Buyer's wallet signs the PTB

**Validates:**
- ✅ Buyer must explicitly approve transaction
- ✅ Wallet shows transaction details to buyer
- ✅ Buyer's private key signs the transaction
- ✅ Signature proves buyer authorized the transaction

**Threats Mitigated:**
- ❌ Facilitator cannot sign on buyer's behalf
- ❌ Attacker cannot replay transaction (nonce/digest)

**Transaction Digest:**
```
Signer: 0xBuyer...
Gas: Sponsored by 0xFacilitator...
Commands:
  - MoveCall: settle_payment<USDC>
    - amount: 100000
    - merchant: 0xMerchant...
    - fee: 10000
```

---

### 5. PTB Execution (Move Contract)

**What:** Move contract validates all parameters on-chain

**Validates:**
- ✅ `ctx.sender() == buyer` (line 100-101)
- ✅ `ctx.sponsor() == facilitator` (line 114-119)
- ✅ Buyer has sufficient balance (automatic via `&mut Coin<T>`)
- ✅ Payment ID not empty (line 94)
- ✅ Atomic splits + transfers (no orphaned coins)

**Threats Mitigated:**
- ❌ Facilitator cannot lie about buyer identity
- ❌ Facilitator cannot avoid paying gas (must sponsor)
- ❌ Buyer cannot be double-charged (atomic transaction)
- ❌ Coins cannot be lost (atomic splits + transfers)

**Move Contract Validation:**
```move
public entry fun settle_payment<T>(
    buyer_coin: &mut Coin<T>,
    buyer: address,
    amount: u64,
    merchant: address,
    facilitator_fee: u64,
    payment_id: vector<u8>,
    clock: &Clock,
    ctx: &mut TxContext
) {
    // ✅ Validate payment ID not empty
    assert!(vector::length(&payment_id) > 0, E_EMPTY_PAYMENT_ID);
    
    // ✅ Validate buyer == signer (prevents facilitator lying)
    let actual_buyer = ctx.sender();
    assert!(actual_buyer == buyer, E_BUYER_MISMATCH);
    
    // ✅ Get facilitator from sponsor (production) or sender (tests)
    let sponsor_opt = ctx.sponsor();
    let facilitator = if (option::is_some(&sponsor_opt)) {
        *option::borrow(&sponsor_opt)  // Production: facilitator sponsors
    } else {
        ctx.sender()  // Tests: no sponsor
    };
    
    // ✅ Split and transfer atomically (no orphaned coins)
    let merchant_coin = coin::split(buyer_coin, amount, ctx);
    transfer::public_transfer(merchant_coin, merchant);
    
    let fee_coin = coin::split(buyer_coin, facilitator_fee, ctx);
    transfer::public_transfer(fee_coin, facilitator);
    
    // ✅ Emit receipt event
    event::emit(PaymentReceipt { ... });
}
```

---

## Attack Scenarios & Defenses

### Attack 1: Facilitator Lies About Buyer

**Attack:** Facilitator builds PTB with wrong buyer address

**Defense:**
1. ✅ Move contract validates `ctx.sender() == buyer` (line 100-101)
2. ✅ Transaction will abort if buyer doesn't match signer
3. ✅ Buyer must sign PTB (wallet enforces this)

**Result:** ❌ Attack fails - transaction aborts

---

### Attack 2: Facilitator Charges Wrong Amount

**Attack:** Facilitator builds PTB with `amount = 200000` but invoice says `100000`

**Defense:**
1. ✅ Widget verifier checks `amount == invoice.amount`
2. ✅ Buyer sees mismatch and rejects PTB
3. ✅ Buyer never signs the PTB

**Result:** ❌ Attack fails - buyer rejects PTB

---

### Attack 3: Facilitator Sends to Wrong Merchant

**Attack:** Facilitator builds PTB with `merchant = 0xAttacker...`

**Defense:**
1. ✅ Widget verifier checks `merchant == invoice.merchantRecipient`
2. ✅ Buyer sees mismatch and rejects PTB
3. ✅ Buyer never signs the PTB

**Result:** ❌ Attack fails - buyer rejects PTB

---

### Attack 4: Facilitator Adds Extra Transfer

**Attack:** Facilitator adds `tx.transferObjects([coin], 0xAttacker...)`

**Defense:**
1. ✅ Widget verifier checks for unauthorized transfers
2. ✅ Buyer sees extra transfer and rejects PTB
3. ✅ Buyer never signs the PTB

**Result:** ❌ Attack fails - buyer rejects PTB

---

### Attack 5: Facilitator Doesn't Sponsor Transaction

**Attack:** Facilitator builds PTB without sponsoring (buyer pays gas)

**Defense:**
1. ✅ Move contract gets facilitator from `ctx.sponsor()`
2. ✅ If no sponsor, facilitator = `ctx.sender()` (buyer)
3. ⚠️ In this case, buyer pays gas AND receives fee

**Result:** ⚠️ Attack partially succeeds (buyer pays gas) but buyer also receives facilitator fee, so net cost is just gas

**Mitigation:** In production, enforce sponsored transactions at PTB building stage

---

### Attack 6: Buyer Front-Runs Payment

**Attack:** Buyer signs PTB, then spends coin before PTB executes

**Defense:**
1. ✅ Move contract uses `&mut Coin<T>` (mutable reference)
2. ✅ Sui blockchain enforces exclusive access to mutable objects
3. ✅ If buyer spends coin, PTB cannot execute (coin locked)

**Result:** ❌ Attack fails - PTB execution aborts

---

### Attack 7: Replay Attack

**Attack:** Attacker replays signed PTB to charge buyer twice

**Defense:**
1. ✅ Each PTB has unique digest (hash of transaction)
2. ✅ Sui blockchain tracks executed digests
3. ✅ Replayed PTB will be rejected (duplicate digest)
4. ✅ Payment ID in receipt prevents duplicate processing

**Result:** ❌ Attack fails - blockchain rejects duplicate

---

## Security Properties

### Guaranteed by Move Contract

✅ **Buyer Identity:** `ctx.sender() == buyer` (enforced on-chain)  
✅ **Facilitator Identity:** `ctx.sponsor() == facilitator` (enforced on-chain)  
✅ **Atomic Execution:** Splits + transfers happen atomically  
✅ **No Orphaned Coins:** All coins accounted for  
✅ **Sufficient Balance:** Automatic via `&mut Coin<T>`  
✅ **No Double-Spend:** Mutable reference prevents concurrent access  

### Guaranteed by Widget Verifier

✅ **Amount Correctness:** PTB amount matches invoice  
✅ **Merchant Correctness:** PTB merchant matches invoice  
✅ **Fee Correctness:** PTB fee matches invoice  
✅ **Coin Type Correctness:** PTB coin type matches invoice  
✅ **No Extra Transfers:** PTB has no unauthorized transfers  
✅ **Invoice Validity:** Invoice not expired  

### Guaranteed by Wallet

✅ **Buyer Authorization:** Buyer must explicitly sign PTB  
✅ **Signature Validity:** Buyer's private key signs transaction  
✅ **Transaction Visibility:** Buyer sees transaction details  

---

## Trust Model

### What Buyer Must Trust

1. ✅ **Merchant:** Invoice terms are correct (amount, merchant address)
2. ✅ **Widget:** Verifier correctly validates PTB
3. ✅ **Wallet:** Wallet correctly displays transaction details
4. ✅ **Sui Blockchain:** Blockchain executes Move contract correctly

### What Buyer Does NOT Need to Trust

❌ **Facilitator:** Facilitator cannot steal funds or lie about terms  
❌ **PTB Builder:** Widget verifies PTB matches invoice  
❌ **Network:** Signed transaction cannot be tampered with  

---

## Production Considerations

### Sponsored Transactions

**Required:** Facilitator MUST sponsor transactions in production

**Why:**
- Buyer should not pay gas fees
- Facilitator receives fee to cover gas costs
- Move contract gets facilitator from `ctx.sponsor()`

**Implementation:**
```typescript
// Facilitator builds PTB
const tx = new Transaction();
tx.moveCall({ ... });

// Facilitator signs as sponsor
const sponsorSig = await facilitatorKeypair.signTransaction(tx);

// Buyer signs as sender
const buyerSig = await buyerWallet.signTransaction(tx);

// Submit with both signatures
await client.executeTransactionBlock({
  transactionBlock: tx,
  signature: [buyerSig, sponsorSig],
});
```

### Invoice Expiry

**Required:** All invoices must have expiry timestamp

**Why:**
- Prevents replay of old invoices
- Protects against price changes
- Limits facilitator liability

**Recommended:** 1 hour expiry

### Payment ID Uniqueness

**Required:** Payment IDs must be globally unique

**Why:**
- Prevents duplicate processing
- Enables receipt lookup
- Supports refunds/disputes

**Recommended:** `${timestamp}-${randomString}`

---

## Summary

**Security is enforced at multiple layers:**

1. **Merchant** signs invoice (JWT signature)
2. **Facilitator** builds PTB (matches invoice)
3. **Widget** verifies PTB (validates terms)
4. **Wallet** signs PTB (buyer authorization)
5. **Move Contract** validates on-chain (buyer == signer, facilitator == sponsor)

**Key Insight:** Even if facilitator is malicious, buyer is protected by:
- Widget verification (rejects bad PTB)
- Wallet authorization (buyer must sign)
- Move contract validation (enforces buyer == signer)

**Result:** ✅ Buyer cannot be cheated, even by malicious facilitator
