import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '3001', 10),
  suiNetwork: process.env.SUI_NETWORK || 'testnet',
  packageId: process.env.PACKAGE_ID || '',
  facilitatorPrivateKey: process.env.FACILITATOR_PRIVATE_KEY || '',
  facilitatorFee: process.env.FACILITATOR_FEE || '10000', // 0.01 USDC (6 decimals)
} as const;

// SUI constants
export const CLOCK_OBJECT_ID = '0x0000000000000000000000000000000000000000000000000000000000000006';

// Coin type constants (testnet)
export const COIN_TYPES = {
  SUI: '0x2::sui::SUI',
  USDC: '0xa1ec7fc00a6f40db9693ad1415d0c193ad3906494428cf252621037bd7117e29::usdc::USDC',
} as const;
