# Manual Testing Guide - Sponsored Transactions

## ✅ What's Implemented

All core functionality for sponsored transactions is complete:

1. ✅ Transaction kind build (no gas data)
2. ✅ Widget signs transaction with buyer keypair
3. ✅ Facilitator sponsors gas and submits with dual signatures
4. ✅ Both settlement modes (optimistic/pessimistic)
5. ✅ Receipt verification on-chain

## 🚀 Services Running

Before testing, ensure all services are running:

```bash
# Facilitator (port 3001)
cd facilitator && npx tsx src/index.ts

# Merchant (port 3002)  
cd merchant && node src/index.js

# Widget (port 5174)
cd widget && npm run dev
```

Check status:
```bash
curl http://localhost:3001/health  # Should return {"status":"ok"}
curl http://localhost:3002/health  # Should return {"status":"healthy"}
curl http://localhost:5174         # Should load widget UI
```

## 📝 Manual Test Flow

### **Step 1: Navigate to Merchant**

Open browser to: `http://localhost:3002`

You should see the merchant page with:
- Premium data card (blurred)
- "Get Premium Data" button

### **Step 2: Initiate Payment**

Click **"Get Premium Data"** button

- Browser redirects to widget: `http://localhost:5174`
- Invoice JWT passed via URL params

### **Step 3: Sign In (Generate Keypair)**

Widget shows: "Please sign in to continue"

Click **"Sign In with Demo Keypair"**

This will:
- Generate a NEW Ed25519 keypair
- Derive SUI address
- Store keypair in browser storage
- Show your address

**Important:** Each test run creates a NEW address!

### **Step 4: Fund Wallet (If Needed)**

Widget shows your balance: `0 SUI`

Click **"Get Test SUI"** (Fund 10 SUI button)

This calls the facilitator's faucet:
- Facilitator sends 10 SUI to your address
- Wait ~2-3 seconds
- Balance updates to: `10 SUI`

### **Step 5: Review Payment**

Widget shows invoice details:
- Merchant: `0xbf8c...8248`
- Amount: `0.1 SUI`
- Facilitator Fee: `0.01 SUI`
- **Total: `0.11 SUI`**
- Your Balance: `10 SUI`

Click **"Continue to Payment"**

### **Step 6: Transaction Kind Build**

Widget requests PTB from facilitator:

**Expected:** 
```
✓ Transaction kind received (341 bytes)
✓ PTB verified client-side
✓ Ready to sign
```

**If Error:**
- Check facilitator logs: `tail -f /tmp/facilitator.log`
- Check buyer balance
- Verify facilitator has SUI for gas sponsorship

### **Step 7: Sign Transaction**

Widget shows: "Ready to sign"

Click **"Sign & Pay (Optimistic)"** or **"Sign & Pay (Pessimistic)"**

**What happens (behind the scenes):**

1. **Widget:**
   ```typescript
   // Reconstruct transaction from kind bytes
   const tx = Transaction.fromKind(kindBytes);
   tx.setSender(buyerAddress);
   
   // Sign with buyer keypair
   const { signature } = await signTransaction(tx);
   
   // Send to facilitator
   POST /submit-payment {
     transactionKindBytes,
     buyerSignature,
     settlementMode: 'optimistic'
   }
   ```

2. **Facilitator:**
   ```typescript
   // Add gas sponsorship
   tx.setGasOwner(facilitatorAddress);
   tx.setGasPayment([facilitatorGasCoin]);
   
   // Sign with facilitator keypair
   const facilitatorSig = await sign(tx);
   
   // Submit with DUAL signatures
   await executeTransaction({
     transaction: txBytes,
     signatures: [buyerSignature, facilitatorSig]
   });
   ```

### **Step 8: Payment Success**

**Optimistic Mode (Fast UX):**
- Response in ~50-100ms
- Shows digest immediately
- Redirects back to merchant

**Pessimistic Mode (Safe UX):**
- Response in ~500-800ms
- Waits for on-chain confirmation
- Shows receipt with full details
- Redirects back to merchant

### **Step 9: Verify Premium Content**

Browser redirects to: `http://localhost:3002?digest=<txid>`

Merchant page shows:
- ✅ Premium content UNBLURRED
- Transaction digest displayed
- "Payment verified!" message

---

## 🔍 **Debugging**

### Check Facilitator Logs

```bash
tail -f /tmp/facilitator.log
```

Look for:
- `=== SPONSORED TRANSACTION SUBMIT ===`
- `Gas sponsorship configured`
- `Transaction submitted`
- `Receipt event found`

### Check Widget Console

Open browser DevTools (F12) → Console

Look for:
- `✍️ Buyer signed transaction`
- `💳 Payment submitted (optimistic mode)`
- Transaction digest

### Common Issues

**1. "Insufficient SUI for gas"**
- This should NOT happen anymore!
- Facilitator pays gas (not buyer)
- If you see this, facilitator has no SUI
- Solution: Fund facilitator address

**2. "PTB verification failed"**
- Transaction kind bytes don't match invoice
- Check invoice JWT is valid
- Check invoice hasn't expired

**3. "No coins found"**
- Buyer has no USDC/SUI
- Click "Get Test SUI" to fund
- Wait for faucet transaction to confirm

**4. "Dual signature failed"**
- Buyer signature invalid
- Facilitator signature failed
- Check keypair is correctly stored

---

## 📊 **What to Verify**

### ✅ Transaction Kind Build

```bash
# Rapid test
cd /home/hamiha70/Projects/ETHGlobal/HackMoney_Jan26/Pay402
bash scripts/test-ptb-build.sh
```

**Expected output:**
```
✓ Transaction kind built successfully (80-150ms)
  Transaction kind size: 341 bytes
  (Ready for sponsored transaction - buyer signs, facilitator adds gas)
```

### ✅ Buyer Signature

Check widget console:
```
✍️ Buyer signed transaction
  Sender: 0x1234...abcd
  Signature length: 88 (base64)
```

### ✅ Gas Sponsorship

Check facilitator logs:
```
Gas sponsorship configured
  facilitator: 0x4411...5995
  gasCoin: 0x4dec...d87f
  buyer: 0x1234...abcd
```

### ✅ Dual Signatures

Check facilitator logs:
```
Transaction data BEFORE execute
  signatures: [ "buyerSig...", "facilitatorSig..." ]
  signaturesLength: 2
```

### ✅ On-Chain Settlement

**Optimistic:**
```
=== OPTIMISTIC: SAFE TO DELIVER (IMMEDIATE) ===
  httpLatency: 45ms
  
=== BACKGROUND: TRANSACTION SUBMITTED & FINALIZED ===
  digest: 5Hk7...9qLk
  submitLatency: 523ms
```

**Pessimistic:**
```
=== SUBMIT PAYMENT SUCCESS (PESSIMISTIC) ===
  submitLatency: 612ms
  hasReceipt: true
```

---

## 🎯 **Success Criteria**

✅ **Buyer Experience:**
- No SUI required (only USDC/payment coin)
- Signs transaction (proves consent)
- Fast UX (<100ms optimistic, <1s pessimistic)

✅ **Facilitator:**
- Pays gas fees (~0.01 SUI)
- Sponsors transaction successfully
- Dual signature works

✅ **Architecture:**
- Transaction kind build (no gas)
- Gas sponsorship (facilitator provides SUI)
- Dual signatures (buyer + facilitator)
- Receipt verification (on-chain proof)

---

## 🚨 **Known Limitations**

1. **Demo Keypair Only:**
   - Currently only supports demo keypairs
   - zkLogin (Enoki) not yet integrated
   - For demo/testing purposes

2. **SUI Coin for Payments:**
   - Currently using SUI for payment
   - Production should use USDC
   - Move contract supports generic Coin<T>

3. **Single Coin Requirement:**
   - Buyer needs one coin with sufficient balance
   - Coin merging not yet implemented
   - Use fresh address from faucet

4. **Localnet Only:**
   - Configured for localnet
   - Need to update for testnet/mainnet
   - Package ID hardcoded in `.env`

---

## 📞 **Support**

If you encounter issues:

1. Check all services are running
2. Check facilitator has SUI balance
3. Review logs (facilitator, widget console)
4. Verify invoice JWT is valid
5. Try with fresh buyer address

For detailed architecture:
- See `docs/SPONSORED_TRANSACTIONS_ANALYSIS.md`
- See `docs/IMPLEMENTATION_STATUS.md`
