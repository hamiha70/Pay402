/**
 * Premium Data endpoint - Returns 402 with invoice JWT
 * 
 * HTTP 402 Payment Required pattern
 */

import { generateInvoiceJWT } from '../utils/jwt.js';
import { config } from '../config.js';

export async function premiumDataController(req, res) {
  try {
    // Generate unique invoice
    const invoice = {
      resource: '/api/premium-data',
      amount: config.resourcePrice,
      merchantRecipient: config.merchantAddress,
      facilitatorFee: config.facilitatorFee,
      facilitatorRecipient: config.facilitatorAddress,
      coinType: config.coinType,
      expiry: Math.floor(Date.now() / 1000) + config.invoiceExpirySeconds,
      nonce: generateNonce(),
    };

    // Sign invoice JWT
    const invoiceJWT = await generateInvoiceJWT(invoice);

    // Return 402 Payment Required with invoice
    res.status(402).json({
      error: 'Payment Required',
      message: 'This resource requires payment',
      invoice: invoiceJWT,
      invoiceData: invoice, // For debugging
      paymentInstructions: {
        1: 'Take the invoice JWT',
        2: 'Open Pay402 payment page',
        3: 'Complete payment with zkLogin',
        4: 'Return to verify endpoint with payment ID',
      },
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
