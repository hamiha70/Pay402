import { useState, useEffect } from 'react';
import { EnokiFlowProvider } from '@mysten/enoki/react';
import { SuiClientProvider, WalletProvider } from '@mysten/dapp-kit';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import AuthTest from './components/AuthTest';
import '@mysten/dapp-kit/dist/index.css';
import './App.css';

// Create query client
const queryClient = new QueryClient();

const ENOKI_API_KEY = import.meta.env.VITE_ENOKI_API_KEY;
const ENOKI_AVAILABLE = ENOKI_API_KEY && ENOKI_API_KEY !== 'your_public_api_key_here';

function App() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <div>Loading...</div>;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <SuiClientProvider>
        <WalletProvider autoConnect>
          {ENOKI_AVAILABLE ? (
            // Enoki available - use zkLogin
            <EnokiFlowProvider apiKey={ENOKI_API_KEY}>
              <AppContent mode="enoki" />
            </EnokiFlowProvider>
          ) : (
            // No Enoki - use keypair fallback
            <AppContent mode="keypair" />
          )}
        </WalletProvider>
      </SuiClientProvider>
    </QueryClientProvider>
  );
}

function AppContent({ mode }: { mode: 'enoki' | 'keypair' }) {
  return (
    <div className="app-container">
      <h1>🧪 Pay402 - Auth Test</h1>
      <p style={{ color: '#666', marginBottom: '1rem' }}>
        Testing unified auth system with automatic fallback
      </p>
      
      {mode === 'keypair' && (
        <div style={{ 
          background: 'rgba(251, 191, 36, 0.1)', 
          border: '2px solid rgba(251, 191, 36, 0.3)',
          borderRadius: '8px',
          padding: '1rem',
          marginBottom: '2rem',
        }}>
          <strong>⚠️ Running in Keypair Mode (Development)</strong>
          <p style={{ fontSize: '0.875rem', margin: '0.5rem 0 0 0', color: '#888' }}>
            Enoki API key not found. Using local keypair for testing.
          </p>
          <details style={{ marginTop: '0.5rem', fontSize: '0.875rem' }}>
            <summary style={{ cursor: 'pointer', color: '#60a5fa' }}>
              How to enable Enoki (zkLogin)
            </summary>
            <ol style={{ marginTop: '0.5rem', paddingLeft: '1.5rem' }}>
              <li>Visit <a href="https://portal.enoki.mystenlabs.com" target="_blank" rel="noopener">Enoki Portal</a></li>
              <li>Create PUBLIC API key with zkLogin + testnet enabled</li>
              <li>Add to <code>.env.local</code>: <code>VITE_ENOKI_API_KEY=enoki_public_...</code></li>
              <li>Restart dev server</li>
            </ol>
          </details>
        </div>
      )}

      {mode === 'enoki' && (
        <div style={{ 
          background: 'rgba(74, 222, 128, 0.1)', 
          border: '2px solid rgba(74, 222, 128, 0.3)',
          borderRadius: '8px',
          padding: '1rem',
          marginBottom: '2rem',
        }}>
          <strong>✅ Running in Enoki Mode (Production-Ready)</strong>
          <p style={{ fontSize: '0.875rem', margin: '0.5rem 0 0 0', color: '#888' }}>
            zkLogin enabled with Google OAuth authentication.
          </p>
        </div>
      )}

      <AuthTest />
    </div>
  );
}

export default App;
