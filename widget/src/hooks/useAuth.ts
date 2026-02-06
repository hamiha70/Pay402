import { useKeypairAuth } from './useKeypairAuth';
import { useEnokiAuthDappKit } from './useEnokiAuthDappKit';
import type { AuthProvider } from '../types/auth';

/**
 * Unified auth hook - automatically chooses between Enoki and keypair
 * 
 * Priority:
 * 1. If VITE_ENOKI_API_KEY is set → use Enoki (zkLogin)
 * 2. Otherwise → use keypair fallback
 * 
 * This allows seamless switching between dev (keypair) and production (Enoki)
 * without changing component code.
 */
export function useAuth(): AuthProvider & { authMethod: 'enoki' | 'keypair' } {
  const ENOKI_API_KEY = import.meta.env.VITE_ENOKI_API_KEY;
  const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
  const ENOKI_AVAILABLE = ENOKI_API_KEY && 
                          ENOKI_API_KEY !== 'your_public_api_key_here' &&
                          GOOGLE_CLIENT_ID &&
                          GOOGLE_CLIENT_ID !== 'your_client_id_here';

  const enokiAuth = useEnokiAuthDappKit();
  const keypairAuth = useKeypairAuth();

  if (ENOKI_AVAILABLE) {
    console.log('[useAuth] ✅ Using Enoki (zkLogin) authentication');
    return {
      ...enokiAuth,
      authMethod: 'enoki',
    };
  }

  console.log('[useAuth] ⚠️ Using keypair fallback (Enoki not configured)');
  return {
    ...keypairAuth,
    authMethod: 'keypair',
  };
}
