# Explorer Links Enhancement

## Overview

Added clickable explorer links throughout the payment widget to enhance transparency and trust. Users can now verify addresses and invoice hashes directly on the blockchain.

## What Was Added

### 1. Buyer Address (Balance Section)
**Location:** Review Payment page, "Your Balance" section

**What it does:**
- Shows a "🔍 View" link next to the user's zkLogin address
- Links to: `https://suiscan.xyz/testnet/account/{address}`
- User can verify their blockchain account and transaction history

**Why it matters:**
- Builds trust: "This is MY real blockchain account!"
- Shows transaction history
- Proves the zkLogin address is real and on-chain

---

### 2. Merchant Address (Invoice Details)
**Location:** Review Payment page, "Invoice Details" section

**What it does:**
- Shows a "🔍" icon next to the merchant's address
- Links to: `https://suiscan.xyz/testnet/account/{merchantAddr}`
- User can verify who they're paying

**Why it matters:**
- Transparency: User can see merchant's history
- Trust: Verify merchant is legitimate
- Advanced users can check merchant's transaction patterns

---

### 3. Invoice Hash (Verification Screen)
**Location:** Verification Passed page

**What it does:**
- Enhanced display with info icon (ℹ️)
- Styled code block with background and padding
- Tooltip: "Cryptographic proof of invoice integrity"

**Why it matters:**
- Shows cryptographic proof of invoice
- Advanced users can verify the hash
- Demonstrates transparency
- **Note:** Hash is NOT an on-chain object, so no explorer link (it's computed off-chain)

---

## Technical Details

### Implementation
- Used inline styles for consistency with existing code
- Links open in new tab (`target="_blank"`)
- Security: `rel="noopener noreferrer"`
- Only shown for **testnet** (conditional rendering: `invoice.network?.includes('testnet')`)
- Responsive design: flex layout with proper spacing

### Code Example
```tsx
{invoice.network?.includes('testnet') && (
  <a 
    href={`https://suiscan.xyz/testnet/account/${address}`}
    target="_blank"
    rel="noopener noreferrer"
    style={{
      fontSize: '0.8em',
      color: '#3b82f6',
      textDecoration: 'none',
      whiteSpace: 'nowrap'
    }}
  >
    🔍 View
  </a>
)}
```

---

## What We DIDN'T Add (and Why)

### ❌ Facilitator Address
**Reason:** User doesn't care about facilitator internals. Too much info clutters the UI.

### ❌ Asset Type (CAIP-19)
**Reason:** Technical identifier, not useful for end users. Would be confusing.

### ❌ Invoice Hash Explorer Link
**Reason:** Hash is computed off-chain (SHA-256 of invoice data), not a blockchain object. No explorer to link to.

---

## Demo Flow

### Before Payment:
1. User sees their **buyer address** with "🔍 View" link
2. User sees **merchant address** with "🔍" icon
3. Both link to SuiScan account pages

### After Payment:
1. User sees **Invoice Hash** with enhanced styling
2. Info icon explains it's a "cryptographic proof"
3. Hash is styled in a code block for easy copying

---

## Testing Checklist

✅ Buyer address link works and shows correct account  
✅ Merchant address link works and shows merchant account  
✅ Invoice hash displays with proper styling  
✅ Links open in new tab  
✅ Links only appear on testnet (not localnet)  
✅ Responsive layout (no overflow on mobile)  
✅ Hover states work correctly  

---

## Next Steps

- [ ] Add similar links to merchant's receipt page
- [ ] Consider adding links for mainnet (when deployed)
- [ ] Add analytics to track link clicks (understand user behavior)
- [ ] Consider adding "copy to clipboard" button for addresses

---

## Commit

```bash
git commit -m "Add explorer links for buyer/merchant addresses and invoice hash"
```

**Commit hash:** `b52c8de`  
**Pushed to:** `main` branch
