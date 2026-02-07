import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useBalance } from '../hooks/useBalance';
import { buildPTB, verifyPTB, submitPayment as submitPaymentAPI } from '../lib/pay402-client';
import type { InvoiceJWT } from '../lib/verifier';

/**
 * Payment Page Component
 * 
 * Flow:
 * 1. Parse invoice JWT from URL or props
 * 2. Display invoice details
 * 3. Build PTB via facilitator
 * 4. Verify PTB client-side
 * 5. Sign PTB
 * 6. Submit to facilitator
 * 7. Show receipt
 */

interface PaymentPageProps {
  invoiceJWT?: string;  // From URL param or merchant redirect
}

export default function PaymentPage({ invoiceJWT: propInvoiceJWT }: PaymentPageProps) {
  const { isConnected, address, signIn, signTransaction, signTransactionBytes, authMethod } = useAuth();
  const { balanceInfo, fundWallet, checkBalance } = useBalance(address);

  // Extract balance with defaults
  const balance = balanceInfo || { sui: 0, usdc: 0, loading: true, address: address || '' };

  // Restore invoice from multiple sources (priority order)
  const getInitialInvoice = (): string => {
    if (typeof window === 'undefined') return '';
    
    // 1. Check URL hash (from merchant redirect)
    if (window.location.hash) {
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      const hashInvoice = hashParams.get('invoice');
      if (hashInvoice) {
        console.log('[PaymentPage] Found invoice in URL hash');
        // Save to sessionStorage for OAuth redirect persistence
        sessionStorage.setItem('pendingInvoice', hashInvoice);
        // Clean URL immediately (before OAuth)
        window.history.replaceState(null, '', window.location.pathname);
        return hashInvoice;
      }
    }
    
    // 2. Check sessionStorage (after OAuth redirect)
    const savedInvoice = sessionStorage.getItem('pendingInvoice');
    if (savedInvoice) {
      console.log('[PaymentPage] Found invoice in sessionStorage');
      return savedInvoice;
    }
    
    // 3. Check URL query param (legacy/fallback)
    const urlParams = new URLSearchParams(window.location.search);
    const queryInvoice = urlParams.get('invoice');
    if (queryInvoice) {
      console.log('[PaymentPage] Found invoice in URL query');
      return queryInvoice;
    }
    
    return '';
  };
  
  const initialInvoice = propInvoiceJWT || getInitialInvoice();

  // Payment state
  const [invoiceJWT, setInvoiceJWT] = useState<string>(initialInvoice);
  const [invoice, setInvoice] = useState<InvoiceJWT | null>(null);
  const [step, setStep] = useState<'input' | 'review' | 'verify' | 'sign' | 'submit' | 'success' | 'error'>('input');
  const [ptbBytes, setPtbBytes] = useState<Uint8Array | null>(null);
  const [verificationResult, setVerificationResult] = useState<any>(null);
  const [paymentId, setPaymentId] = useState<string>('');
  const [paymentTime, setPaymentTime] = useState<number | null>(null);  // Track when payment succeeded
  const [invoiceTime] = useState<number>(Date.now());  // Track when invoice was first loaded
  const [error, setError] = useState<string>('');
  const [settlementMode, setSettlementMode] = useState<'optimistic' | 'pessimistic'>('optimistic');
  const [receiptData, setReceiptData] = useState<any>(null);  // Store receipt/event data

  // Helper: Get coin name from coinType
  const getCoinName = (coinType: string): string => {
    if (coinType.includes('::sui::SUI')) return 'SUI';
    if (coinType.includes('::mock_usdc::MOCK_USDC')) return 'USDC'; // MockUSDC on localnet
    if (coinType.includes('::usdc::USDC')) return 'USDC'; // Real USDC on testnet
    return 'tokens'; // Fallback
  };

  // Helper: Parse CAIP-19 asset type to get package ID
  // Format: sui:testnet/0xPACKAGE_ID::module::Type
  // Returns: 0xPACKAGE_ID (for explorer package link)
  // Note: On Sui, USDC is a Coin<USDC> object, not a contract like ERC-20
  // We link to the package that defines the coin type
  const parsePackageIdFromAssetType = (assetType: string): string | null => {
    try {
      // CAIP-19 format: chain_id/package_id::module::type
      const parts = assetType.split('/');
      if (parts.length >= 2) {
        const coinType = parts[1]; // 0xPACKAGE_ID::module::Type
        // Extract just the package ID (before the first ::)
        const packageId = coinType.split('::')[0];
        return packageId; // Return package ID for explorer link
      }
      return null;
    } catch {
      return null;
    }
  };

  // Helper: Get facilitator address from environment
  const getFacilitatorAddress = (): string => {
    // For testnet, we use a known facilitator address
    // In production, this could be fetched from the invoice or API
    return '0x2616cf141ab19b9dd657ac652fbcda65a7cbd437c1eb7cb7f28d5c4f5859e618';
  };

  // Auto-parse invoice from URL or sessionStorage on mount
  useEffect(() => {
    if (invoiceJWT && !invoice) {
      console.log('[PaymentPage] Auto-parsing invoice from URL/storage:', invoiceJWT.substring(0, 50) + '...');
      // Save to sessionStorage for OAuth redirect flow
      sessionStorage.setItem('pendingInvoice', invoiceJWT);
      
      // Parse inline to avoid stale closure issues
      try {
        let jwtToken = invoiceJWT.trim();
        
        // Check if user pasted the entire JSON response from merchant
        if (jwtToken.startsWith('{')) {
          try {
            const json = JSON.parse(jwtToken);
            if (json.invoice) {
              jwtToken = json.invoice;
              setInvoiceJWT(jwtToken);
            }
          } catch {
            // Not valid JSON, treat as raw JWT
          }
        }
        
        // Decode JWT
        const parts = jwtToken.split('.');
        if (parts.length !== 3) {
          throw new Error('Invalid JWT format');
        }

        const payload = JSON.parse(atob(parts[1]));
        
        // Check expiry
        const now = Math.floor(Date.now() / 1000);
        if (payload.exp < now) {
          throw new Error('Invoice expired');
        }

        setInvoice(payload as InvoiceJWT);
        setStep('review');
        setError('');
        console.log('[PaymentPage] ✅ Invoice auto-parsed successfully');
      } catch (err) {
        console.error('[PaymentPage] ❌ Auto-parse failed:', err);
        setError(`Failed to parse invoice: ${err instanceof Error ? err.message : String(err)}`);
        setStep('error');
      }
    }
    // Clear sessionStorage once invoice is parsed
    if (invoice) {
      sessionStorage.removeItem('pendingInvoice');
    }
  }, [invoiceJWT, invoice]);

  // Parse invoice JWT
  const parseInvoice = () => {
    try {
      // Extract JWT if user pasted full JSON response
      let jwtToken = invoiceJWT.trim();
      
      // Check if user pasted the entire JSON response from merchant
      if (jwtToken.startsWith('{')) {
        try {
          const json = JSON.parse(jwtToken);
          // Extract just the JWT token from {"invoice": "eyJ..."}
          if (json.invoice) {
            jwtToken = json.invoice;
            setInvoiceJWT(jwtToken); // Update state with clean JWT
          }
        } catch {
          // Not valid JSON, treat as raw JWT
        }
      }
      
      // Decode JWT (just parse, don't verify signature - merchant signed it)
      const parts = jwtToken.split('.');
      if (parts.length !== 3) {
        throw new Error('Invalid JWT format');
      }

      const payload = JSON.parse(atob(parts[1]));
      
      // Check expiry
      const now = Math.floor(Date.now() / 1000);
      if (payload.exp < now) {
        throw new Error('Invoice expired');
      }

      setInvoice(payload as InvoiceJWT);
      setStep('review');
      setError('');
    } catch (err) {
      setError(`Failed to parse invoice: ${err instanceof Error ? err.message : String(err)}`);
      setStep('error');
    }
  };

  // Request PTB from facilitator
  const requestPTB = async () => {
    if (!invoice || !address) return;

    setStep('verify');
    setError('');

    try {
      // Use shared client library (same code as e2e tests!)
      const config = { facilitatorUrl: 'http://localhost:3001' };
      
      // Build PTB
      const { kindBytes } = await buildPTB(config, invoiceJWT, address);
      setPtbBytes(kindBytes);

      // Verify PTB client-side (CRITICAL security step)
      const result = await verifyPTB(kindBytes, invoice, invoiceJWT);
      setVerificationResult(result);

      if (!result.pass) {
        throw new Error(`PTB verification failed: ${result.reason}`);
      }

      setStep('sign');
    } catch (err) {
      setError(`PTB request failed: ${err instanceof Error ? err.message : String(err)}`);
      setStep('error');
    }
  };

  // Sign and submit payment
  const submitPayment = async (mode: 'optimistic' | 'pessimistic' = 'optimistic') => {
    if (!ptbBytes || !invoice || !address) return;

    setStep('submit');
    setError('');

    const startTime = Date.now();

    try {
      // Gas-sponsored pattern: Sign the FULL transaction bytes directly
      // (Facilitator already built the complete transaction with gas sponsorship)
      if (!signTransactionBytes) {
        throw new Error('Current auth method does not support signing pre-built transactions');
      }
      
      const { signature } = await signTransactionBytes(ptbBytes);
      
      console.log('✍️ Buyer signed transaction');
      console.log('  Sender:', address);
      console.log('  Signature length:', signature.length);

      // Submit payment using shared client library (same code as e2e tests!)
      const config = { facilitatorUrl: 'http://localhost:3001' };
      const data = await submitPaymentAPI(config, {
        invoiceJWT,
        buyerAddress: address,
        transactionKindBytes: ptbBytes,
        buyerSignature: signature,
        settlementMode: mode,
      });
      const clientLatency = Date.now() - startTime;
      
      console.log(`💳 Payment submitted (${mode} mode)`);
      console.log('Client latency:', `${clientLatency}ms`);
      console.log('Server latency:', data.latency);
      console.log('Digest:', data.digest);
      
      if (data.receipt) {
        console.log('Receipt:', data.receipt);
      }

      const completionTime = Date.now();
      setPaymentId(data.digest);
      setPaymentTime(completionTime);  // Capture payment completion time
      setReceiptData(data.receipt);  // Store receipt for display
      setStep('success');
    } catch (err) {
      console.error('💥 Payment submission error:', err);
      console.error('  Error type:', err?.constructor?.name);
      console.error('  Error message:', err instanceof Error ? err.message : String(err));
      console.error('  Full error object:', JSON.stringify(err, Object.getOwnPropertyNames(err), 2));
      setError(`Payment failed: ${err instanceof Error ? err.message : String(err)}`);
      setStep('error');
    }
  };

  // Render different steps
  if (!isConnected) {
    return (
      <div className="payment-page">
        <div className="card">
          <h1>🔐 Pay402 Payment</h1>
          <p>Please sign in to continue</p>
          <button onClick={signIn} className="btn-primary">
            Sign In with {authMethod === 'enoki' ? 'Google (zkLogin)' : 'Demo Keypair'}
          </button>
        </div>
      </div>
    );
  }

  if (step === 'input') {
    return (
      <div className="payment-page">
        <div className="card">
          <h1>📄 Enter Invoice</h1>
          <p>Paste the invoice JWT from the merchant:</p>
          <textarea
            value={invoiceJWT}
            onChange={(e) => setInvoiceJWT(e.target.value)}
            placeholder="eyJhbGciOiJFZERTQSJ9..."
            rows={12}
            className="invoice-input"
          />
          <button
            onClick={parseInvoice}
            disabled={!invoiceJWT}
            className="btn-primary"
          >
            Continue
          </button>
        </div>
      </div>
    );
  }

  if (step === 'review' && invoice) {
    // Handle both X-402 v2 (merchantAmount) and legacy (amount) field names
    const merchantAmountStr = invoice.merchantAmount || invoice.amount || '0';
    const totalAmount = (parseInt(merchantAmountStr) + parseInt(invoice.facilitatorFee)) / 1_000_000;
    const merchantAmount = parseInt(merchantAmountStr) / 1_000_000;
    const feeAmount = parseInt(invoice.facilitatorFee) / 1_000_000;
    
    // Extract coin name from assetType (X-402 v2) or coinType (legacy)
    const coinTypeStr = invoice.assetType || invoice.coinType || '';
    const coinName = getCoinName(coinTypeStr);
    
    // Extract merchant address from payTo (X-402 v2) or merchantRecipient (legacy)
    const merchantAddr = invoice.payTo?.split(':')[2] || invoice.merchantRecipient || '';
    
    // Use USDC balance for USDC payments, SUI balance for SUI payments
    const relevantBalance = coinName === 'SUI' ? balance.sui : balance.usdc;

    return (
      <div className="payment-page">
        <div className="card">
          <h1>💳 Review Payment</h1>
          
          <div className="invoice-details">
            <h3>Invoice Details</h3>
            <div className="detail-row">
              <span><strong>Resource:</strong></span>
              <code>{invoice.resource}</code>
            </div>
            {invoice.description && (
              <div className="detail-row">
                <span><strong>Description:</strong></span>
                <span>{invoice.description}</span>
              </div>
            )}
            {invoice.network && (
              <div className="detail-row">
                <span><strong>Network:</strong></span>
                <code>{invoice.network}</code>
              </div>
            )}
            {merchantAddr && (
              <div className="detail-row">
                <span><strong>Merchant Address:</strong></span>
                <div style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
                  <code style={{fontSize: '0.7em', wordBreak: 'break-all', flex: 1}}>{merchantAddr}</code>
                  {invoice.network?.includes('testnet') && (
                    <a 
                      href={`https://suiscan.xyz/testnet/account/${merchantAddr}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{fontSize: '0.8em', color: '#3b82f6', textDecoration: 'none', whiteSpace: 'nowrap'}}
                      title="View merchant on explorer"
                    >
                      🔍
                    </a>
                  )}
                </div>
              </div>
            )}
            {invoice.assetType && (
              <div className="detail-row">
                <span><strong>Asset Type:</strong></span>
                <div style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
                  <code style={{fontSize: '0.65em', wordBreak: 'break-all', flex: 1}}>{invoice.assetType}</code>
                  {invoice.network?.includes('testnet') && parsePackageIdFromAssetType(invoice.assetType) && (
                    <a 
                      href={`https://suiscan.xyz/testnet/object/${parsePackageIdFromAssetType(invoice.assetType)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{fontSize: '0.8em', color: '#3b82f6', textDecoration: 'none', whiteSpace: 'nowrap'}}
                      title="View package on explorer (defines this coin type)"
                    >
                      🔍
                    </a>
                  )}
                </div>
              </div>
            )}
            {invoice.payTo && (
              <div className="detail-row">
                <span><strong>Pay To (CAIP-10):</strong></span>
                <code style={{fontSize: '0.65em', wordBreak: 'break-all'}}>{invoice.payTo}</code>
              </div>
            )}
            {invoice.paymentId && (
              <div className="detail-row">
                <span><strong>Payment ID:</strong></span>
                <code style={{fontSize: '0.8em'}}>{invoice.paymentId}</code>
              </div>
            )}
            
            <div style={{height: '1px', background: '#d1d5db', margin: '15px 0'}}></div>
            
            <div className="detail-row">
              <span><strong>Merchant Amount:</strong></span>
              <strong style={{color: '#10b981'}}>{merchantAmount.toFixed(2)} {coinName}</strong>
            </div>
            <div className="detail-row">
              <span><strong>Facilitator Fee:</strong></span>
              <div style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
                <span style={{color: '#6b7280'}}>{feeAmount.toFixed(2)} {coinName}</span>
                {invoice.network?.includes('testnet') && (
                  <a 
                    href={`https://suiscan.xyz/testnet/account/${getFacilitatorAddress()}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{fontSize: '0.8em', color: '#3b82f6', textDecoration: 'none', whiteSpace: 'nowrap'}}
                    title="View facilitator account on explorer"
                  >
                    🔍
                  </a>
                )}
              </div>
            </div>
            <div className="detail-row total">
              <span><strong>Total Amount:</strong></span>
              <strong style={{fontSize: '1.2em', color: '#1f2937'}}>{totalAmount.toFixed(2)} {coinName}</strong>
            </div>
            
            <div style={{height: '1px', background: '#d1d5db', margin: '15px 0'}}></div>
            
            <div className="detail-row">
              <span><strong>Expires:</strong></span>
              <span>{new Date(invoice.expiry * 1000).toLocaleString()}</span>
            </div>
            <div className="demo-highlight">
              ✨ You only pay in {coinName} <br/>
              <span style={{fontSize: '0.9em', opacity: 0.8}}>(Facilitator sponsors gas)</span>
            </div>
          </div>

          <div className="balance-info">
            <h3>Your Balance</h3>
            <div className="balance-row">
              <span><strong>USDC:</strong></span>
              <strong>{balance.usdc} USDC</strong>
            </div>
            <div className="balance-row">
              <span><strong>SUI (for gas):</strong></span>
              <strong>{balance.sui} SUI</strong>
            </div>
            <div className="balance-row" style={{flexDirection: 'column', alignItems: 'flex-start', gap: '5px'}}>
              <span><strong>Address:</strong></span>
              <div style={{display: 'flex', alignItems: 'center', gap: '8px', width: '100%'}}>
                <code style={{fontSize: '0.7em', wordBreak: 'break-all', flex: 1}}>{address}</code>
                {invoice.network?.includes('testnet') && (
                  <a 
                    href={`https://suiscan.xyz/testnet/account/${address}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      fontSize: '0.8em',
                      color: '#3b82f6',
                      textDecoration: 'none',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    🔍 View
                  </a>
                )}
              </div>
            </div>
          </div>

          {relevantBalance < totalAmount && (
            <div className="warning">
              <div style={{marginBottom: '10px'}}>
                ⚠️ Insufficient balance. You need {(totalAmount - relevantBalance).toFixed(4)} more {coinName}.
              </div>
              
              {/* Different UI for testnet vs localnet */}
              {invoice.network?.includes('testnet') ? (
                <div style={{
                  background: '#f3f4f6',
                  border: '2px solid #3b82f6',
                  borderRadius: '8px',
                  padding: '15px',
                  marginTop: '10px'
                }}>
                  <div style={{fontWeight: 'bold', marginBottom: '8px', color: '#1e40af'}}>
                    🌐 Get Real Testnet USDC from Circle
                  </div>
                  <div style={{fontSize: '0.875rem', marginBottom: '12px', color: '#4b5563'}}>
                    This demonstrates the real-world flow using Circle's USDC faucet.
                  </div>
                  
                  {/* Address display with copy button */}
                  <div style={{marginBottom: '12px'}}>
                    <div style={{fontSize: '0.75rem', color: '#6b7280', marginBottom: '4px'}}>
                      Your Address:
                    </div>
                    <div style={{
                      display: 'flex',
                      gap: '8px',
                      alignItems: 'center'
                    }}>
                      <code style={{
                        flex: 1,
                        background: 'white',
                        padding: '8px',
                        borderRadius: '4px',
                        fontSize: '0.7em',
                        wordBreak: 'break-all',
                        border: '1px solid #d1d5db'
                      }}>
                        {address}
                      </code>
                      <button
                        onClick={async () => {
                          await navigator.clipboard.writeText(address || '');
                          const btn = document.getElementById('copy-addr-btn');
                          if (btn) {
                            btn.textContent = '✅';
                            setTimeout(() => btn.textContent = '📋', 2000);
                          }
                        }}
                        id="copy-addr-btn"
                        style={{
                          padding: '8px 12px',
                          background: '#10b981',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontSize: '0.9rem',
                          fontWeight: 600
                        }}
                      >
                        📋
                      </button>
                    </div>
                  </div>

                  {/* Faucet button */}
                  <button 
                    onClick={() => fundWallet()} 
                    className="btn-secondary"
                    style={{
                      width: '100%',
                      padding: '12px',
                      fontSize: '1rem',
                      fontWeight: 'bold',
                      background: '#3b82f6',
                      color: 'white',
                      border: 'none',
                      marginBottom: '8px'
                    }}
                  >
                    🚀 Open Circle USDC Faucet
                  </button>
                  
                  <button
                    onClick={() => checkBalance()}
                    className="btn-secondary"
                    style={{
                      width: '100%',
                      padding: '10px',
                      fontSize: '0.875rem'
                    }}
                  >
                    🔄 Refresh Balance
                  </button>
                </div>
              ) : (
                // Localnet: Simple auto-fund button
                <button onClick={() => fundWallet()} className="btn-secondary">
                  Get Test {coinName}
                </button>
              )}
            </div>
          )}

          <button
            onClick={requestPTB}
            disabled={relevantBalance < totalAmount || balance.loading}
            className="btn-primary"
          >
            Continue to Payment
          </button>
        </div>
      </div>
    );
  }

  if (step === 'verify') {
    return (
      <div className="payment-page">
        <div className="card">
          <h1>🔍 Verifying Transaction</h1>
          <div className="spinner">Building and verifying PTB...</div>
        </div>
      </div>
    );
  }

  if (step === 'sign' && verificationResult) {
    return (
      <div className="payment-page">
        <div className="card">
          <h1>✅ Verification Passed</h1>
          
          <div className="verification-result">
            <h3>Security Checks</h3>
            <div className="check-item">
              ✅ Merchant address verified
            </div>
            <div className="check-item">
              ✅ Payment amount verified
            </div>
            <div className="check-item">
              ✅ Facilitator fee verified
            </div>
            <div className="check-item">
              ✅ No unauthorized transfers
            </div>
            <div className="check-item">
              ✅ Invoice not expired
            </div>
          </div>

          <div className="info-box">
            <div style={{display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px'}}>
              <strong>Invoice Hash:</strong>
              <span style={{fontSize: '0.8em', color: '#6b7280'}} title="Cryptographic proof of invoice integrity">ℹ️</span>
            </div>
            <code style={{
              color: '#1f2937', 
              fontWeight: 600, 
              fontSize: '0.75em', 
              wordBreak: 'break-all', 
              display: 'block',
              background: '#f3f4f6',
              padding: '8px',
              borderRadius: '4px'
            }}>{verificationResult.details.invoiceHash}</code>
          </div>

          <p>The transaction has been verified. You can safely proceed.</p>

          {/* Settlement Mode Toggle */}
          <div style={{ 
            background: '#f3f4f6', 
            padding: '15px', 
            borderRadius: '8px', 
            marginBottom: '20px' 
          }}>
            <h3 style={{ marginBottom: '10px', fontSize: '1rem' }}>Settlement Mode:</h3>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={() => setSettlementMode('optimistic')}
                style={{
                  flex: 1,
                  padding: '10px',
                  background: settlementMode === 'optimistic' ? '#10b981' : 'white',
                  color: settlementMode === 'optimistic' ? 'white' : '#333',
                  border: '2px solid ' + (settlementMode === 'optimistic' ? '#10b981' : '#d1d5db'),
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontWeight: settlementMode === 'optimistic' ? 'bold' : 'normal',
                }}
              >
                ⚡ Optimistic (~50ms)
                <div style={{ fontSize: '0.75rem', marginTop: '4px' }}>
                  Instant response, facilitator guarantees
                </div>
              </button>
              <button
                onClick={() => setSettlementMode('pessimistic')}
                style={{
                  flex: 1,
                  padding: '10px',
                  background: settlementMode === 'pessimistic' ? '#3b82f6' : 'white',
                  color: settlementMode === 'pessimistic' ? 'white' : '#333',
                  border: '2px solid ' + (settlementMode === 'pessimistic' ? '#3b82f6' : '#d1d5db'),
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontWeight: settlementMode === 'pessimistic' ? 'bold' : 'normal',
                }}
              >
                🔒 Pessimistic (~500ms)
                <div style={{ fontSize: '0.75rem', marginTop: '4px' }}>
                  Wait for blockchain confirmation
                </div>
              </button>
            </div>
          </div>

          <button onClick={() => submitPayment(settlementMode)} className="btn-primary">
            Sign & Pay ({settlementMode === 'optimistic' ? '⚡ Fast' : '🔒 Safe'})
          </button>
        </div>
      </div>
    );
  }

  if (step === 'submit') {
    return (
      <div className="payment-page">
        <div className="card">
          <h1>📤 Submitting Payment</h1>
          <div className="spinner">Signing and submitting transaction...</div>
        </div>
      </div>
    );
  }

  if (step === 'success' && invoice) {
    const network = invoice.network?.split(':')[1] || 'localnet';
    let explorerLink = null;
    if (network === 'mainnet') {
      explorerLink = `https://suiscan.xyz/mainnet/tx/${paymentId}`;
    } else if (network === 'testnet') {
      explorerLink = `https://suiscan.xyz/testnet/tx/${paymentId}`;
    }
    
    const cliCommand = `lsui client tx-block ${paymentId}`;
    const actualPaymentTime = paymentTime && invoiceTime ? paymentTime - invoiceTime : null;

    return (
      <div className="payment-page">
        <div className="card success">
          <h1>🎉 Payment Successful!</h1>
          
          <div className="success-banner" style={{
            background: '#d1fae5',
            border: '2px solid #10b981',
            borderRadius: '8px',
            padding: '15px',
            marginBottom: '20px'
          }}>
            <strong>✅ Payment Verified Successfully!</strong>
            <p style={{margin: '5px 0 0 0', fontSize: '0.875rem'}}>
              Settlement Mode: <strong>{settlementMode}</strong>
              {actualPaymentTime && ` • Time: ${actualPaymentTime}ms ⚡`}
            </p>
          </div>
          
          <div className="receipt">
            <h3>📝 Transaction Receipt</h3>
            <div className="detail-row">
              <span>Transaction Hash:</span>
              {explorerLink ? (
                <a href={explorerLink} target="_blank" rel="noopener noreferrer" style={{
                  color: '#3b82f6',
                  textDecoration: 'none',
                  fontWeight: 600
                }}>
                  <code style={{cursor: 'pointer', color: '#3b82f6'}}>{paymentId}</code>
                </a>
              ) : (
                <code>{paymentId}</code>
              )}
            </div>
            
            {network === 'localnet' && (
              <div style={{
                background: settlementMode === 'optimistic' ? '#fef3c7' : '#f3f4f6',
                border: `1px solid ${settlementMode === 'optimistic' ? '#f59e0b' : '#d1d5db'}`,
                borderRadius: '6px',
                padding: '10px',
                marginTop: '10px',
                fontSize: '0.85rem'
              }}>
                <div style={{marginBottom: '5px', color: '#6b7280'}}>
                  💡 Localnet: View transaction details using CLI
                </div>
                {settlementMode === 'optimistic' && (
                  <div style={{
                    marginBottom: '8px',
                    padding: '6px 8px',
                    background: '#fef3c7',
                    border: '1px solid #f59e0b',
                    borderRadius: '4px',
                    color: '#92400e',
                    fontSize: '0.75rem'
                  }}>
                    ⚠️ <strong>Optimistic Mode:</strong> Transaction submitted in background. 
                    Wait a few seconds before running the CLI command.
                  </div>
                )}
                <code style={{
                  background: '#1e293b',
                  color: '#e2e8f0',
                  padding: '8px',
                  borderRadius: '4px',
                  display: 'block',
                  fontSize: '0.8rem',
                  fontFamily: 'monospace'
                }}>
                  {cliCommand}
                </code>
                <button
                  onClick={(e) => {
                    navigator.clipboard.writeText(cliCommand);
                    const btn = e.currentTarget;
                    const originalText = btn.textContent;
                    const originalBg = btn.style.background;
                    btn.textContent = '✅ Copied!';
                    btn.style.background = '#059669';
                    setTimeout(() => {
                      btn.textContent = originalText;
                      btn.style.background = originalBg;
                    }, 2000);
                  }}
                  style={{
                    marginTop: '8px',
                    padding: '6px 12px',
                    background: '#10b981',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    transition: 'all 0.2s'
                  }}
                >
                  📋 Copy Command
                </button>
              </div>
            )}
            
            {receiptData && (
              <div style={{marginTop: '15px'}}>
                <div className="detail-row">
                  <span>Merchant Amount:</span>
                  <strong>{receiptData.merchantAmount || 'N/A'}</strong>
                </div>
                <div className="detail-row">
                  <span>Facilitator Fee:</span>
                  <span>{receiptData.facilitatorFee || 'N/A'}</span>
                </div>
                {receiptData.invoiceHash && (
                  <div className="detail-row">
                    <span>Invoice Hash:</span>
                    <code style={{fontSize: '0.75em'}}>{receiptData.invoiceHash.substring(0, 32)}...</code>
                  </div>
                )}
              </div>
            )}
            
            <div className="detail-row">
              <span>Status:</span>
              <strong className="success-text">✅ Confirmed</strong>
            </div>
          </div>

          <p style={{marginTop: '20px'}}>You can now access the protected resource.</p>

          <button
            onClick={() => {
              const accessTime = Date.now();
              const redirectUrl = invoice.redirectUrl || 'http://localhost:3002/api/verify-payment';
              const url = `${redirectUrl}?paymentId=${paymentId}&mode=${settlementMode}&paymentTime=${paymentTime}&accessTime=${accessTime}&invoiceTime=${invoiceTime}&network=${network}`;
              window.open(url, '_blank');
            }}
            className="btn-primary"
          >
            🎁 Access Premium Content
          </button>

          <button
            onClick={() => {
              setInvoiceJWT('');
              setInvoice(null);
              setStep('input');
              setPtbBytes(null);
              setVerificationResult(null);
              setPaymentId('');
              setPaymentTime(null);
              setReceiptData(null);
            }}
            className="btn-secondary"
          >
            New Payment
          </button>
        </div>
      </div>
    );
  }

  if (step === 'error') {
    return (
      <div className="payment-page">
        <div className="card error">
          <h1>❌ Payment Failed</h1>
          <div className="error-message">{error}</div>
          <button
            onClick={() => {
              setError('');
              setStep(invoice ? 'review' : 'input');
            }}
            className="btn-secondary"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return null;
}
