import { Transaction } from '@mysten/sui/transactions';

/**
 * Calculate Sui transaction digest from transaction bytes
 * 
 * Uses the official Sui SDK to ensure 100% compatibility with on-chain digests.
 * The digest can be calculated off-chain deterministically,
 * making it available immediately in optimistic settlement mode.
 * 
 * @param transactionBytes - The BCS-serialized transaction bytes
 * @returns Promise that resolves to Base58-encoded transaction digest (matches on-chain digest)
 * 
 * @example
 * ```typescript
 * const txBytes = await tx.build({ client });
 * const digest = await getTransactionDigest(txBytes);
 * // Now use: sui client tx-block <digest>
 * ```
 */
export async function getTransactionDigest(transactionBytes: Uint8Array): Promise<string> {
  // Use Sui SDK's official Transaction.getDigest() method
  // This ensures 100% compatibility with on-chain digest calculation
  const tx = Transaction.from(transactionBytes);
  
  // getDigest() returns a Promise<string>, so we must await it
  const digest = await tx.getDigest();
  
  if (typeof digest !== 'string' || !digest) {
    throw new Error(`getDigest() returned invalid digest: ${typeof digest}, value: ${String(digest)}`);
  }
  
  return digest;
}
