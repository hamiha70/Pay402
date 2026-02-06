import { useState } from 'react';
import { ConnectButton, useCurrentAccount, useConnectWallet, useWallets } from '@mysten/dapp-kit';
import { isEnokiWallet } from '@mysten/enoki';

/**
 * zkLogin Test Component
 * 
 * EXACT pattern from official docs:
 * https://docs.enoki.mystenlabs.com/ts-sdk/sign-in#using-custom-login-buttons
 */
export default function ZkLoginTest() {
  console.log('[ZkLoginTest] Component rendering');
  
  const currentAccount = useCurrentAccount();
  const { mutate: connect } = useConnectWallet();
  const wallets = useWallets();
  
  console.log('[ZkLoginTest] State:', {
    currentAccount: currentAccount?.address,
    walletsCount: wallets.length,
  });
  
  const [balanceInfo, setBalanceInfo] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  // Filter for Enoki wallets
  const enokiWallets = wallets.filter(isEnokiWallet);
  const walletsByProvider = enokiWallets.reduce(
    (map, wallet) => map.set((wallet as any).provider, wallet),
    new Map()
  );
  const googleWallet = walletsByProvider.get('google');

  console.log('[ZkLoginTest] Wallets:', {
    total: wallets.length,
    enoki: enokiWallets.length,
    hasGoogle: !!googleWallet,
  });

  const handleCheckBalance = async () => {
    if (!currentAccount?.address) return;

    setLoading(true);
    try {
      const response = await fetch(`http://localhost:3001/balance/${currentAccount.address}`);
      const data = await response.json();
      setBalanceInfo(data);
    } catch (error) {
      console.error('Balance check failed:', error);
      setBalanceInfo({ error: String(error) });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ 
      maxWidth: '800px', 
      margin: '0 auto', 
      padding: '20px',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: 'white',
        padding: '30px',
        borderRadius: '12px',
        marginBottom: '20px',
        textAlign: 'center'
      }}>
        <h1 style={{ margin: '0 0 10px 0' }}>🔐 zkLogin Test</h1>
        <p style={{ margin: 0, opacity: 0.9 }}>
          Official registerEnokiWallets + dapp-kit
        </p>
      </div>

      {/* Connection Status */}
      <div style={{
        background: currentAccount ? '#d1fae5' : '#ffffff',
        border: `2px solid ${currentAccount ? '#10b981' : '#d1d5db'}`,
        borderRadius: '8px',
        padding: '20px',
        marginBottom: '20px'
      }}>
        <h2 style={{ marginTop: 0, color: '#1f2937' }}>
          {currentAccount ? '✅ Connected' : '❌ Not Connected'}
        </h2>

        {currentAccount ? (
          <div>
            <div style={{ marginBottom: '15px' }}>
              <strong style={{ color: '#374151' }}>SUI Address:</strong>
              <div style={{
                background: '#f3f4f6',
                padding: '10px',
                borderRadius: '4px',
                fontFamily: 'monospace',
                fontSize: '0.9em',
                wordBreak: 'break-all',
                marginTop: '5px',
                color: '#1f2937'
              }}>
                {currentAccount.address}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <button
                onClick={handleCheckBalance}
                disabled={loading}
                style={{
                  padding: '10px 20px',
                  background: '#3b82f6',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  fontWeight: 600,
                  opacity: loading ? 0.6 : 1
                }}
              >
                {loading ? '⏳ Checking...' : '💰 Check Balance'}
              </button>
            </div>

            {balanceInfo && (
              <div style={{
                marginTop: '15px',
                padding: '15px',
                background: '#f3f4f6',
                borderRadius: '6px'
              }}>
                <strong style={{ color: '#1f2937' }}>Balance:</strong>
                <pre style={{
                  marginTop: '10px',
                  padding: '10px',
                  background: '#1e293b',
                  color: '#e2e8f0',
                  borderRadius: '4px',
                  fontSize: '0.85em',
                  overflow: 'auto'
                }}>
                  {JSON.stringify(balanceInfo, null, 2)}
                </pre>
              </div>
            )}
          </div>
        ) : (
          <div>
            <p style={{ marginBottom: '15px', color: '#374151' }}>
              Connect your wallet to get started with zkLogin
            </p>

            {/* Official ConnectButton from dapp-kit */}
            <div style={{ marginBottom: '15px' }}>
              <ConnectButton />
            </div>

            {/* Custom Google button (EXACT pattern from docs) */}
            {googleWallet ? (
              <div>
                <p style={{ fontSize: '0.9em', color: '#6b7280', margin: '10px 0' }}>
                  Or use custom button:
                </p>
                <button
                  onClick={() => {
                    connect({ wallet: googleWallet });
                  }}
                  style={{
                    padding: '12px 24px',
                    background: '#10b981',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '16px',
                    fontWeight: 600
                  }}
                >
                  🔐 Sign in with Google
                </button>
              </div>
            ) : (
              <div style={{
                marginTop: '15px',
                padding: '15px',
                background: '#fef3c7',
                border: '1px solid #f59e0b',
                borderRadius: '6px',
                color: '#92400e'
              }}>
                <strong>⚠️ No Enoki wallets registered</strong>
                <p style={{ fontSize: '0.9em', margin: '10px 0 0 0' }}>
                  Check console for errors. Make sure VITE_GOOGLE_CLIENT_ID is set in .env.local
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Configuration Info */}
      <div style={{
        background: '#ffffff',
        border: '1px solid #d1d5db',
        borderRadius: '8px',
        padding: '15px',
        marginBottom: '20px'
      }}>
        <h3 style={{ marginTop: 0, color: '#1f2937' }}>⚙️ Configuration</h3>
        <table style={{ width: '100%', fontSize: '0.9em' }}>
          <tbody>
            <tr>
              <td style={{ padding: '5px 0', fontWeight: 600, color: '#374151' }}>Network:</td>
              <td style={{ padding: '5px 0', fontFamily: 'monospace', color: '#1f2937' }}>
                testnet
              </td>
            </tr>
            <tr>
              <td style={{ padding: '5px 0', fontWeight: 600, color: '#374151' }}>Enoki API Key:</td>
              <td style={{ padding: '5px 0', color: '#1f2937' }}>
                {import.meta.env.VITE_ENOKI_API_KEY ? '✅ Set' : '❌ Not set'}
              </td>
            </tr>
            <tr>
              <td style={{ padding: '5px 0', fontWeight: 600, color: '#374151' }}>Google Client ID:</td>
              <td style={{ padding: '5px 0', color: '#1f2937' }}>
                {import.meta.env.VITE_GOOGLE_CLIENT_ID ? '✅ Set' : '❌ Not set'}
              </td>
            </tr>
            <tr>
              <td style={{ padding: '5px 0', fontWeight: 600, color: '#374151' }}>Enoki Wallets:</td>
              <td style={{ padding: '5px 0', color: '#1f2937' }}>
                {enokiWallets.length > 0 ? `✅ ${enokiWallets.length} registered` : '❌ None registered'}
              </td>
            </tr>
            <tr>
              <td style={{ padding: '5px 0', fontWeight: 600, color: '#374151' }}>All Wallets:</td>
              <td style={{ padding: '5px 0', color: '#1f2937' }}>
                {wallets.length} total
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Debug Info */}
      <details style={{ marginBottom: '20px' }}>
        <summary style={{
          cursor: 'pointer',
          fontWeight: 600,
          padding: '10px',
          background: '#f3f4f6',
          borderRadius: '6px',
          color: '#1f2937'
        }}>
          🐛 Debug Info
        </summary>
        <div style={{
          marginTop: '10px',
          padding: '15px',
          background: '#1e293b',
          color: '#e2e8f0',
          borderRadius: '6px',
          fontFamily: 'monospace',
          fontSize: '0.85em',
          overflow: 'auto'
        }}>
          <div><strong>Current Account:</strong></div>
          <pre>{JSON.stringify(currentAccount, null, 2)}</pre>
          
          <div style={{ marginTop: '15px' }}><strong>All Wallets ({wallets.length}):</strong></div>
          <pre>{JSON.stringify(
            wallets.map(w => ({ 
              name: w.name, 
              version: w.version, 
              isEnoki: isEnokiWallet(w),
              provider: (w as any).provider 
            })),
            null,
            2
          )}</pre>

          <div style={{ marginTop: '15px' }}><strong>Enoki Wallets ({enokiWallets.length}):</strong></div>
          <pre>{JSON.stringify(
            enokiWallets.map(w => ({ 
              name: w.name, 
              provider: (w as any).provider 
            })),
            null,
            2
          )}</pre>
        </div>
      </details>
    </div>
  );
}
