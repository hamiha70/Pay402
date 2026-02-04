/**
 * Network Configuration for Merchant
 * 
 * Defines network-specific settings matching facilitator configuration
 */

export const networks = {
  localnet: {
    name: 'Localnet',
    paymentCoin: {
      type: '0x34f1b450e7815b8b95df68cb6bfd81bbaf42607acf1f345bcb4a2fc732ca648b::mock_usdc::MOCK_USDC',
      symbol: 'USDC',
      decimals: 6,
      name: 'Mock USDC (Localnet)',
    },
  },
  
  testnet: {
    name: 'Testnet',
    paymentCoin: {
      type: '0x...::usdc::USDC',  // TODO: Get real Circle USDC address on testnet
      symbol: 'USDC',
      decimals: 6,
      name: 'USDC',
    },
  },
};

/**
 * Get network config based on environment variable
 */
export function getNetworkConfig() {
  const network = process.env.SUI_NETWORK || 'localnet';
  
  if (!networks[network]) {
    throw new Error(
      `Unknown network: ${network}. ` +
      `Valid options: ${Object.keys(networks).join(', ')}`
    );
  }
  
  return networks[network];
}

/**
 * Get payment coin type for current network
 */
export function getPaymentCoinType() {
  return getNetworkConfig().paymentCoin.type;
}
