import dotenv from 'dotenv';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { getNetworkConfig } from './config/networks.js';

dotenv.config();

// Derive facilitator address from private key
function getFacilitatorAddress(): string {
  try {
    const privateKey = process.env.FACILITATOR_PRIVATE_KEY;
    if (!privateKey) return '';
    const keypair = Ed25519Keypair.fromSecretKey(privateKey);
    return keypair.getPublicKey().toSuiAddress();
  } catch {
    return '';
  }
}

// Get network configuration
const networkConfig = getNetworkConfig();

export const config = {
  port: parseInt(process.env.PORT || '3001', 10),
  suiNetwork: process.env.SUI_NETWORK || 'localnet',
  suiRpcUrl: process.env.SUI_RPC_URL || networkConfig.rpcUrl,
  packageId: process.env.PACKAGE_ID || '',
  facilitatorPrivateKey: process.env.FACILITATOR_PRIVATE_KEY || '',
  facilitatorAddress: getFacilitatorAddress(),
  facilitatorFee: process.env.FACILITATOR_FEE || '500000', // 0.50 USDC (6 decimals)
  
  // Treasury owner (for minting MockUSDC on localnet)
  // This should be the address that deployed MockUSDC and owns the treasury cap
  // CRITICAL: Must be separate from facilitator for proper security
  treasuryOwnerPrivateKey: process.env.TREASURY_OWNER_PRIVATE_KEY || process.env.FACILITATOR_PRIVATE_KEY || '',
  
  // MockUSDC deployment info (auto-populated by deploy script)
  mockUsdcPackage: process.env.MOCK_USDC_PACKAGE || '0x34f1b450e7815b8b95df68cb6bfd81bbaf42607acf1f345bcb4a2fc732ca648b',
  mockUsdcTreasuryCap: process.env.MOCK_USDC_TREASURY_CAP || '0x21aa4203c1f95e3e0584624b274f3e5c630578efaba76bb47d53d5d7421fde11',
  
  // Network-specific configuration
  network: networkConfig,
  paymentCoinType: networkConfig.paymentCoin.type,
  gasCoinType: networkConfig.gasCoin.type,
  
  // Legacy config values for backwards compatibility (tests)
  faucetMinBalance: '1000000000', // 1 SUI
  faucetFundAmount: '5000000000', // 5 SUI
} as const;

// SUI constants
export const CLOCK_OBJECT_ID = '0x0000000000000000000000000000000000000000000000000000000000000006';

// Export for backwards compatibility
export const DEFAULT_PAYMENT_COIN_TYPE = networkConfig.paymentCoin.type;
export const COIN_TYPES = {
  SUI: networkConfig.gasCoin.type,
  USDC: networkConfig.paymentCoin.type,
} as const;
