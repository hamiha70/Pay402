import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useBalance } from '../hooks/useBalance';
import { verifyPaymentPTB } from '../lib/verifier';
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
  const { isConnected, address, signIn, signTransaction, authMethod } = useAuth();
  const { balanceInfo, fundWallet } = useBalance(address);

  // Extract balance with defaults
  const balance = balanceInfo || { sui: 0, usdc: 0, loading: true, address: address || '' };

  // Payment state
  const [invoiceJWT, setInvoiceJWT] = useState<string>(propInvoiceJWT || '');
  const [invoice, setInvoice] = useState<InvoiceJWT | null>(null);
  const [step, setStep] = useState<'input' | 'review' | 'verify' | 'sign' | 'submit' | 'success' | 'error'>('input');
  const [ptbBytes, setPtbBytes] = useState<Uint8Array | null>(null);
  const [verificationResult, setVerificationResult] = useState<any>(null);
  const [paymentId, setPaymentId] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [settlementMode, setSettlementMode] = useState<'optimistic' | 'pessimistic'>('optimistic');

  // Helper: Get coin name from coinType
  const getCoinName = (coinType: string): string => {
    if (coinType.includes('::sui::SUI')) return 'SUI';
    if (coinType.includes('::mock_usdc::MOCK_USDC')) return 'USDC'; // MockUSDC on localnet
    if (coinType.includes('::usdc::USDC')) return 'USDC'; // Real USDC on testnet
    return 'tokens'; // Fallback
  };

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
      const response = await fetch('http://localhost:3001/build-ptb', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          buyerAddress: address,
          invoiceJWT,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        
        // Provide helpful error messages for common issues
        let errorMessage = error.error || 'Failed to build PTB';
        
        if (error.details?.includes('insufficient SUI balance') || 
            error.details?.includes('gas selection')) {
          errorMessage = 'Insufficient SUI for gas. This is a known issue - gas sponsorship coming soon!';
        } else if (error.details?.includes('No coins found')) {
          errorMessage = 'No coins found for your address. Please fund your wallet first.';
        } else if (error.error === 'No single coin with sufficient balance') {
          errorMessage = 'Need to merge coins (not yet implemented). Use an address with a single large coin.';
        }
        
        throw new Error(errorMessage);
      }

      const data = await response.json();
      
      // Facilitator returns transaction KIND bytes (no gas data)
      // This is the sponsored transaction pattern
      const kindBytesArray = new Uint8Array(data.transactionKindBytes);
      
      setPtbBytes(kindBytesArray);

      // Verify PTB client-side
      const result = await verifyPaymentPTB(kindBytesArray, invoice, invoiceJWT);
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
      // Reconstruct transaction from kind bytes (sponsored transaction pattern)
      const { Transaction } = await import('@mysten/sui/transactions');
      const tx = Transaction.fromKind(ptbBytes);
      tx.setSender(address);
      
      // Sign transaction (buyer signature)
      const { signature, bytes: transactionBytes } = await signTransaction(tx);
      
      console.log('✍️ Buyer signed transaction');
      console.log('  Sender:', address);
      console.log('  Signature length:', signature.length);

      // Submit to facilitator (facilitator will add gas sponsorship & submit)
      const response = await fetch('http://localhost:3001/submit-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          invoiceJWT,
          buyerAddress: address,
          transactionKindBytes: Array.from(ptbBytes), // Original kind bytes
          buyerSignature: signature,                   // Buyer's signature
          settlementMode: mode,                        // 'optimistic' or 'pessimistic'
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Payment submission failed');
      }

      const data = await response.json();
      const clientLatency = Date.now() - startTime;
      
      console.log(`💳 Payment submitted (${mode} mode)`);
      console.log('Client latency:', `${clientLatency}ms`);
      console.log('Server latency:', data.latency);
      console.log('Digest:', data.digest);
      
      if (data.receipt) {
        console.log('Receipt:', data.receipt);
      }

      setPaymentId(data.digest);
      setStep('success');
      
      // Redirect back to merchant with payment details
      if (invoice?.redirectUrl) {
        const redirectUrl = new URL(invoice.redirectUrl);
        redirectUrl.searchParams.set('digest', data.digest);
        redirectUrl.searchParams.set('paymentId', data.digest);
        redirectUrl.searchParams.set('mode', mode);
        
        // Redirect after 2 seconds to let user see success message
        setTimeout(() => {
          window.location.href = redirectUrl.toString();
        }, 2000);
      }
    } catch (err) {
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
            rows={6}
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
    const totalAmount = (parseInt(invoice.amount) + parseInt(invoice.facilitatorFee)) / 1_000_000;
    const merchantAmount = parseInt(invoice.amount) / 1_000_000;
    const feeAmount = parseInt(invoice.facilitatorFee) / 1_000_000;
    const coinName = getCoinName(invoice.coinType);
    
    // Use USDC balance for USDC payments, SUI balance for SUI payments
    const relevantBalance = coinName === 'SUI' ? balance.sui : balance.usdc;

    return (
      <div className="payment-page">
        <div className="card">
          <h1>💳 Review Payment</h1>
          
          <div className="invoice-details">
            <h3>Invoice Details</h3>
            <div className="detail-row">
              <span>Resource:</span>
              <code>{invoice.resource}</code>
            </div>
            <div className="detail-row">
              <span>Merchant:</span>
              <code>{invoice.merchantRecipient.substring(0, 20)}...</code>
            </div>
            <div className="detail-row">
              <span>Amount:</span>
              <strong>{merchantAmount} {coinName}</strong>
            </div>
            <div className="detail-row">
              <span>Facilitator Fee:</span>
              <span>{feeAmount} {coinName}</span>
            </div>
            <div className="detail-row total">
              <span>Total:</span>
              <strong>{totalAmount} {coinName}</strong>
            </div>
            <div className="detail-row">
              <span>Expires:</span>
              <span>{new Date(invoice.expiry * 1000).toLocaleString()}</span>
            </div>
          </div>

          <div className="balance-info">
            <h3>Your Balance</h3>
            <div className="balance-row">
              <span>{coinName}:</span>
              <strong>{relevantBalance} {coinName}</strong>
            </div>
            <div className="balance-row">
              <span>SUI (for gas):</span>
              <strong>{balance.sui} SUI</strong>
            </div>
            <div className="balance-row">
              <span>Address:</span>
              <code>{address?.substring(0, 20)}...</code>
            </div>
          </div>

          {relevantBalance < totalAmount && (
            <div className="warning">
              ⚠️ Insufficient balance. You need {(totalAmount - relevantBalance).toFixed(4)} more {coinName}.
              <button onClick={() => fundWallet()} className="btn-secondary">
                Get Test {coinName}
              </button>
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
              ✅ Merchant recipient verified
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
            <strong>Invoice Hash:</strong>
            <code>{verificationResult.details.invoiceHash?.substring(0, 32)}...</code>
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

  if (step === 'success') {
    return (
      <div className="payment-page">
        <div className="card success">
          <h1>🎉 Payment Successful!</h1>
          
          <div className="receipt">
            <h3>Receipt</h3>
            <div className="detail-row">
              <span>Transaction:</span>
              <code>{paymentId.substring(0, 32)}...</code>
            </div>
            <div className="detail-row">
              <span>Status:</span>
              <strong className="success-text">Confirmed</strong>
            </div>
          </div>

          <p>You can now access the protected resource.</p>

          <button
            onClick={() => window.open(`http://localhost:3002/api/verify-payment?paymentId=${paymentId}`, '_blank')}
            className="btn-primary"
          >
            Access Content
          </button>

          <button
            onClick={() => {
              setInvoiceJWT('');
              setInvoice(null);
              setStep('input');
              setPtbBytes(null);
              setVerificationResult(null);
              setPaymentId('');
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
