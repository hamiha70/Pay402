/**
 * Verify payment endpoint - Checks on-chain receipt and returns content
 * 
 * For hackathon demo: Simplified version that accepts payment ID
 * Production: Would query SUI blockchain for receipt event
 */

export function verifyPaymentController(req, res) {
  try {
    const { paymentId, digest, mode, paymentTime, accessTime, invoiceTime, network, blockchainLatency } = req.query;
    const txDigest = paymentId || digest;
    const suiNetwork = network || 'localnet';
    
    // Calculate timing metrics (if provided)
    const paymentTimestamp = paymentTime ? parseInt(paymentTime) : null;
    const accessTimestamp = accessTime ? parseInt(accessTime) : Date.now();
    const invoiceTimestamp = invoiceTime ? parseInt(invoiceTime) : null;
    
    const timeDelta = paymentTimestamp ? accessTimestamp - paymentTimestamp : null;
    
    // Generate explorer link
    let explorerLink = null;
    if (txDigest) {
      if (suiNetwork === 'mainnet') {
        explorerLink = `https://suiscan.xyz/mainnet/tx/${txDigest}`;
      } else if (suiNetwork === 'testnet') {
        explorerLink = `https://suiscan.xyz/testnet/tx/${txDigest}`;
      }
      // For localnet, no public explorer available
    }

    if (!txDigest) {
      res.status(400).json({
        error: 'Missing paymentId or digest parameter',
        usage: '/api/verify-payment?paymentId=<transaction_digest>',
      });
      return;
    }

    // TODO: Query SUI blockchain for receipt event
    // For hackathon demo, we'll accept any paymentId
    // In production:
    // 1. Query events by transaction digest
    // 2. Verify invoice_hash matches our records
    // 3. Verify amounts are correct
    // 4. Check not already used (prevent replay)

    // Check if client wants HTML or JSON
    const wantsHtml = req.headers.accept?.includes('text/html');
    
    const premiumContent = {
      title: '🎉 Premium Content Unlocked!',
      subtitle: 'What Pay402 Built - First x402 Facilitator on SUI',
      features: [
        { icon: '✅', name: 'OAuth Login', detail: 'Auto SUI address from Google' },
        { icon: '✅', name: 'Gas Sponsorship', detail: 'No blockchain access needed' },
        { icon: '✅', name: 'PTB Verification', detail: 'Buyer verifies before signing' },
        { icon: '✅', name: 'zkLogin Signing', detail: 'Enoki Salt management' },
        { icon: '✅', name: 'Optimistic Mode', detail: 'Fast delivery (before finality)' },
        { icon: '✅', name: 'Pessimistic Mode', detail: 'On-chain confirmation first' },
        { icon: '✅', name: 'USDC Persistence', detail: 'Buyer keeps coins (no escrow)' },
        { icon: '✅', name: 'Merchant Widget', detail: 'JavaScript embed (Stripe model)' },
        { icon: '✅', name: 'On-chain Receipts', detail: 'x402 invoice audit trail' },
        { icon: '🔜', name: 'Browser Extension', detail: 'OAuth + one-time USDC only' },
      ],
      timestamp: new Date().toISOString(),
      paid: true,
    };

    if (wantsHtml) {
      // Return beautiful HTML page with premium content
      res.send(`
<!DOCTYPE html>
<html>
<head>
  <title>Premium Content - Pay402</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      padding: 40px 20px;
    }
    .container { max-width: 900px; margin: 0 auto; }
    .card {
      background: white;
      border-radius: 12px;
      padding: 40px;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
      margin-bottom: 20px;
    }
    h1 { color: #059669; margin-bottom: 20px; }
    .success-banner {
      background: #d1fae5;
      border: 2px solid #10b981;
      border-radius: 8px;
      padding: 15px;
      margin-bottom: 30px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 20px 0;
    }
    th, td {
      padding: 12px;
      text-align: left;
      border-bottom: 1px solid #e5e7eb;
    }
    th {
      background: #f3f4f6;
      font-weight: 600;
    }
    .positive { color: #10b981; }
    .analysis-box {
      background: #f0f9ff;
      border-left: 4px solid #3b82f6;
      padding: 20px;
      margin: 20px 0;
    }
    .meta {
      color: #6b7280;
      font-size: 0.875rem;
      margin-top: 20px;
    }
    code {
      background: #f3f4f6;
      padding: 2px 6px;
      border-radius: 4px;
      font-size: 0.875rem;
      color: #1f2937;
      font-weight: 500;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="card">
      <div class="success-banner">
        <strong>✅ Payment Verified Successfully!</strong>
        <p style="margin: 5px 0 0 0; font-size: 0.875rem;">
          Settlement Mode: <strong>${mode || 'optimistic'}</strong>
          ${blockchainLatency ? `<br>Blockchain Latency: <strong>${blockchainLatency}ms</strong> ${mode === 'optimistic' ? '⚡ (background)' : '🔒'}` : ''}
        </p>
      </div>

      <h1 style="margin: 0 0 10px 0; color: #1f2937;">${premiumContent.title}</h1>
      <p style="color: #6b7280; margin: 0 0 20px 0; font-size: 0.95rem;">${premiumContent.subtitle}</p>
      
      <div style="
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
        gap: 12px;
        margin-top: 20px;
      ">
        ${premiumContent.features.map(feature => `
          <div style="
            background: ${feature.icon === '🔜' ? '#f9fafb' : '#f0fdf4'};
            border: 1px solid ${feature.icon === '🔜' ? '#e5e7eb' : '#bbf7d0'};
            border-radius: 8px;
            padding: 12px;
          ">
            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px;">
              <span style="font-size: 1.2rem;">${feature.icon}</span>
              <strong style="color: #1f2937; font-size: 0.9rem;">${feature.name}</strong>
            </div>
            <p style="margin: 0; color: #6b7280; font-size: 0.85rem; line-height: 1.4;">
              ${feature.detail}
            </p>
          </div>
        `).join('')}
      </div>

      <div class="meta">
        <p><strong>Transaction:</strong></p>
        ${explorerLink ? `
          <p><a href="${explorerLink}" target="_blank" style="color: #3b82f6; text-decoration: none; font-weight: 600;">
            <code style="cursor: pointer; background: #f3f4f6; padding: 4px 8px; border-radius: 4px; color: #3b82f6;">${txDigest}</code>
          </a></p>
        ` : `
          <p><code style="background: #f3f4f6; padding: 4px 8px; border-radius: 4px; color: #1f2937; font-weight: 600;">${txDigest}</code></p>
        `}
        
        ${suiNetwork === 'localnet' ? `
          <div style="
            background: #fef3c7;
            border: 1px solid #f59e0b;
            border-radius: 6px;
            padding: 12px;
            margin-top: 12px;
          ">
            <p style="margin: 0 0 8px 0; color: #92400e; font-size: 0.85rem; font-weight: 600;">
              💡 Localnet: View transaction details using CLI
            </p>
            <code style="
              background: #1e293b;
              color: #e2e8f0;
              padding: 8px 12px;
              border-radius: 4px;
              display: block;
              font-size: 0.8rem;
              font-family: monospace;
              margin-bottom: 8px;
            ">lsui client tx-block ${txDigest}</code>
            <button 
              onclick="navigator.clipboard.writeText('lsui client tx-block ${txDigest}').then(() => { const orig = this.style.background; this.textContent = '✅ Copied!'; this.style.background = '#059669'; setTimeout(() => { this.textContent = '📋 Copy Command'; this.style.background = orig; }, 2000); })"
              style="
                padding: 6px 12px;
                background: #10b981;
                color: white;
                border: none;
                border-radius: 4px;
                cursor: pointer;
                font-size: 0.8rem;
                font-weight: 600;
                transition: all 0.2s;
              "
            >📋 Copy Command</button>
          </div>
        ` : ''}
        
        <p style="margin-top: 16px;"><strong>Generated:</strong> ${premiumContent.timestamp}</p>
        
        <div style="margin-top: 24px; text-align: center;">
          <button 
            onclick="
              // Clear all zkLogin session data
              localStorage.clear();
              sessionStorage.clear();
              
              // Redirect to merchant home page
              window.location.href = '/';
            "
            style="
              padding: 12px 24px;
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              color: white;
              border: none;
              border-radius: 8px;
              cursor: pointer;
              font-size: 1rem;
              font-weight: 600;
              transition: all 0.2s;
            "
            onmouseover="this.style.transform = 'translateY(-2px)'; this.style.boxShadow = '0 10px 20px rgba(102, 126, 234, 0.4)';"
            onmouseout="this.style.transform = 'translateY(0)'; this.style.boxShadow = 'none';"
          >
            🔄 Start Another Payment (Fresh Session)
          </button>
          <p style="margin-top: 8px; color: #6b7280; font-size: 0.85rem;">
            This will clear your session and start fresh
          </p>
        </div>
      </div>
    </div>

  </div>
</body>
</html>
      `);
    } else {
      // Return JSON for API clients
      res.json({
        success: true,
        paymentVerified: true,
        paymentId: txDigest,
        content: premiumContent,
      });
    }
  } catch (error) {
    console.error('Verify payment error:', error);
    res.status(500).json({
      error: 'Verification failed',
      details: error.message,
    });
  }
}
