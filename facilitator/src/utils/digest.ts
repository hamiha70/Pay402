import { toBase58 } from '@mysten/bcs';
import { messageWithIntent } from '@mysten/sui/cryptography';
import { blake2b } from '@noble/hashes/blake2.js';

/**
 * Calculate Sui transaction digest from transaction bytes
 * 
 * This is the CANONICAL way to calculate a Sui transaction digest:
 * 1. Create intent message (3-byte intent + transaction bytes)
 * 2. Hash with Blake2b-256 (32-byte output)
 * 3. Encode as Base58
 * 
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
 * // Can now use: sui client tx-block <digest>
 * ```
 */
export function getTransactionDigest(transactionBytes: Uint8Array): string {
  // Step 1: Create intent message (3-byte intent + transaction bytes)
  // 'TransactionData' scope = 0 for user transaction signatures
  const intentMessage = messageWithIntent('TransactionData', transactionBytes);
  
  // Step 2: Hash with Blake2b-256 (produces 32-byte hash)
  const hash = blake2b(intentMessage, { dkLen: 32 });
  
  // Step 3: Encode as Base58 (Sui's standard digest format)
  return toBase58(hash);
}
