/**
 * Premium Data endpoint - Returns 402 with invoice JWT
 * 
 * HTTP 402 Payment Required pattern
 */

import { generateInvoiceJWT } from '../utils/jwt.js';
import { config } from '../config.js';

export async function premiumDataController(req, res) {
  try {
    const nonce = generateNonce();
    const totalAmount = parseInt(config.resourcePrice) + parseInt(config.facilitatorFee);
    
    // X-402 V2 compliant invoice (CAIP standards)
    const invoice = {
      x402Version: 2,
      scheme: 'exact',
      network: `sui:${config.suiNetwork}`,
      assetType: `sui:${config.suiNetwork}/${config.coinType}`,
      payTo: `sui:${config.suiNetwork}:${config.merchantAddress}`,
      paymentId: nonce,
      description: 'Premium market insights and analytics data',
      resource: '/api/premium-data',
      maxAmountRequired: totalAmount.toString(),
      maxTimeoutSeconds: config.invoiceExpirySeconds,
      mimeType: 'application/json',
      facilitatorFee: config.facilitatorFee,
      merchantAmount: config.resourcePrice,
      expiry: Math.floor(Date.now() / 1000) + config.invoiceExpirySeconds,
      redirectUrl: `${config.merchantUrl}/api/verify-payment`,
    };

    const invoiceJWT = await generateInvoiceJWT(invoice);

    res.status(402).json({
      error: 'Payment Required',
      message: 'This resource requires payment',
      invoice: invoiceJWT,
      ...invoice,
    });
  } catch (error) {
    console.error('Premium data error:', error);
    res.status(500).json({
      error: 'Internal server error',
      details: error.message,
    });
  }
}

// Generate unique nonce
function generateNonce() {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
}
