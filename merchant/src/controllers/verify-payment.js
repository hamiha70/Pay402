/**
 * Verify payment endpoint - Checks on-chain receipt and returns content
 * 
 * For hackathon demo: Simplified version that accepts payment ID
 * Production: Would query SUI blockchain for receipt event
 */

export function verifyPaymentController(req, res) {
  try {
    const { paymentId, digest, mode, paymentTime, accessTime, invoiceTime } = req.query;
    const txDigest = paymentId || digest;
    
    // Calculate timing metrics (if provided)
    const paymentTimestamp = paymentTime ? parseInt(paymentTime) : null;
    const accessTimestamp = accessTime ? parseInt(accessTime) : Date.now();
    const invoiceTimestamp = invoiceTime ? parseInt(invoiceTime) : null;
    
    const timeDelta = paymentTimestamp ? accessTimestamp - paymentTimestamp : null;
    const totalTime = invoiceTimestamp && paymentTimestamp ? paymentTimestamp - invoiceTimestamp : null;

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
      title: '🎉 Premium Market Insights',
      data: [
        { symbol: 'BTC', price: 45123.45, change: '+5.2%', volume: '28.5B' },
        { symbol: 'ETH', price: 2456.78, change: '+3.1%', volume: '15.2B' },
        { symbol: 'SUI', price: 1.89, change: '+12.5%', volume: '850M' },
      ],
      analysis: 'Market showing strong bullish momentum across major assets...',
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
    .timing-popup {
      position: fixed;
      bottom: 20px;
      right: 20px;
      background: white;
      border: 2px solid #10b981;
      border-radius: 8px;
      padding: 12px 16px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      font-size: 0.75rem;
      max-width: 300px;
    }
    .timing-popup h4 {
      margin: 0 0 8px 0;
      font-size: 0.8rem;
      color: #059669;
    }
    .timing-popup .metric {
      display: flex;
      justify-content: space-between;
      margin: 4px 0;
      color: #374151;
    }
    .timing-popup .metric-label {
      color: #6b7280;
    }
    .timing-popup .metric-value {
      font-weight: 600;
      color: #1f2937;
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
          ${timeDelta !== null ? `<br>Time to access content: <strong>${timeDelta}ms</strong> ${mode === 'optimistic' ? '⚡ (Instant!)' : '🔒 (Blockchain confirmed)'}` : ''}
        </p>
      </div>

      <h1>${premiumContent.title}</h1>
      
      <table>
        <thead>
          <tr>
            <th>Symbol</th>
            <th>Price</th>
            <th>24h Change</th>
            <th>Volume</th>
          </tr>
        </thead>
        <tbody>
          ${premiumContent.data.map(item => `
            <tr>
              <td><strong>${item.symbol}</strong></td>
              <td>$${item.price.toLocaleString()}</td>
              <td class="positive">${item.change}</td>
              <td>$${item.volume}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>

      <div class="analysis-box">
        <strong>📊 Market Analysis:</strong>
        <p style="margin-top: 10px;">${premiumContent.analysis}</p>
      </div>

      <div class="meta">
        <p>Transaction: <code>${txDigest.substring(0, 32)}...</code></p>
        <p>Generated: ${premiumContent.timestamp}</p>
      </div>
    </div>

    ${timeDelta !== null || totalTime !== null ? `
    <div class="timing-popup">
      <h4>⏱️ Payment Flow Timing</h4>
      ${totalTime !== null ? `
      <div class="metric">
        <span class="metric-label">Total (invoice→payment):</span>
        <span class="metric-value">${totalTime}ms</span>
      </div>
      ` : ''}
      ${timeDelta !== null ? `
      <div class="metric">
        <span class="metric-label">Payment→Content:</span>
        <span class="metric-value">${timeDelta}ms</span>
      </div>
      ` : ''}
      <div class="metric">
        <span class="metric-label">Settlement mode:</span>
        <span class="metric-value">${mode || 'optimistic'}</span>
      </div>
    </div>
    ` : ''}
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
