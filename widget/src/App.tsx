import { useState, useEffect } from 'react';
import { SuiClientProvider, WalletProvider } from '@mysten/dapp-kit';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import PaymentPage from './components/PaymentPage';
import '@mysten/dapp-kit/dist/index.css';
import './App.css';
import './components/PaymentPage.css';

// Create query client
const queryClient = new QueryClient();

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
      <SuiClientProvider>
        <WalletProvider autoConnect>
          <PaymentPage invoiceJWT={invoiceJWT} />
        </WalletProvider>
      </SuiClientProvider>
    </QueryClientProvider>
  );
}

export default App;
