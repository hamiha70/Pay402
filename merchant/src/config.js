/**
 * Merchant configuration
 */

import dotenv from 'dotenv';
import { getNetworkConfig, getPaymentCoinType } from './config/networks.js';

dotenv.config();

// Get network configuration
const networkConfig = getNetworkConfig();

export const config = {
  // Server
  port: parseInt(process.env.PORT || '3002', 10),
  merchantUrl: process.env.MERCHANT_URL || `http://localhost:${process.env.PORT || '3002'}`,
  
  // Merchant identity
  merchantName: process.env.MERCHANT_NAME || 'Premium Data Corp',
  merchantAddress: process.env.MERCHANT_ADDRESS,
  merchantPrivateKey: process.env.MERCHANT_PRIVATE_KEY,
  
  // Pricing
  resourcePrice: process.env.RESOURCE_PRICE || '10000000', // 10.00 USDC (6 decimals)
  
  // Facilitator
  facilitatorAddress: process.env.FACILITATOR_ADDRESS,
  facilitatorFee: process.env.FACILITATOR_FEE || '500000', // 0.50 USDC (6 decimals)
  
  // Network
  suiNetwork: process.env.SUI_NETWORK || 'localnet',
  coinType: process.env.COIN_TYPE || getPaymentCoinType(), // Auto-detect from network
  network: networkConfig,
  
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
