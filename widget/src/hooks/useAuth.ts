import { useKeypairAuth } from './useKeypairAuth';
import { useEnokiAuth } from './useEnokiAuth';
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

  // Choose auth provider
  const enokiAuth = useEnokiAuth();
  const keypairAuth = useKeypairAuth();

  const activeAuth = ENOKI_AVAILABLE ? enokiAuth : keypairAuth;

  return {
    ...activeAuth,
    authMethod: ENOKI_AVAILABLE ? 'enoki' : 'keypair',
  };
}
