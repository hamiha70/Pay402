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
    console.log('[EnokiAuth] 🔐 Starting zkLogin transaction signing...');
    console.log('[EnokiAuth] Transaction bytes length:', txBytes.length);
    
    if (!currentAccount) {
      console.error('[EnokiAuth] ❌ No current account!');
      throw new Error('Not connected');
    }

    console.log('[EnokiAuth] Current account:', {
      address: currentAccount.address,
      publicKey: typeof currentAccount.publicKey,
      chains: currentAccount.chains,
    });

    try {
      // Step 1: Build Transaction from bytes
      console.log('[EnokiAuth] Step 1: Building Transaction object from bytes...');
      const tx = Transaction.from(txBytes);
      console.log('[EnokiAuth] ✅ Transaction object created');
      
      // Step 2: Call signTransaction hook (with CHAIN!)
      console.log('[EnokiAuth] Step 2: Calling signTransaction hook...');
      console.log('[EnokiAuth] Using account:', currentAccount.address);
      
      const network = import.meta.env.VITE_SUI_NETWORK || 'testnet';
      const chainId = `sui:${network}`;
      console.log('[EnokiAuth] Chain ID:', chainId);
      
      const result = await signTransaction({
        transaction: tx,
        account: currentAccount,
        chain: chainId,  // CRITICAL: zkLogin needs to know which chain!
      });

      console.log('[EnokiAuth] ✅ signTransaction hook returned successfully');
      console.log('[EnokiAuth] Result signature length:', result.signature?.length || 0);
      console.log('[EnokiAuth] Result bytes (base64):', result.bytes?.substring(0, 50) + '...');

      // Step 3: Convert base64 string to Uint8Array (browser-safe, no Buffer needed)
      console.log('[EnokiAuth] Step 3: Converting base64 to Uint8Array...');
      const base64 = result.bytes;
      
      if (!base64) {
        throw new Error('signTransaction returned empty bytes');
      }
      
      const binaryString = atob(base64);
      console.log('[EnokiAuth] Binary string length:', binaryString.length);
      
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      console.log('[EnokiAuth] ✅ Uint8Array created, length:', bytes.length);

      console.log('[EnokiAuth] 🎉 Transaction signing complete!');
      return {
        signature: result.signature,
        bytes,
      };
    } catch (error) {
      console.error('[EnokiAuth] ❌❌❌ Transaction bytes signing FAILED ❌❌❌');
      console.error('[EnokiAuth] Error type:', error?.constructor?.name);
      console.error('[EnokiAuth] Error message:', error instanceof Error ? error.message : String(error));
      console.error('[EnokiAuth] Error stack:', error instanceof Error ? error.stack : 'No stack');
      console.error('[EnokiAuth] Full error object:', JSON.stringify(error, Object.getOwnPropertyNames(error), 2));
      
      // Check if it's a network error
      if (error instanceof TypeError && error.message.includes('fetch')) {
        console.error('[EnokiAuth] 🌐 This is a NETWORK/FETCH error!');
        console.error('[EnokiAuth] Possible causes:');
        console.error('[EnokiAuth] 1. Enoki API endpoint unreachable');
        console.error('[EnokiAuth] 2. CORS issue');
        console.error('[EnokiAuth] 3. Invalid API key');
        console.error('[EnokiAuth] 4. Network timeout');
      }
      
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
