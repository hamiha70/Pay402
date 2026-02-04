import { Transaction } from '@mysten/sui/transactions';

/**
 * Calculate Sui transaction digest from transaction bytes
 * 
 * Uses the official Sui SDK to ensure 100% compatibility with on-chain digests.
 * The digest can be calculated off-chain deterministically,
 * making it available immediately in optimistic settlement mode.
 * 
 * @param transactionBytes - The BCS-serialized transaction bytes
 * @returns Base58-encoded transaction digest (matches on-chain digest)
 * 
 * @example
 * ```typescript
 * const txBytes = await tx.build({ client });
 * const digest = getTransactionDigest(txBytes);
 * // Now use: sui client tx-block <digest>
 * ```
 */
export function getTransactionDigest(transactionBytes: Uint8Array): string {
  // Use Sui SDK's official Transaction.getDigest() method
  // This ensures 100% compatibility with on-chain digest calculation
  const tx = Transaction.from(transactionBytes);
  return tx.getDigest();
}
