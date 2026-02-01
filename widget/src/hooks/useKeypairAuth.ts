import { useState, useCallback } from 'react';
import { Transaction } from '@mysten/sui/transactions';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { toBase64 } from '@mysten/sui/utils';
import type { AuthProvider } from '../types/auth';

const STORAGE_KEY = 'pay402_demo_keypair';

/**
 * Keypair-based auth (fallback when Enoki not available)
 * 
 * Features:
 * - Generates Ed25519 keypair on first "sign in"
 * - Stores in localStorage (demo only - not production secure!)
 * - Same interface as Enoki auth for easy swapping
 */
export function useKeypairAuth(): AuthProvider {
  const [keypair, setKeypair] = useState<Ed25519Keypair | null>(() => {
    // Try to load existing keypair from localStorage
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        return Ed25519Keypair.fromSecretKey(Uint8Array.from(JSON.parse(stored)));
      } catch (e) {
        console.warn('Failed to load stored keypair:', e);
        localStorage.removeItem(STORAGE_KEY);
      }
    }
    return null;
  });

  const address = keypair?.getPublicKey().toSuiAddress() || null;
  const isConnected = !!keypair;

  const signIn = useCallback(async () => {
    // Generate new keypair
    const newKeypair = Ed25519Keypair.generate();
    
    // Store in localStorage (array of bytes)
    const secretKey = Array.from(newKeypair.getSecretKey());
    localStorage.setItem(STORAGE_KEY, JSON.stringify(secretKey));
    
    setKeypair(newKeypair);
    
    console.log('🔑 Generated new keypair:', newKeypair.getPublicKey().toSuiAddress());
  }, []);

  const signOut = useCallback(async () => {
    localStorage.removeItem(STORAGE_KEY);
    setKeypair(null);
    console.log('👋 Signed out (keypair removed)');
  }, []);

  const signTransaction = useCallback(async (tx: Transaction) => {
    if (!keypair) {
      throw new Error('Not connected');
    }

    // Build transaction to get bytes
    const txBytes = await tx.build({ 
      client: null as any, // We'll set this properly in the component
    });

    // Sign with keypair
    const signature = await keypair.signTransaction(txBytes);

    return {
      signature: signature.signature,
      transactionBytes: toBase64(txBytes),
    };
  }, [keypair]);

  return {
    isConnected,
    address,
    method: 'keypair',
    signIn,
    signOut,
    signTransaction,
  };
}
