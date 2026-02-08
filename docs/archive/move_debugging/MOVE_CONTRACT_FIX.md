# Move Contract Fix: UnusedValueWithoutDrop Issue

## Problem

The e2e tests fail with:

```
Error: UnusedValueWithoutDrop { result_idx: 0, secondary_idx: 0 }
```

**Root Cause:** The `settle_payment` Move function returns `EphemeralReceipt`, but the PTB doesn't consume this return value.

## Solution Applied

Changed `settle_payment` from returning a value to being an `entry` function:

**Before:**

```move
public fun settle_payment<T>(...): EphemeralReceipt {
    // ... logic ...
    EphemeralReceipt { ... }  // ← Returns unused value
}
```

**After:**

```move
public entry fun settle_payment<T>(...) {
    // ... logic ...
    // No return value - event provides audit trail
}
```

**Changes:**

1. Added `entry` keyword
2. Removed return type `: EphemeralReceipt`
3. Removed `EphemeralReceipt` struct (no longer needed)
4. Event (`PaymentSettled`) still provides full audit trail

## Why This Works

- `entry` functions **cannot** return values (Sui enforces this)
- The `PaymentSettled` event provides all the information previously in the receipt
- Zero storage cost (events are indexed off-chain)
- No PTB changes needed - contract fix only

## Deployment

**Manual Deploy (Current Method):**

```bash
cd move/payment
sui client publish --gas-budget 100000000
# Copy the Package ID from output
# Update facilitator/.env: PACKAGE_ID=<new-package-id>
```

**Automated Deploy (TODO - see MOVE_CI_CD.md):**

```bash
npm run deploy:contracts  # Builds, tests, deploys, updates .env
```

## Testing

**Move Tests:**

```bash
cd move/payment
sui move test
```

**TypeScript Tests (after deploy):**

```bash
cd facilitator
npm test  # E2E tests should now pass
```

## Next Steps

1. ✅ Move contract fixed (compile warnings only)
2. ⏳ Deploy to localnet (blocked by sui CLI issue - `localnet not in Move.toml` despite being there)
3. ⏳ Update facilitator `.env` with new Package ID
4. ⏳ Run e2e tests to verify fix
5. ⏳ Add automated deployment CI/CD (see MOVE_CI_CD.md)

## Status

- **Contract Fix:** ✅ Complete
- **Deployment:** ⏳ Blocked by sui CLI environment issue
- **Tests:** ⏳ Waiting for deployment

---

**Note:** The sui CLI is reporting "localnet not in Move.toml" even though it IS present in the file. This needs investigation. Workaround: use `sui client switch --env local` or manually deploy.
