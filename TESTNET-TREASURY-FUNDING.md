# Testnet Treasury Auto-Funding Guide

## Overview

The `pay402-tmux.sh` script now automatically funds the **Facilitator** address on testnet from a designated **Treasury** address when the facilitator's balance drops below **0.1 SUI**.

This eliminates manual faucet interactions and enables fully automated testnet operations.

---

## 🏦 Treasury/Deployer Address

```
Address: 0x44118d0b343e8cb4203bdd4d75321a2eec4a9ec3c4778dcdda715fee18945995
Alias:   heuristic-pearl (should be your active address)
Role:    Treasury + Deployer + Internal Faucet
```

This is the **main testnet address** you manually fund. It:
- 📦 Deploys Move contracts (or could be used for deployment)
- 🏦 Acts as internal faucet for other test addresses
- 💰 Holds the primary SUI/USDC balance for testnet operations

**Set as active address:**
```bash
sui client switch --address heuristic-pearl
```

---

## 🚀 How It Works

### Automatic Funding Flow

```
┌─────────────────────────────────────────────────┐
│ ./scripts/pay402-tmux.sh --testnet             │
└─────────────────────────────────────────────────┘
                    │
                    ▼
          ┌─────────────────────┐
          │ Check Facilitator   │
          │ Balance on Testnet  │
          └─────────────────────┘
                    │
          ┌─────────┴──────────┐
          │                    │
    Balance < 0.1 SUI?    Balance >= 0.1 SUI?
          │                    │
          ▼                    ▼
┌──────────────────┐   ┌──────────────┐
│ Check Treasury   │   │ ✅ Sufficient│
│ Balance          │   │    Continue  │
└──────────────────┘   └──────────────┘
          │
  ┌───────┴────────┐
  │                │
Treasury >= 0.5?  Treasury < 0.5?
  │                │
  ▼                ▼
┌────────────┐  ┌──────────────────┐
│ Transfer   │  │ ❌ Error:        │
│ 0.5 SUI    │  │ Fund Treasury    │
│ → Facilit. │  │ manually         │
└────────────┘  └──────────────────┘
  │
  ▼
✅ Success
Facilitator funded
```

---

## 📋 Setup: Fund the Treasury (One-Time)

### Step 1: Open Sui Testnet Faucet

Visit the faucet with the Treasury address pre-filled:

```bash
https://faucet.sui.io/?address=0x44118d0b343e8cb4203bdd4d75321a2eec4a9ec3c4778dcdda715fee18945995
```

**Or manually:**

1. Go to https://faucet.sui.io
2. Paste address: `0x44118d0b343e8cb4203bdd4d75321a2eec4a9ec3c4778dcdda715fee18945995`
3. Complete CAPTCHA
4. Click "Request SUI"

### Step 2: Verify Treasury Balance

```bash
cd /home/hamiha70/Projects/ETHGlobal/HackMoney_Jan26/Pay402
sui client gas 0x44118d0b343e8cb4203bdd4d75321a2eec4a9ec3c4778dcdda715fee18945995 --json | jq -r '[.[].balance] | add // 0' | awk '{printf "%.2f SUI\n", $1/1000000000}'
```

**Expected:** `>= 0.5 SUI` (typically ~1 SUI from faucet)

### Step 3: Run Script with Testnet Flag

```bash
./scripts/pay402-tmux.sh --testnet
```

**Expected output:**

```
💰 Checking facilitator balance on testnet...
  Address: 0x2616cf141ab19b9dd657ac652fbcda65a7cbd437c1eb7cb7f28d5c4f5859e618
  Balance: 0 SUI
  ⚠️  Low balance (< 0.1 SUI) - requesting funds...

  🏦 Attempting automatic funding from Treasury...
  📋 Treasury address: 0x44118d0b343e8cb4203bdd4d75321a2eec4a9ec3c4778dcdda715fee18945995
  💰 Treasury balance: 1 SUI
  ✅ Treasury has sufficient funds
  💸 Transferring 0.5 SUI from Treasury to Facilitator...

  ✅ Transfer successful!
  💰 New facilitator balance: 0 SUI
```

---

## ⚙️ Configuration

### Thresholds

| Parameter                 | Value   | Reason                                 |
| ------------------------- | ------- | -------------------------------------- |
| **Facilitator Threshold** | 0.1 SUI | Triggers auto-funding                  |
| **Treasury Minimum**      | 0.5 SUI | Enough for 1 transfer + gas            |
| **Transfer Amount**       | 0.5 SUI | Provides buffer for multiple test runs |

### Addresses

| Role                  | Address         | Private Key Location                                            | Active?        |
| --------------------- | --------------- | --------------------------------------------------------------- | -------------- |
| **Treasury/Deployer** | `0x4411...5995` | Imported in `sui client` (alias: `heuristic-pearl`)             | ✅ **Yes** (default) |
| **Facilitator**       | `0x2616...e618` | `facilitator/.env.testnet.example` → `FACILITATOR_PRIVATE_KEY`  | No             |

**Recommended setup:** Keep `heuristic-pearl` (Treasury/Deployer) as your active address for daily operations.

---

## 🔍 Monitoring

### Check Facilitator Balance

```bash
sui client gas 0x2616cf141ab19b9dd657ac652fbcda65a7cbd437c1eb7cb7f28d5c4f5859e618 --json | jq -r '[.[].balance] | add // 0' | awk '{printf "%.2f SUI\n", $1/1000000000}'
```

### Check Treasury Balance

```bash
sui client gas 0x44118d0b343e8cb4203bdd4d75321a2eec4a9ec3c4778dcdda715fee18945995 --json | jq -r '[.[].balance] | add // 0' | awk '{printf "%.2f SUI\n", $1/1000000000}'
```

### Switch to Treasury Manually (for debugging)

```bash
sui client switch --address heuristic-pearl
sui client gas
```

---

## 🐛 Troubleshooting

### Issue: "Treasury has insufficient funds!"

**Output:**

```
❌ Treasury has insufficient funds!
📋 Please fund Treasury address manually:
   Address: 0x44118d0b343e8cb4203bdd4d75321a2eec4a9ec3c4778dcdda715fee18945995
   Minimum: 0.5 SUI
   Faucet: https://faucet.sui.io/?address=0x4411...5995

💡 You can continue anyway, but tests may fail due to insufficient gas
```

**Solution:**

1. Visit faucet link provided
2. Request SUI from testnet faucet
3. Wait 10-30 seconds
4. Re-run script: `./scripts/pay402-tmux.sh --testnet`

---

### Issue: "Treasury address not found in sui client"

**Output:**

```
❌ Treasury address not found in sui client
💡 Please import Treasury private key using: sui client new-address
```

**Cause:** Treasury private key not imported in local `sui client`.

**Solution:**
The Treasury address should already be in your `sui client` (check with `sui client addresses`). If missing, you need to import it.

**Check if present:**

```bash
sui client addresses | grep "heuristic-pearl"
```

If not present, contact the team lead for the Treasury private key.

---

### Issue: "Transfer failed"

**Output:**

```
❌ Transfer failed
💡 You may need to fund facilitator manually:
   https://faucet.sui.io/?address=0x2616...e618
```

**Possible causes:**

1. **Insufficient gas in Treasury for transaction**

   - Solution: Fund Treasury with more SUI (aim for >1 SUI)

2. **Network issues**

   - Solution: Retry after a few seconds

3. **Gas coin not available**
   - Solution: Ensure Treasury has at least one gas object:
     ```bash
     sui client gas 0x44118d0b343e8cb4203bdd4d75321a2eec4a9ec3c4778dcdda715fee18945995
     ```

---

## 💡 Best Practices

### For Development

1. **Fund Treasury once** at the start of the day/week

   - Aim for **2-5 SUI** to cover multiple test runs
   - Faucet typically provides **1 SUI per request**

2. **Monitor Treasury balance** periodically

   ```bash
   sui client gas heuristic-pearl
   ```

3. **Let the script auto-fund** - don't manually fund facilitator
   - This ensures the automated flow is tested

### For CI/CD

If running in CI, you would:

1. Pre-fund Treasury address in CI setup
2. Run `./scripts/pay402-tmux.sh --testnet` in tests
3. Script auto-funds as needed

---

## 📊 Treasury Transaction History

To view Treasury transactions:

```bash
sui client switch --address heuristic-pearl
sui client tx-history --json | jq '.data[] | {digest, timestamp}'
```

Or via explorer:

```
https://testnet.suivision.xyz/account/0x44118d0b343e8cb4203bdd4d75321a2eec4a9ec3c4778dcdda715fee18945995
```

---

## 🔐 Security Notes

### Treasury Private Key Management

- ✅ **Testnet only** - This is NOT for mainnet
- ✅ **Shared dev key** - Safe to share within the team
- ✅ **Low value** - Only holds small amounts of testnet SUI
- ❌ **Never use for mainnet** - This address should only be on testnet

### Address Verification

Always verify you're on testnet before operations:

```bash
sui client chain-identifier
# Should output: 4c78adac (testnet)
# NOT: 35834a8a (mainnet)
```

---

## 📈 Cost Analysis

### Testnet SUI Costs

| Operation              | Cost           | Frequency      |
| ---------------------- | -------------- | -------------- |
| Transfer 0.5 SUI       | ~0.001 SUI gas | Per auto-fund  |
| Test run (facilitator) | ~0.05 SUI      | Per test suite |
| Daily usage (estimate) | ~0.5 SUI       | 10 test runs   |

### Refill Frequency

With **2 SUI in Treasury:**

- Supports ~4 auto-funding cycles (0.5 SUI each)
- Or ~40 test runs before needing refill
- **Estimate:** Refill every **2-3 days** of heavy testing

---

## 🎯 Quick Reference

### Commands

```bash
# Set Treasury as active address (recommended)
sui client switch --address heuristic-pearl

# Fund Treasury (one-time)
open "https://faucet.sui.io/?address=0x44118d0b343e8cb4203bdd4d75321a2eec4a9ec3c4778dcdda715fee18945995"

# Check Treasury balance (if active address)
sui client gas

# Or check by address
sui client gas heuristic-pearl

# Check Facilitator balance
sui client gas 0x2616cf141ab19b9dd657ac652fbcda65a7cbd437c1eb7cb7f28d5c4f5859e618

# Run with auto-funding
./scripts/pay402-tmux.sh --testnet

# Verify network
sui client chain-identifier  # Should be: 4c78adac
```

### Addresses (Quick Copy)

```
Treasury/Deployer (ACTIVE): 0x44118d0b343e8cb4203bdd4d75321a2eec4a9ec3c4778dcdda715fee18945995
Facilitator:                0x2616cf141ab19b9dd657ac652fbcda65a7cbd437c1eb7cb7f28d5c4f5859e618
```

---

## ✅ Summary

1. **One-time setup:** Fund Treasury with 2+ SUI from testnet faucet
2. **Daily usage:** Just run `./scripts/pay402-tmux.sh --testnet`
3. **Monitoring:** Refill Treasury when balance < 0.5 SUI
4. **Benefit:** Zero manual intervention for testnet funding! 🎉
