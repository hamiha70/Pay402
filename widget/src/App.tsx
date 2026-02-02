import { useState, useEffect } from 'react';
import { SuiClientProvider, WalletProvider } from '@mysten/dapp-kit';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import PaymentPage from './components/PaymentPage';
import AuthTest from './components/AuthTest';
import '@mysten/dapp-kit/dist/index.css';
import './App.css';
import './components/PaymentPage.css';

// Create query client
const queryClient = new QueryClient();

const ENOKI_API_KEY = import.meta.env.VITE_ENOKI_API_KEY;
const ENOKI_AVAILABLE = ENOKI_API_KEY && ENOKI_API_KEY !== 'your_public_api_key_here';

function App() {
  const [mounted, setMounted] = useState(false);
  const [mode, setMode] = useState<'payment' | 'test'>('payment');

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
          <AppContent 
            mode={ENOKI_AVAILABLE ? 'enoki' : 'keypair'} 
            viewMode={mode}
            onModeChange={setMode}
            invoiceJWT={invoiceJWT}
          />
        </WalletProvider>
      </SuiClientProvider>
    </QueryClientProvider>
  );
}

interface AppContentProps {
  mode: 'enoki' | 'keypair';
  viewMode: 'payment' | 'test';
  onModeChange: (mode: 'payment' | 'test') => void;
  invoiceJWT: string;
}

function AppContent({ mode, viewMode, onModeChange, invoiceJWT }: AppContentProps) {
  return (
    <div className="app-container">
      {/* Mode Toggle */}
      <div style={{ position: 'fixed', top: 10, right: 10, zIndex: 1000 }}>
        <button
          onClick={() => onModeChange(viewMode === 'payment' ? 'test' : 'payment')}
          style={{
            padding: '8px 16px',
            background: '#667eea',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '14px',
          }}
        >
          {viewMode === 'payment' ? '🧪 Test Mode' : '💳 Payment Mode'}
        </button>
      </div>

      {/* Auth Status Banner (only in test mode) */}
      {viewMode === 'test' && (
        <>
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
        </>
      )}

      {/* Main Content */}
      {viewMode === 'payment' ? (
        <PaymentPage invoiceJWT={invoiceJWT} />
      ) : (
        <>
          <h1>🧪 Pay402 - Auth Test</h1>
          <p style={{ color: '#666', marginBottom: '1rem' }}>
            Testing unified auth system with automatic fallback
          </p>
          <AuthTest />
        </>
      )}
    </div>
  );
}

export default App;
