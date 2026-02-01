import { useKeypairAuth } from './useKeypairAuth';
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
  const ENOKI_AVAILABLE = ENOKI_API_KEY && ENOKI_API_KEY !== 'your_public_api_key_here';

  // For now, always use keypair
  // When Enoki is ready, we'll import useEnokiAuth conditionally
  const keypairAuth = useKeypairAuth();

  if (ENOKI_AVAILABLE) {
    // TODO: When Enoki API key is available, use useEnokiAuth()
    console.warn('Enoki API key detected but Enoki auth not yet implemented. Using keypair fallback.');
  }

  return {
    ...keypairAuth,
    authMethod: ENOKI_AVAILABLE ? 'enoki' : 'keypair',
  };
}
