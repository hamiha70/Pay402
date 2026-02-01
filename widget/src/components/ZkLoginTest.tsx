import { useState } from 'react';
import { useEnokiFlow, useZkLogin } from '@mysten/enoki/react';
import { useSuiClient } from '@mysten/dapp-kit';

const FACILITATOR_URL = import.meta.env.VITE_FACILITATOR_URL || 'http://localhost:3001';
const USDC_COIN_TYPE = '0x2::sui::SUI'; // Using SUI for testing, replace with USDC later

interface BalanceInfo {
  address: string;
  balance: number;
  usdcBalance: number;
  loading: boolean;
  error?: string;
}

interface FundingResult {
  success: boolean;
  txDigest?: string;
  error?: string;
}

export default function ZkLoginTest() {
  const enokiFlow = useEnokiFlow();
  const zkLogin = useZkLogin();
  const suiClient = useSuiClient();

  const [balanceInfo, setBalanceInfo] = useState<BalanceInfo | null>(null);
  const [fundingResult, setFundingResult] = useState<FundingResult | null>(null);
  const [loading, setLoading] = useState(false);

  // Check if connected
  const isConnected = zkLogin?.address != null;
  const userAddress = zkLogin?.address || null;

  // Sign in with Google
  const handleSignIn = async () => {
    setLoading(true);
    try {
      const authUrl = enokiFlow.createAuthorizationURL({
        provider: 'google',
        network: 'testnet', // Use testnet for zkLogin (localnet doesn't support it)
        clientId: window.location.origin,
      });

      // Open OAuth flow in popup
      window.location.href = authUrl;
    } catch (error) {
      console.error('Sign in failed:', error);
      alert(`Sign in failed: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setLoading(false);
    }
  };

  // Check balance
  const handleCheckBalance = async () => {
    if (!userAddress) {
      alert('Please sign in first');
      return;
    }

    setBalanceInfo({ ...balanceInfo as any, loading: true });
    
    try {
      // Get SUI balance directly from RPC
      const suiBalance = await suiClient.getBalance({
        owner: userAddress,
        coinType: '0x2::sui::SUI',
      });

      // Try to get USDC balance (might not exist yet)
      let usdcBalance = 0;
      try {
        const usdc = await suiClient.getBalance({
          owner: userAddress,
          coinType: USDC_COIN_TYPE,
        });
        usdcBalance = parseInt(usdc.totalBalance) / 1_000_000; // Assume 6 decimals
      } catch (e) {
        console.log('No USDC balance yet');
      }

      setBalanceInfo({
        address: userAddress,
        balance: parseInt(suiBalance.totalBalance) / 1_000_000_000, // SUI has 9 decimals
        usdcBalance,
        loading: false,
      });
    } catch (error) {
      console.error('Balance check failed:', error);
      setBalanceInfo({
        address: userAddress,
        balance: 0,
        usdcBalance: 0,
        loading: false,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  };

  // Fund wallet
  const handleFund = async () => {
    if (!userAddress) {
      alert('Please sign in first');
      return;
    }

    setLoading(true);
    setFundingResult(null);

    try {
      const response = await fetch(`${FACILITATOR_URL}/fund`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          address: userAddress,
          sessionId: `test_${Date.now()}`, // Simple session ID for idempotency
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Funding failed');
      }

      const result = await response.json();
      
      setFundingResult({
        success: true,
        txDigest: result.txDigest,
      });

      // Refresh balance
      setTimeout(handleCheckBalance, 2000);
    } catch (error) {
      console.error('Funding failed:', error);
      setFundingResult({
        success: false,
        error: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      {/* Connection Status */}
      <div className="card">
        <h2>
          Connection Status
          <span className={`status-badge ${isConnected ? 'connected' : 'disconnected'}`}>
            {isConnected ? '✅ Connected' : '❌ Not Connected'}
          </span>
        </h2>

        {!isConnected ? (
          <div>
            <p>Sign in with Google to derive your zkLogin address</p>
            <button onClick={handleSignIn} disabled={loading}>
              {loading ? 'Opening OAuth...' : '🔐 Sign in with Google'}
            </button>
            <p style={{ fontSize: '0.875rem', color: '#888', marginTop: '1rem' }}>
              Note: zkLogin uses testnet (localnet doesn't support zkLogin)
            </p>
          </div>
        ) : (
          <div>
            <div className="info-row">
              <span className="info-label">Address:</span>
              <span className="info-value success">{userAddress}</span>
            </div>
            <p style={{ fontSize: '0.875rem', color: '#888', marginTop: '1rem' }}>
              ✅ This address is deterministic - same Google account = same address
            </p>
          </div>
        )}
      </div>

      {/* Balance Check */}
      {isConnected && (
        <div className="card">
          <h2>💰 Balance Check</h2>
          
          <button onClick={handleCheckBalance} disabled={loading}>
            {balanceInfo?.loading ? 'Checking...' : '🔍 Check Balance'}
          </button>

          {balanceInfo && !balanceInfo.loading && (
            <div style={{ marginTop: '1rem' }}>
              <div className="info-row">
                <span className="info-label">SUI Balance:</span>
                <span className={`info-value ${balanceInfo.balance > 0 ? 'success' : 'error'}`}>
                  {balanceInfo.balance.toFixed(4)} SUI
                </span>
              </div>
              <div className="info-row">
                <span className="info-label">USDC Balance:</span>
                <span className={`info-value ${balanceInfo.usdcBalance > 0 ? 'success' : 'error'}`}>
                  {balanceInfo.usdcBalance.toFixed(2)} USDC
                </span>
              </div>
              {balanceInfo.error && (
                <p className="error" style={{ marginTop: '0.5rem' }}>
                  Error: {balanceInfo.error}
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Funding */}
      {isConnected && balanceInfo && balanceInfo.usdcBalance === 0 && (
        <div className="card">
          <h2>💸 Fund Wallet</h2>
          <p>Your wallet needs USDC to make payments. Let's fund it!</p>
          
          <button onClick={handleFund} disabled={loading}>
            {loading ? 'Funding...' : '🚀 Fund 2 USDC (Demo Faucet)'}
          </button>

          {fundingResult && (
            <div style={{ marginTop: '1rem' }}>
              {fundingResult.success ? (
                <div className="success">
                  <p>✅ Funding successful!</p>
                  {fundingResult.txDigest && (
                    <p style={{ fontSize: '0.875rem', wordBreak: 'break-all' }}>
                      TX: <code>{fundingResult.txDigest}</code>
                    </p>
                  )}
                </div>
              ) : (
                <p className="error">
                  ❌ Funding failed: {fundingResult.error}
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Success State */}
      {isConnected && balanceInfo && balanceInfo.usdcBalance > 0 && (
        <div className="card" style={{ background: 'rgba(74, 222, 128, 0.1)' }}>
          <h2>🎉 Ready for Payments!</h2>
          <p>Your wallet is funded and ready to make Pay402 payments.</p>
          <div className="info-row">
            <span className="info-label">Address:</span>
            <span className="info-value">{userAddress}</span>
          </div>
          <div className="info-row">
            <span className="info-label">USDC:</span>
            <span className="info-value success">{balanceInfo.usdcBalance.toFixed(2)} USDC</span>
          </div>
          <p style={{ fontSize: '0.875rem', color: '#888', marginTop: '1rem' }}>
            Next step: Build PTB verifier and integrate payment flow
          </p>
        </div>
      )}

      {/* Debug Info */}
      <details style={{ marginTop: '2rem', textAlign: 'left' }}>
        <summary style={{ cursor: 'pointer', fontWeight: 600 }}>🐛 Debug Info</summary>
        <pre style={{ background: 'rgba(0,0,0,0.2)', padding: '1rem', borderRadius: '8px', fontSize: '0.75rem', overflow: 'auto' }}>
          {JSON.stringify(
            {
              enokiFlow: enokiFlow ? 'initialized' : 'null',
              zkLogin: {
                address: zkLogin?.address || null,
                // Add more zkLogin state if available
              },
              facilitatorUrl: FACILITATOR_URL,
              network: import.meta.env.VITE_SUI_NETWORK,
            },
            null,
            2
          )}
        </pre>
      </details>
    </div>
  );
}
