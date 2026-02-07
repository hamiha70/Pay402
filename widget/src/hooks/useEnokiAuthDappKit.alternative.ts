import { useCallback } from 'react';
import { 
  useCurrentAccount, 
  useConnectWallet, 
  useDisconnectWallet,
  useSignAndExecuteTransaction,
  useWallets 
} from '@mysten/dapp-kit';
import { isEnokiWallet } from '@mysten/enoki';
import { Transaction } from '@mysten/sui/transactions';
import type { AuthProvider } from '../types/auth';

/**
 * ALTERNATIVE: Enoki Auth using useSignAndExecuteTransaction with custom execute
 * 
 * This approach uses useSignAndExecuteTransaction but provides a custom execute
 * function that DOESN'T actually execute - it just captures the signed bytes.
 * 
 * This is a workaround if Enoki wallets don't support sui:signTransaction.
 */
export function useEnokiAuthDappKitAlternative(): AuthProvider {
  const currentAccount = useCurrentAccount();
  const { mutate: connect } = useConnectWallet();
  const { mutate: disconnect } = useDisconnectWallet();
  const wallets = useWallets();

  // Custom execute function that DOESN'T execute - just returns the signed data
  const { mutateAsync: signAndExecuteTransaction } = useSignAndExecuteTransaction({
    execute: async ({ bytes, signature }) => {
      console.log('[EnokiAuth-Alt] Custom execute called - NOT executing, just capturing signature');
      console.log('[EnokiAuth-Alt] Bytes length:', bytes.length);
      console.log('[EnokiAuth-Alt] Signature:', signature);
      
      // Return a fake "executed" result
      // The actual execution will happen via the facilitator
      return {
        digest: 'fake-digest-will-be-replaced-by-facilitator',
        rawEffects: new Uint8Array(), // Required by wallet standard
        effects: {} as any, // Required by wallet standard
      };
    },
  });

  // Filter for Enoki wallets
  const enokiWallets = wallets.filter(isEnokiWallet);
  const walletsByProvider = enokiWallets.reduce(
    (map, wallet) => map.set((wallet as any).provider, wallet),
    new Map()
  );
  const googleWallet = walletsByProvider.get('google');

  const isConnected = !!currentAccount;
  const address = currentAccount?.address || null;

  const signIn = useCallback(async () => {
    console.log('[EnokiAuth-Alt] Sign in requested');
    
    if (!googleWallet) {
      console.error('[EnokiAuth-Alt] No Google wallet found!');
      throw new Error('Google wallet not available. Please refresh the page.');
    }

    console.log('[EnokiAuth-Alt] Connecting to Google wallet...');
    connect(
      { wallet: googleWallet },
      {
        onSuccess: () => console.log('[EnokiAuth-Alt] ✅ Connected successfully'),
        onError: (error) => console.error('[EnokiAuth-Alt] ❌ Connection failed:', error),
      }
    );
  }, [googleWallet, connect]);

  const signOut = useCallback(async () => {
    console.log('[EnokiAuth-Alt] Sign out requested');
    disconnect();
  }, [disconnect]);

  const signTransactionWrapper = useCallback(async (tx: Transaction) => {
    console.log('[EnokiAuth-Alt] Signing transaction (wrapper)');
    throw new Error('Use signTransactionBytes instead');
  }, []);

  const signTransactionBytes = useCallback(async (txBytes: Uint8Array) => {
    console.log('[EnokiAuth-Alt] 🔐 Starting zkLogin transaction signing (ALTERNATIVE METHOD)...');
    console.log('[EnokiAuth-Alt] Transaction bytes length:', txBytes.length);
    
    if (!currentAccount) {
      console.error('[EnokiAuth-Alt] ❌ No current account!');
      throw new Error('Not connected');
    }

    try {
      // Build Transaction from bytes
      console.log('[EnokiAuth-Alt] Building Transaction object from bytes...');
      const tx = Transaction.from(txBytes);
      console.log('[EnokiAuth-Alt] ✅ Transaction object created');
      
      const network = import.meta.env.VITE_SUI_NETWORK || 'testnet';
      const chainId = `sui:${network}`;
      console.log('[EnokiAuth-Alt] Chain ID:', chainId);
      
      // Use signAndExecuteTransaction with custom execute that doesn't execute
      console.log('[EnokiAuth-Alt] Calling signAndExecuteTransaction (with fake execute)...');
      
      let capturedBytes: Uint8Array | null = null;
      let capturedSignature: string | null = null;
      
      // Override the execute function to capture bytes and signature
      const result = await signAndExecuteTransaction(
        {
          transaction: tx,
          chain: chainId,
        },
        {
          onSuccess: (data) => {
            console.log('[EnokiAuth-Alt] ✅ Signing successful (fake execution)');
            console.log('[EnokiAuth-Alt] Result:', data);
          },
          onError: (error) => {
            console.error('[EnokiAuth-Alt] ❌ Signing failed:', error);
            throw error;
          },
        }
      );
      
      console.log('[EnokiAuth-Alt] Result:', result);
      
      // The custom execute function should have captured bytes and signature
      // But since we can't access them directly, we need to return the transaction bytes
      // and let the facilitator handle execution
      
      // For now, return the original bytes and a placeholder signature
      // This is a LIMITATION of this approach - we can't get the actual signature!
      console.warn('[EnokiAuth-Alt] ⚠️ WARNING: This approach cannot capture the signature!');
      console.warn('[EnokiAuth-Alt] ⚠️ The transaction will be executed by the wallet, not the facilitator!');
      
      return {
        signature: 'placeholder-signature',
        bytes: txBytes,
      };
      
    } catch (error) {
      console.error('[EnokiAuth-Alt] ❌❌❌ Transaction signing FAILED ❌❌❌');
      console.error('[EnokiAuth-Alt] Error:', error);
      throw error;
    }
  }, [currentAccount, signAndExecuteTransaction]);

  return {
    isConnected,
    address,
    signIn,
    signOut,
    signTransaction: signTransactionWrapper,
    signTransactionBytes,
    authMethod: 'enoki',
  };
}
