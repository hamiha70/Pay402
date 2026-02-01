/**
 * Merchant configuration
 */

import dotenv from 'dotenv';
dotenv.config();

export const config = {
  // Server
  port: parseInt(process.env.PORT || '3002', 10),
  
  // Merchant identity
  merchantName: process.env.MERCHANT_NAME || 'Premium Data Corp',
  merchantAddress: process.env.MERCHANT_ADDRESS,
  merchantPrivateKey: process.env.MERCHANT_PRIVATE_KEY,
  
  // Pricing
  resourcePrice: process.env.RESOURCE_PRICE || '100000', // 0.1 USDC
  
  // Facilitator
  facilitatorAddress: process.env.FACILITATOR_ADDRESS,
  facilitatorFee: process.env.FACILITATOR_FEE || '10000', // 0.01 USDC
  
  // SUI
  suiNetwork: process.env.SUI_NETWORK || 'localnet',
  coinType: process.env.COIN_TYPE || '0x2::sui::SUI',
  
  // Invoice
  invoiceExpirySeconds: parseInt(process.env.INVOICE_EXPIRY_SECONDS || '3600', 10),
};

// Validation
if (!config.merchantAddress) {
  console.warn('⚠️  MERCHANT_ADDRESS not set in .env');
}

if (!config.merchantPrivateKey) {
  console.warn('⚠️  MERCHANT_PRIVATE_KEY not set in .env - JWT signing will fail');
}

if (!config.facilitatorAddress) {
  console.warn('⚠️  FACILITATOR_ADDRESS not set in .env');
}
