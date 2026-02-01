import { useCallback } from 'react';
import { useEnokiFlow, useZkLogin } from '@mysten/enoki/react';
import { Transaction } from '@mysten/sui/transactions';
import type { AuthProvider } from '../types/auth';

/**
 * Enoki-based auth (zkLogin) - STUB for now
 * 
 * Features:
 * - Sign in with Google (or other OAuth providers)
 * - Deterministic address derivation
 * - Same interface as keypair auth for easy swapping
 * 
 * NOTE: This is a stub implementation. Will be completed when Enoki API key is available.
 */
export function useEnokiAuth(): AuthProvider {
  const enokiFlow = useEnokiFlow();
  const zkLogin = useZkLogin();

  const isConnected = zkLogin?.address != null;
  const address = zkLogin?.address || null;

  const signIn = useCallback(async () => {
    if (!enokiFlow) {
      throw new Error('Enoki not initialized');
    }

    try {
      // TODO: Complete this when Enoki API is available
      // const authUrl = await enokiFlow.createAuthorizationURL({...});
      // window.location.href = authUrl;
      throw new Error('Enoki sign-in not yet implemented - add API key to .env.local');
    } catch (error) {
      console.error('Enoki sign in failed:', error);
      throw error;
    }
  }, [enokiFlow]);

  const signOut = useCallback(async () => {
    console.log('👋 Signed out (Enoki session cleared)');
    window.location.reload();
  }, []);

  const signTransaction = useCallback(async (_tx: Transaction) => {
    if (!zkLogin) {
      throw new Error('Not connected');
    }

    // TODO: Implement Enoki transaction signing
    throw new Error('Enoki transaction signing not yet implemented');
  }, [zkLogin]);

  return {
    isConnected,
    address,
    method: 'enoki',
    signIn,
    signOut,
    signTransaction,
  };
}
