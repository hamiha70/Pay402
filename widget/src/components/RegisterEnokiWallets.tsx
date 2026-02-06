import { useEffect } from 'react';
import { useSuiClientContext } from '@mysten/dapp-kit';
import { isEnokiNetwork, registerEnokiWallets } from '@mysten/enoki';

/**
 * Register Enoki Wallets Component
 * 
 * EXACT pattern from official docs:
 * https://docs.enoki.mystenlabs.com/ts-sdk/register#react-integration
 * 
 * This registers zkLogin wallets that work with dapp-kit's ConnectButton.
 */
export default function RegisterEnokiWallets() {
  const { client, network } = useSuiClientContext();

  useEffect(() => {
    console.log('[RegisterEnokiWallets] Effect running:', { network });
    
    if (!isEnokiNetwork(network)) {
      console.log('[RegisterEnokiWallets] Network not supported for Enoki:', network);
      return;
    }

    const apiKey = import.meta.env.VITE_ENOKI_API_KEY || '';
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';

    console.log('[RegisterEnokiWallets] Config:', {
      apiKey: apiKey ? `${apiKey.substring(0, 20)}...` : 'MISSING',
      clientId: clientId ? `${clientId.substring(0, 20)}...` : 'MISSING',
      network,
    });

    if (!apiKey || !clientId) {
      console.warn('[RegisterEnokiWallets] Missing required config - skipping registration');
      return;
    }

    try {
      console.log('[RegisterEnokiWallets] Calling registerEnokiWallets...');
      const { unregister } = registerEnokiWallets({
        apiKey,
        providers: {
          google: {
            clientId,
          },
        },
        client,
        network,
      });

      console.log('[RegisterEnokiWallets] ✅ Registration successful');
      return unregister;
    } catch (error) {
      console.error('[RegisterEnokiWallets] ❌ Registration failed:', error);
    }
  }, [client, network]);

  return null;
}
