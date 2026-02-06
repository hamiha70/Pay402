# 🎯 Testnet zkLogin Payment Flow - Testing Guide

**Commit:** `66b73ab` - Circle USDC faucet integration  
**Date:** 2026-02-06  
**Network:** Testnet (sui-testnet)

---

## ✅ **What's Working:**

1. ✅ **zkLogin integration** - Google OAuth → SUI address derivation
2. ✅ **Payment widget** - Invoice parsing and PTB verification
3. ✅ **Circle USDC faucet** - Production-ready funding flow (just implemented!)
4. ✅ **State preservation** - New tab keeps payment context intact

---

## 🎬 **FULL END-TO-END TEST FLOW**

### **Prerequisites:**
```bash
# Ensure services are running on testnet
cd /home/hamiha70/Projects/ETHGlobal/HackMoney_Jan26/Pay402
./scripts/pay402-tmux.sh --testnet

# Services should show:
# ✅ Facilitator: http://localhost:3001
# ✅ Widget: http://localhost:5173
# ✅ Merchant: http://localhost:3002
```

---

### **Test Flow:**

#### **Step 1: Start at Merchant Demo**
```
Open: http://localhost:3002
```

**Expected:**
- See merchant demo page
- "Get Premium Data" button visible

---

#### **Step 2: Request Invoice**
**Action:** Click **"Get Premium Data"** button

**Expected:**
- Invoice appears in JSON format
- Shows payment amount (0.10 USDC)
- "Continue to Payment →" button appears

---

#### **Step 3: Navigate to Payment Widget**
**Action:** Click **"Continue to Payment →"** button

**Expected:**
- Redirects to: `http://localhost:5173?invoice=eyJ...`
- Widget detects zkLogin is configured
- Shows "Sign In with Google (zkLogin)" button

---

#### **Step 4: zkLogin Authentication**
**Action:** Click **"Sign In with Google (zkLogin)"**

**Expected:**
- Google OAuth popup appears
- Select your Google account
- Widget receives zkLogin address
- **Console shows:** `✅ [useAuth] ✅ Using Enoki (zkLogin) authentication`

**Your zkLogin address:**
```
0x2eba319f6171320e2af116fc8f21981b67e72ca7f0c060014364720f1394da1b
```

---

#### **Step 5: Review Payment Details**
**Expected automatically:**
- Invoice parsed from URL ✅
- Shows payment review screen
- Displays:
  - Resource: `/api/premium-data`
  - Network: `sui:testnet`
  - Merchant Amount: `0.10 USDC`
  - Facilitator Fee: `0.01 USDC`
  - **Total: 0.11 USDC**
  - Your Balance section (USDC: 0, SUI: 0)
  - Your zkLogin address

**Expected warning:**
```
⚠️ Insufficient balance. You need 0.1100 more USDC.
```

---

#### **Step 6: Get Testnet USDC from Circle** 🌐

**Look for the blue section:**
```
🌐 Get Real Testnet USDC from Circle
This demonstrates the real-world flow using Circle's USDC faucet.

Your Address:
[0x2eba31...] [📋 Copy button]

[🚀 Open Circle USDC Faucet]
[🔄 Refresh Balance]
```

**Action 1:** Click **"📋"** button (should copy address to clipboard)  
**Action 2:** Click **"🚀 Open Circle USDC Faucet"** button

**Expected:**
- Your address is copied to clipboard ✅
- Console shows: `✅ Address copied to clipboard: 0x2eba31...`
- **NEW TAB opens:** `https://faucet.circle.com`
- **Original payment tab stays open** (payment context preserved!) ✅

---

#### **Step 7: Request USDC from Circle Faucet**

**In the Circle faucet tab:**

1. **Select blockchain:** `Sui`
2. **Paste your address:** `0x2eba319f6171320e2af116fc8f21981b67e72ca7f0c060014364720f1394da1b`
3. **Click "Request USDC"**

**Expected:**
- Faucet confirmation message
- Transaction processing (~30-60 seconds)
- You'll receive **10 USDC** on Sui testnet

**Verification:**
```bash
# In terminal, check balance:
sui client gas 0x2eba319f6171320e2af116fc8f21981b67e72ca7f0c060014364720f1394da1b
```

---

#### **Step 8: Return to Payment Widget**

**Action:** Switch back to the **payment widget tab** (it should still be showing the payment review!)

**Expected:**
- Invoice still displayed ✅
- zkLogin still connected ✅
- Payment details unchanged ✅

**Action:** Click **"🔄 Refresh Balance"** button

**Expected:**
- Balance updates to: `USDC: 10` ✅
- Warning disappears
- **"Continue to Payment"** button becomes enabled

---

#### **Step 9: Build and Verify PTB**

**Action:** Click **"Continue to Payment"**

**Expected:**
- Screen changes to "🔍 Verifying Transaction"
- Facilitator builds PTB
- Widget verifies PTB client-side
- Screen changes to "✅ Verification Passed"

**Security checks shown:**
- ✅ Merchant address verified
- ✅ Payment amount verified
- ✅ Facilitator fee verified
- ✅ No unauthorized transfers
- ✅ Invoice not expired

**Settlement mode options:**
- ⚡ **Optimistic** (~50ms) - Instant response, facilitator guarantees
- 🔒 **Pessimistic** (~500ms) - Wait for blockchain confirmation

---

#### **Step 10: Sign and Submit Payment**

**Action:** Choose settlement mode (e.g., **Optimistic**), then click **"Sign & Pay"**

**Expected:**
- zkLogin signing happens (via Enoki)
- Console shows:
  ```
  ✍️ Buyer signed transaction
  💳 Payment submitted (optimistic mode)
  Client latency: ~50ms
  Digest: 0x...
  ```
- Screen changes to **"🎉 Payment Successful!"**

---

#### **Step 11: View Receipt**

**Expected on success screen:**
```
✅ Payment Verified Successfully!
Settlement Mode: optimistic • Time: 50ms ⚡

📝 Transaction Receipt
Transaction Hash: 0x... [Link to Testnet Explorer]
Merchant Amount: 0.10 USDC
Facilitator Fee: 0.01 USDC
Status: ✅ Confirmed
```

**Actions available:**
- **"🎁 Access Premium Content"** - Opens merchant verify endpoint
- **"New Payment"** - Start over

---

#### **Step 12: Access Protected Resource**

**Action:** Click **"🎁 Access Premium Content"**

**Expected:**
- New tab opens to merchant's verify endpoint
- Shows premium data (proves payment verified!)
- Displays latency metrics

---

## 🎯 **DEMO TALKING POINTS**

### **1. Real USDC, Real Blockchain**
> "This is real Circle USDC on Sui testnet, not just testnet tokens. Users get it from Circle's official faucet."

### **2. zkLogin = No Wallet Needed**
> "Users just sign in with Google. Their SUI address is derived cryptographically from their Google account. No seed phrases, no wallet extensions."

### **3. Gas-Sponsored Transactions**
> "Notice the user only paid in USDC (0.11 total). They didn't need SUI for gas - the facilitator sponsored it."

### **4. Client-Side Verification**
> "Before signing, the widget verified the PTB to ensure no unauthorized transfers. The user's browser checks the blockchain transaction, not just trusts the facilitator."

### **5. Optimistic Settlement**
> "We got a response in ~50ms. The facilitator guaranteed the payment and will wait for blockchain confirmation in the background."

### **6. Production-Ready UX**
> "The funding flow opens Circle's faucet in a new tab, preserving the payment context. In production, users would connect a wallet with existing USDC."

---

## 🐛 **TROUBLESHOOTING**

### **Issue: "Failed to load resource: :3001/fund:1 (503)"**
**Cause:** Widget tried to call `/fund` endpoint (old behavior)  
**Fix:** Refresh the page - new code detects testnet and shows Circle faucet UI instead

### **Issue: Balance doesn't update after Circle faucet**
**Cause:** Transaction not yet confirmed  
**Solution:** Wait 30-60 seconds, click "🔄 Refresh Balance" again

### **Issue: "Insufficient balance" even after funding**
**Cause:** Wrong coin type (SUI vs USDC)  
**Check:**
```bash
sui client objects 0x2eba319f6171320e2af116fc8f21981b67e72ca7f0c060014364720f1394da1b
# Look for coinType containing "usdc::USDC"
```

### **Issue: zkLogin connection lost**
**Cause:** Page refresh or tab close  
**Solution:** Click "Sign In with Google (zkLogin)" again - uses cached session

---

## 📊 **SUCCESS CRITERIA**

✅ **Complete flow without errors**  
✅ **zkLogin connects with Google**  
✅ **Circle faucet opens in new tab**  
✅ **Balance updates after funding**  
✅ **Payment submits successfully**  
✅ **Transaction appears on testnet explorer**  
✅ **Protected resource accessible**

---

## 🔗 **USEFUL LINKS**

- **Testnet Explorer:** https://testnet.suivision.xyz
- **Circle Faucet:** https://faucet.circle.com
- **Your zkLogin Address:** `0x2eba319f6171320e2af116fc8f21981b67e72ca7f0c060014364720f1394da1b`

---

## 📝 **NOTES**

- **Network:** Testnet (confirmed via `sui client active-env`)
- **Facilitator:** Sponsored gas from `0x44118d0b343e8cb4203bdd4d75321a2eec4a9ec3c4778dcdda715fee18945995`
- **USDC Type:** Real Circle USDC on Sui testnet
- **zkLogin:** Google OAuth via Enoki

---

**Ready to test! 🚀**

Report any issues and I'll help debug!
