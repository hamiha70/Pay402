import { useCallback } from 'react';
import { 
  useCurrentAccount, 
  useConnectWallet, 
  useDisconnectWallet,
  useSignTransaction,
  useWallets 
} from '@mysten/dapp-kit';
import { isEnokiWallet } from '@mysten/enoki';
import { Transaction } from '@mysten/sui/transactions';
import type { AuthProvider } from '../types/auth';

/**
 * Enoki Auth via dapp-kit
 * 
 * Bridges @mysten/dapp-kit (zkLogin via registerEnokiWallets) 
 * with the unified AuthProvider interface.
 * 
 * This is the PRODUCTION approach - uses official dapp-kit integration.
 */
export function useEnokiAuthDappKit(): AuthProvider {
  const currentAccount = useCurrentAccount();
  const { mutate: connect } = useConnectWallet();
  const { mutate: disconnect } = useDisconnectWallet();
  const { mutateAsync: signTransaction } = useSignTransaction();
  const wallets = useWallets();

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
    console.log('[EnokiAuth] Sign in requested');
    
    if (!googleWallet) {
      console.error('[EnokiAuth] No Google wallet found! Make sure RegisterEnokiWallets is mounted.');
      throw new Error('Google wallet not available. Please refresh the page.');
    }

    console.log('[EnokiAuth] Connecting to Google wallet...');
    connect(
      { wallet: googleWallet },
      {
        onSuccess: () => {
          console.log('[EnokiAuth] ✅ Connected successfully');
        },
        onError: (error) => {
          console.error('[EnokiAuth] ❌ Connection failed:', error);
          throw error;
        }
      }
    );
  }, [googleWallet, connect]);

  const signOut = useCallback(async () => {
    console.log('[EnokiAuth] Sign out requested');
    disconnect();
  }, [disconnect]);

  const signTransactionWrapper = useCallback(async (tx: Transaction) => {
    console.log('[EnokiAuth] Signing transaction with zkLogin');
    
    if (!currentAccount) {
      throw new Error('Not connected');
    }

    try {
      const result = await signTransaction({
        transaction: tx,
        account: currentAccount,
      });

      console.log('[EnokiAuth] ✅ Transaction signed:', {
        signature: result.signature.substring(0, 20) + '...',
        bytes: result.bytes.substring(0, 20) + '...',
      });

      return {
        signature: result.signature,
        transactionBytes: result.bytes,
      };
    } catch (error) {
      console.error('[EnokiAuth] ❌ Transaction signing failed:', error);
      throw error;
    }
  }, [currentAccount, signTransaction]);

  const signTransactionBytes = useCallback(async (txBytes: Uint8Array) => {
    console.log('[EnokiAuth] Signing transaction bytes with zkLogin');
    
    if (!currentAccount) {
      throw new Error('Not connected');
    }

    try {
      // Build Transaction from bytes
      const tx = Transaction.from(txBytes);
      
      const result = await signTransaction({
        transaction: tx,
        account: currentAccount,
      });

      console.log('[EnokiAuth] ✅ Transaction bytes signed');

      return {
        signature: result.signature,
        bytes: new Uint8Array(Buffer.from(result.bytes, 'base64')),
      };
    } catch (error) {
      console.error('[EnokiAuth] ❌ Transaction bytes signing failed:', error);
      throw error;
    }
  }, [currentAccount, signTransaction]);

  return {
    isConnected,
    address,
    method: 'enoki',
    signIn,
    signOut,
    signTransaction: signTransactionWrapper,
    signTransactionBytes,
  };
}
