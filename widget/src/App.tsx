import { useState, useEffect } from 'react';
import { SuiClientProvider } from '@mysten/dapp-kit';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { getFullnodeUrl } from '@mysten/sui/client';
import PaymentPage from './components/PaymentPage';
import '@mysten/dapp-kit/dist/index.css';
import './App.css';
import './components/PaymentPage.css';

// Create query client
const queryClient = new QueryClient();

// Configure Sui networks
const networks = {
  localnet: { url: getFullnodeUrl('localnet') },
  devnet: { url: getFullnodeUrl('devnet') },
  testnet: { url: getFullnodeUrl('testnet') },
  mainnet: { url: getFullnodeUrl('mainnet') },
};

function App() {
  const [mounted, setMounted] = useState(false);

  // Get invoice JWT from URL
  const urlParams = new URLSearchParams(window.location.search);
  const invoiceJWT = urlParams.get('invoice') || '';

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <div>Loading...</div>;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <SuiClientProvider networks={networks} defaultNetwork="localnet">
        <PaymentPage invoiceJWT={invoiceJWT} />
      </SuiClientProvider>
    </QueryClientProvider>
  );
}

export default App;
