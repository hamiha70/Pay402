/**
 * Verify payment endpoint - Checks on-chain receipt and returns content
 * 
 * For hackathon demo: Simplified version that accepts payment ID
 * Production: Would query SUI blockchain for receipt event
 */

export function verifyPaymentController(req, res) {
  try {
    const { paymentId } = req.query;

    if (!paymentId) {
      res.status(400).json({
        error: 'Missing paymentId parameter',
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

    // Demo response
    res.json({
      success: true,
      paymentVerified: true,
      paymentId,
      content: {
        title: '🎉 Premium Market Insights',
        data: [
          { symbol: 'BTC', price: 45123.45, change: '+5.2%', volume: '28.5B' },
          { symbol: 'ETH', price: 2456.78, change: '+3.1%', volume: '15.2B' },
          { symbol: 'SUI', price: 1.89, change: '+12.5%', volume: '850M' },
        ],
        analysis: 'Market showing strong bullish momentum across major assets...',
        timestamp: new Date().toISOString(),
        paid: true,
      },
    });
  } catch (error) {
    console.error('Verify payment error:', error);
    res.status(500).json({
      error: 'Verification failed',
      details: error.message,
    });
  }
}
