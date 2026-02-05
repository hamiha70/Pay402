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
  const digest = tx.getDigest();
  
  // DEBUG: Check what getDigest() actually returns
  console.log('[DEBUG] getDigest() returned:', typeof digest, digest);
  console.log('[DEBUG] getDigest() string:', String(digest));
  console.log('[DEBUG] getDigest() JSON:', JSON.stringify(digest));
  
  // Try different ways to extract the digest
  if (typeof digest === 'string') {
    return digest;
  }
  
  // If it's an object with a digest property
  if (digest && typeof digest === 'object' && 'digest' in digest) {
    return (digest as any).digest;
  }
  
  // If it has a toString method
  if (digest && typeof digest.toString === 'function') {
    const str = digest.toString();
    if (str !== '[object Object]') {
      return str;
    }
  }
  
  throw new Error(`getDigest() returned unexpected type: ${typeof digest}, value: ${JSON.stringify(digest)}`);
}
