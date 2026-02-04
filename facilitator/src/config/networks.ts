/**
 * Network Configuration for Pay402
 * 
 * Defines network-specific settings for localnet and testnet:
 * - RPC endpoints
 * - Faucet URLs
 * - Payment coin types (MockUSDC vs real USDC)
 * - Gas coins (SUI only)
 * - Funding strategies
 * - Validation rules
 */

export interface NetworkConfig {
  name: string;
  rpcUrl: string;
  faucetUrl?: string;
  
  // Coin types
  paymentCoin: {
    type: string;
    symbol: string;
    decimals: number;
    name: string;
  };
  
  gasCoin: {
    type: string;
    symbol: string;
    decimals: number;
  };
  
  // Funding
  facilitatorFundingStrategy: 'embedded-faucet' | 'manual';
  faucetCommand?: string;
  circleUSDCFaucet?: string;
  
  // Validation
  blockSuiPayments: boolean;  // Critical for testnet
  
  // Limits
  limits?: {
    maxSUIBalance?: string;
    usdcFaucetLimit?: string;
  };
}

export const networks: Record<string, NetworkConfig> = {
  localnet: {
    name: 'Localnet',
    rpcUrl: 'http://127.0.0.1:9000',
    faucetUrl: 'http://127.0.0.1:9123/gas',
    
    paymentCoin: {
      type: '0x34f1b450e7815b8b95df68cb6bfd81bbaf42607acf1f345bcb4a2fc732ca648b::mock_usdc::MOCK_USDC',
      symbol: 'USDC',
      decimals: 6,
      name: 'Mock USDC (Localnet)',
    },
    
    gasCoin: {
      type: '0x2::sui::SUI',
      symbol: 'SUI',
      decimals: 9,
    },
    
    facilitatorFundingStrategy: 'embedded-faucet',
    faucetCommand: 'sui client faucet',
    
    blockSuiPayments: false,  // Allow SUI payments on localnet for backwards compatibility
  },
  
  testnet: {
    name: 'Testnet',
    rpcUrl: 'https://fullnode.testnet.sui.io:443',
    faucetUrl: 'https://faucet.testnet.sui.io/gas',
    
    paymentCoin: {
      type: '0x...::usdc::USDC',  // TODO: Get real Circle USDC address on testnet
      symbol: 'USDC',
      decimals: 6,
      name: 'USDC',
    },
    
    gasCoin: {
      type: '0x2::sui::SUI',
      symbol: 'SUI',
      decimals: 9,
    },
    
    facilitatorFundingStrategy: 'manual',
    faucetCommand: undefined,  // Manual funding required
    circleUSDCFaucet: 'https://faucet.circle.com',  // Circle's USDC faucet
    
    blockSuiPayments: true,  // CRITICAL: Prevent SUI payments to avoid gas drainage
    
    limits: {
      maxSUIBalance: '100 SUI',  // Alert if approaching
      usdcFaucetLimit: '20 USDC per 2 hours',
    },
  },
};

/**
 * Get network config based on environment variable
 */
export function getNetworkConfig(): NetworkConfig {
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
 * Validate coin type for payment
 * 
 * CRITICAL: Prevents SUI payments on testnet to avoid gas drainage
 */
export function validatePaymentCoin(coinType: string, network?: string): void {
  const config = network ? networks[network] : getNetworkConfig();
  
  // Block SUI payments on testnet
  if (config.blockSuiPayments && coinType === config.gasCoin.type) {
    throw new Error(
      `BLOCKED: Cannot use SUI for payments on ${config.name}!\n` +
      `Use ${config.paymentCoin.symbol} (${config.paymentCoin.type}) to prevent draining gas fund.\n` +
      `Current: ${coinType}\n` +
      `Expected: ${config.paymentCoin.type}\n\n` +
      `Why: Facilitator needs SUI for gas sponsorship. Using SUI for payments will drain the gas fund.`
    );
  }
  
  // Validate payment coin matches network config
  if (coinType !== config.paymentCoin.type) {
    throw new Error(
      `Invalid payment coin for ${config.name}.\n` +
      `Expected: ${config.paymentCoin.symbol} (${config.paymentCoin.type})\n` +
      `Got: ${coinType}\n\n` +
      `Hint: Check invoice coinType field or network configuration.`
    );
  }
}

/**
 * Format amount with proper decimals for display
 */
export function formatAmount(amount: number | string, coinType: string): string {
  const config = getNetworkConfig();
  const decimals = coinType === config.gasCoin.type 
    ? config.gasCoin.decimals 
    : config.paymentCoin.decimals;
  
  const numAmount = typeof amount === 'string' ? parseInt(amount) : amount;
  const displayAmount = numAmount / Math.pow(10, decimals);
  
  const symbol = coinType === config.gasCoin.type 
    ? config.gasCoin.symbol 
    : config.paymentCoin.symbol;
  
  return `${displayAmount.toFixed(coinType === config.gasCoin.type ? 4 : 2)} ${symbol}`;
}
