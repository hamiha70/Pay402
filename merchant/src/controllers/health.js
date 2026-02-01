/**
 * Health check endpoint
 */

export function healthController(req, res) {
  res.json({
    status: 'healthy',
    service: 'pay402-merchant',
    timestamp: new Date().toISOString(),
  });
}
