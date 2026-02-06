import { useState, useEffect } from 'react';
import { createNetworkConfig, SuiClientProvider, WalletProvider } from '@mysten/dapp-kit';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import PaymentPage from './components/PaymentPage';
import ZkLoginTest from './components/ZkLoginTest';
import RegisterEnokiWallets from './components/RegisterEnokiWallets';
import '@mysten/dapp-kit/dist/index.css';
import './App.css';
import './components/PaymentPage.css';

// Create query client
const queryClient = new QueryClient();

// Network configuration (hardcoded URLs since getFullnodeUrl not available)
const { networkConfig } = createNetworkConfig({
  localnet: { url: 'http://127.0.0.1:9000' },
  testnet: { url: 'https://fullnode.testnet.sui.io:443' },
  mainnet: { url: 'https://fullnode.mainnet.sui.io:443' },
});

function App() {
  const [mounted, setMounted] = useState(false);

  // Get invoice JWT from URL
  const urlParams = new URLSearchParams(window.location.search);
  const invoiceJWT = urlParams.get('invoice') || '';
  
  // Check if we're on the zkLogin test page
  const isZkLoginTest = window.location.pathname === '/zklogin-test' || 
                        window.location.pathname === '/auth';

  useEffect(() => {
    console.log('[App] Mounting...');
    setMounted(true);
  }, []);

  if (!mounted) {
    return <div>Loading...</div>;
  }

  console.log('[App] Rendering with:', { isZkLoginTest, invoiceJWT: invoiceJWT.substring(0, 20) });

  return (
    <QueryClientProvider client={queryClient}>
      <SuiClientProvider networks={networkConfig} defaultNetwork="testnet">
        <RegisterEnokiWallets />
        <WalletProvider autoConnect>
          {isZkLoginTest ? (
            <ZkLoginTest />
          ) : (
            <PaymentPage invoiceJWT={invoiceJWT} />
          )}
        </WalletProvider>
      </SuiClientProvider>
    </QueryClientProvider>
  );
}

export default App;
