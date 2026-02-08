# Facilitator & Asset Type Explorer Links

## Overview

Added explorer links for **Facilitator** and **Asset Type** to enable complete transparency and verification of all payment parties.

## What Was Added

### 1. Facilitator Address Link (Next to Fee)

**Location:** Review Payment page, next to "Facilitator Fee"

**What it does:**

- Shows a "🔍" icon next to the facilitator fee amount
- Links to: `https://suiscan.xyz/testnet/account/{facilitatorAddress}`
- User can verify the facilitator's transaction history

**Why it matters:**

- **CRITICAL FOR JUDGES:** Proves facilitator fee transparency
- Shows facilitator isn't stealing more than declared fee
- Demonstrates Pay402's provable honesty
- Blockchain transparency in action!

**Example:**

```
Facilitator Fee: 0.01 USDC 🔍
                         ↑
            Links to facilitator account
```

---

### 2. Asset Type Link (Token Contract)

**Location:** Review Payment page, "Invoice Details" section

**What it does:**

- Shows a "🔍" icon next to the asset type (CAIP-19 format)
- Parses CAIP-19 to extract the **package ID**: `sui:testnet/0xPACKAGE_ID::usdc::USDC` → `0xPACKAGE_ID`
- Links to: `https://suiscan.xyz/testnet/object/{packageId}`
- User can verify the package that defines the coin type

**Why it matters:**

- **Proves package authenticity:** Is this the real Circle USDC package?
- On Sui, unlike EVM chains, USDC is not an ERC-20 contract—it's a `Coin<USDC>` object
- We link to the **package** that defines the coin type (the Sui-native approach)
- Judges can verify package ownership and code

**Example:**

```
Asset Type: sui:testnet/0xa1ec...::usdc::USDC 🔍
                          ↑
                Links to USDC package (defines the coin type)
```

---

## Technical Implementation

### Helper Functions Added

```typescript
// Parse CAIP-19 asset type to get package ID
// Format: sui:testnet/0xPACKAGE_ID::module::Type
// Returns: 0xPACKAGE_ID (for explorer package link)
// Note: On Sui, USDC is a Coin<USDC> object, not a contract like ERC-20
// We link to the package that defines the coin type
const parsePackageIdFromAssetType = (assetType: string): string | null => {
  try {
    const parts = assetType.split("/");
    if (parts.length >= 2) {
      const coinType = parts[1]; // 0xPACKAGE_ID::module::Type
      const packageId = coinType.split("::")[0]; // Extract package ID
      return packageId;
    }
    return null;
  } catch {
    return null;
  }
};

// Get facilitator address from environment
const getFacilitatorAddress = (): string => {
  return "0x2616cf141ab19b9dd657ac652fbcda65a7cbd437c1eb7cb7f28d5c4f5859e618";
};
```

### Links Added

1. **Facilitator Fee Row:**

```tsx
<div className="detail-row">
  <span>
    <strong>Facilitator Fee:</strong>
  </span>
  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
    <span style={{ color: "#6b7280" }}>
      {feeAmount.toFixed(2)} {coinName}
    </span>
    {invoice.network?.includes("testnet") && (
      <a
        href={`https://suiscan.xyz/testnet/account/${getFacilitatorAddress()}`}
        target="_blank"
        rel="noopener noreferrer"
        style={{
          fontSize: "0.8em",
          color: "#3b82f6",
          textDecoration: "none",
          whiteSpace: "nowrap",
        }}
        title="View facilitator account on explorer"
      >
        🔍
      </a>
    )}
  </div>
</div>
```

2. **Asset Type Row:**

```tsx
{
  invoice.assetType && (
    <div className="detail-row">
      <span>
        <strong>Asset Type:</strong>
      </span>
      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        <code style={{ fontSize: "0.65em", wordBreak: "break-all", flex: 1 }}>
          {invoice.assetType}
        </code>
        {invoice.network?.includes("testnet") &&
          parsePackageIdFromAssetType(invoice.assetType) && (
            <a
              href={`https://suiscan.xyz/testnet/object/${parsePackageIdFromAssetType(
                invoice.assetType
              )}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                fontSize: "0.8em",
                color: "#3b82f6",
                textDecoration: "none",
                whiteSpace: "nowrap",
              }}
              title="View package on explorer (defines this coin type)"
            >
              🔍
            </a>
          )}
      </div>
    </div>
  );
}
```

---

## Why This Matters for HackMoney Demo

### For Judges:

1. **Facilitator Transparency:** "Is the facilitator stealing fees?"

   - **Answer:** Click the link, see EXACTLY what the facilitator is doing on-chain!

2. **Token Authenticity:** "Is this really Circle USDC?"

   - **Answer:** Click the link, verify the USDC package (the Sui-native way)!

3. **Complete Verification:** "Can I trust ANY of these addresses?"
   - **Answer:** YES! Every address is clickable and verifiable!

### Competitive Advantage:

- **Most payment systems hide these details**
- Pay402 SHOWS them proudly
- Demonstrates deep understanding of blockchain transparency
- Proves "don't trust, verify" principle

---

## Complete Explorer Link Coverage

Now EVERY address in the payment flow is verifiable:

| Entity                      | Link Type    | Purpose                        |
| --------------------------- | ------------ | ------------------------------ |
| ✅ Buyer Address            | Account      | Verify zkLogin address is real |
| ✅ Merchant Address         | Account      | Verify who you're paying       |
| ✅ **Facilitator Address**  | **Account**  | **Verify fee transparency**    |
| ✅ **Asset Type (Package)** | **Package**  | **Verify token package**       |
| ✅ Payment Transaction      | Transaction  | Verify payment succeeded       |
| ✅ Invoice Hash             | Display only | Cryptographic proof            |

---

## Demo Script Addition

**When showing the payment screen to judges:**

> "And here's the transparency layer that makes Pay402 unique. See these magnifying glass icons? Click any of them:
>
> - 🔍 **Buyer address:** That's my zkLogin wallet—click to verify it's real on-chain
> - 🔍 **Merchant address:** That's who I'm paying—verify their history
> - 🔍 **Facilitator:** That's the 0.01 USDC fee collector—click to prove they're not stealing more
> - 🔍 **Asset Type:** That's the Circle USDC contract—verify it's the real token, not a fake
>
> Every single party in this payment is verifiable. No hidden fees, no fake tokens, no trust required. That's blockchain done right."

---

## Testing Checklist

✅ Facilitator fee link appears next to fee amount  
✅ Facilitator link opens correct SuiScan account page  
✅ Asset type link appears next to CAIP-19 string  
✅ Asset type link opens correct token contract page  
✅ Links only appear on testnet (not localnet)  
✅ Links open in new tab  
✅ Responsive layout (no overflow)  
✅ Hover states work correctly

---

## Future Improvements

- [ ] Add facilitator address as separate row (not just in link)
- [ ] Show facilitator name/label (e.g., "Pay402 Official")
- [ ] Add "verified" badge for known-good facilitators
- [ ] Support mainnet explorer links
- [ ] Add copy-to-clipboard for addresses

---

## Summary

**Before:** Facilitator and asset type were displayed but not verifiable  
**After:** Both are clickable, leading to explorer for complete transparency

**Result:** 100% of payment parties are now verifiable on-chain! 🎯
