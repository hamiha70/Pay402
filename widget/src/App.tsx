import { useState, useEffect } from 'react';
import { EnokiFlowProvider } from '@mysten/enoki/react';
import { createNetworkConfig, SuiClientProvider, WalletProvider } from '@mysten/dapp-kit';
import { getFullnodeUrl } from '@mysten/sui/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import ZkLoginTest from './components/ZkLoginTest';
import '@mysten/dapp-kit/dist/index.css';
import './App.css';

// Create query client
const queryClient = new QueryClient();

// Network configuration
const { networkConfig } = createNetworkConfig({
  localnet: { url: getFullnodeUrl('localnet') },
  testnet: { url: getFullnodeUrl('testnet') },
});

const ENOKI_API_KEY = import.meta.env.VITE_ENOKI_API_KEY;

function App() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <div>Loading...</div>;
  }

  if (!ENOKI_API_KEY || ENOKI_API_KEY === 'your_public_api_key_here') {
    return (
      <div style={{ padding: '2rem', maxWidth: '600px', margin: '0 auto' }}>
        <h1>⚠️ Enoki API Key Required</h1>
        <p>Please configure your Enoki API key:</p>
        <ol>
          <li>Visit <a href="https://portal.enoki.mystenlabs.com" target="_blank">Enoki Portal</a></li>
          <li>Create a new app (or select existing)</li>
          <li>Create a PUBLIC API key with zkLogin enabled</li>
          <li>Configure Google OAuth provider</li>
          <li>Copy the key to <code>widget/.env.local</code></li>
        </ol>
        <pre style={{ background: '#f5f5f5', padding: '1rem', borderRadius: '4px' }}>
{`# widget/.env.local
VITE_ENOKI_API_KEY=enoki_public_...`}
        </pre>
      </div>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <SuiClientProvider networks={networkConfig} defaultNetwork="localnet">
        <WalletProvider autoConnect>
          <EnokiFlowProvider apiKey={ENOKI_API_KEY}>
            <div className="app-container">
              <h1>🧪 Pay402 - zkLogin Test</h1>
              <p style={{ color: '#666', marginBottom: '2rem' }}>
                Testing Enoki zkLogin integration and funding flow
              </p>
              <ZkLoginTest />
            </div>
          </EnokiFlowProvider>
        </WalletProvider>
      </SuiClientProvider>
    </QueryClientProvider>
  );
}

export default App;
