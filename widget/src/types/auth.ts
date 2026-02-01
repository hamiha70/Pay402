import { Transaction } from '@mysten/sui/transactions';

/**
 * Unified auth interface for both Enoki (zkLogin) and keypair fallback
 */
export interface AuthProvider {
  /** Whether user is authenticated */
  isConnected: boolean;
  
  /** User's SUI address (null if not connected) */
  address: string | null;
  
  /** Authentication method being used */
  method: 'enoki' | 'keypair';
  
  /** Sign in / connect wallet */
  signIn: () => Promise<void>;
  
  /** Sign out / disconnect */
  signOut: () => Promise<void>;
  
  /** Sign a transaction */
  signTransaction: (tx: Transaction) => Promise<{
    signature: string;
    transactionBytes: string;
  }>;
}

/**
 * Balance information
 */
export interface BalanceInfo {
  address: string;
  sui: number;        // In SUI (9 decimals)
  usdc: number;       // In USDC (6 decimals)
  loading: boolean;
  error?: string;
}

/**
 * Funding result
 */
export interface FundingResult {
  success: boolean;
  txDigest?: string;
  amount?: number;
  error?: string;
}
