import { useAuth } from '../hooks/useAuth';
import { useBalance } from '../hooks/useBalance';

const NETWORK = import.meta.env.VITE_SUI_NETWORK || 'localnet';

export default function AuthTest() {
  const auth = useAuth();
  const balance = useBalance(auth.address);

  const handleSignIn = async () => {
    try {
      await auth.signIn();
    } catch (error) {
      console.error('Sign in failed:', error);
      alert(`Sign in failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  const handleCheckBalance = async () => {
    try {
      await balance.checkBalance();
    } catch (error) {
      console.error('Balance check failed:', error);
      alert(`Balance check failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  const handleFund = async () => {
    try {
      await balance.fundWallet();
    } catch (error) {
      console.error('Funding failed:', error);
      alert(`Funding failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  return (
    <div>
      {/* Auth Method Badge */}
      <div className="card" style={{ background: 'rgba(96, 165, 250, 0.1)', marginBottom: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontSize: '1.5rem' }}>
            {auth.authMethod === 'enoki' ? '🔐' : '🔑'}
          </span>
          <div>
            <strong>
              {auth.authMethod === 'enoki' ? 'Enoki (zkLogin)' : 'Keypair (Demo)'}
            </strong>
            <p style={{ fontSize: '0.875rem', color: '#888', margin: '0.25rem 0 0 0' }}>
              {auth.authMethod === 'enoki' 
                ? '✅ Production-ready auth with Google OAuth' 
                : '⚠️ Development fallback (not for production)'}
            </p>
          </div>
        </div>
      </div>

      {/* Connection Status */}
      <div className="card">
        <h2>
          Connection Status
          <span className={`status-badge ${auth.isConnected ? 'connected' : 'disconnected'}`}>
            {auth.isConnected ? '✅ Connected' : '❌ Not Connected'}
          </span>
        </h2>

        {!auth.isConnected ? (
          <div>
            <p>
              {auth.authMethod === 'enoki' 
                ? 'Sign in with Google to derive your zkLogin address'
                : 'Generate a demo keypair to get started'}
            </p>
            <button onClick={handleSignIn} disabled={balance.loading}>
              {balance.loading ? 'Connecting...' : (
                auth.authMethod === 'enoki' 
                  ? '🔐 Sign in with Google' 
                  : '🔑 Generate Demo Wallet'
              )}
            </button>
            {auth.authMethod === 'keypair' && (
              <p style={{ fontSize: '0.875rem', color: '#888', marginTop: '1rem' }}>
                💡 To use Enoki (zkLogin), add your API key to <code>.env.local</code>
              </p>
            )}
          </div>
        ) : (
          <div>
            <div className="info-row">
              <span className="info-label">Address:</span>
              <span className="info-value success">{auth.address}</span>
            </div>
            <div className="info-row">
              <span className="info-label">Network:</span>
              <span className="info-value">{NETWORK}</span>
            </div>
            {auth.authMethod === 'enoki' && (
              <p style={{ fontSize: '0.875rem', color: '#888', marginTop: '1rem' }}>
                ✅ Deterministic: same Google account = same address
              </p>
            )}
            {auth.authMethod === 'keypair' && (
              <p style={{ fontSize: '0.875rem', color: '#888', marginTop: '1rem' }}>
                🔑 Stored in localStorage (clear browser data to reset)
              </p>
            )}
            <button 
              onClick={auth.signOut} 
              style={{ marginTop: '1rem', background: '#f87171' }}
            >
              👋 Sign Out
            </button>
          </div>
        )}
      </div>

      {/* Balance Check */}
      {auth.isConnected && (
        <div className="card">
          <h2>💰 Balance Check</h2>
          
          <button onClick={handleCheckBalance} disabled={balance.loading}>
            {balance.balanceInfo?.loading ? 'Checking...' : '🔍 Check Balance'}
          </button>

          {balance.balanceInfo && !balance.balanceInfo.loading && (
            <div style={{ marginTop: '1rem' }}>
              <div className="info-row">
                <span className="info-label">SUI Balance:</span>
                <span className={`info-value ${balance.balanceInfo.sui > 0 ? 'success' : 'error'}`}>
                  {balance.balanceInfo.sui.toFixed(4)} SUI
                </span>
              </div>
              <div className="info-row">
                <span className="info-label">USDC Balance:</span>
                <span className={`info-value ${balance.balanceInfo.usdc > 0 ? 'success' : 'error'}`}>
                  {balance.balanceInfo.usdc.toFixed(2)} USDC
                </span>
              </div>
              {balance.balanceInfo.error && (
                <p className="error" style={{ marginTop: '0.5rem' }}>
                  Error: {balance.balanceInfo.error}
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Funding */}
      {auth.isConnected && balance.balanceInfo && balance.balanceInfo.sui === 0 && (
        <div className="card">
          <h2>💸 Fund Wallet</h2>
          <p>Your wallet needs SUI for gas and testing. Let's fund it!</p>
          
          <button onClick={handleFund} disabled={balance.loading}>
            {balance.loading ? 'Funding...' : '🚀 Fund 10 SUI (Demo Faucet)'}
          </button>

          {balance.fundingResult && (
            <div style={{ marginTop: '1rem' }}>
              {balance.fundingResult.success ? (
                <div className="success">
                  <p>✅ Funding successful!</p>
                  {balance.fundingResult.txDigest && (
                    <p style={{ fontSize: '0.875rem', wordBreak: 'break-all' }}>
                      TX: <code>{balance.fundingResult.txDigest}</code>
                    </p>
                  )}
                </div>
              ) : (
                <p className="error">
                  ❌ Funding failed: {balance.fundingResult.error}
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Success State */}
      {auth.isConnected && balance.balanceInfo && balance.balanceInfo.sui > 0 && (
        <div className="card" style={{ background: 'rgba(74, 222, 128, 0.1)' }}>
          <h2>🎉 Ready for Payments!</h2>
          <p>Your wallet is funded and ready for Pay402 payments.</p>
          <div className="info-row">
            <span className="info-label">Address:</span>
            <span className="info-value">{auth.address}</span>
          </div>
          <div className="info-row">
            <span className="info-label">SUI:</span>
            <span className="info-value success">{balance.balanceInfo.sui.toFixed(4)} SUI</span>
          </div>
          <div className="info-row">
            <span className="info-label">Auth:</span>
            <span className="info-value">{auth.authMethod === 'enoki' ? '🔐 zkLogin' : '🔑 Keypair'}</span>
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
              authMethod: auth.authMethod,
              isConnected: auth.isConnected,
              address: auth.address,
              network: NETWORK,
              facilitatorUrl: import.meta.env.VITE_FACILITATOR_URL,
              enokiApiKey: import.meta.env.VITE_ENOKI_API_KEY ? 'Set' : 'Not set',
            },
            null,
            2
          )}
        </pre>
      </details>
    </div>
  );
}
