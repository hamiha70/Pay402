import dotenv from 'dotenv';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';

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

export const config = {
  port: parseInt(process.env.PORT || '3001', 10),
  suiNetwork: process.env.SUI_NETWORK || 'testnet',
  packageId: process.env.PACKAGE_ID || '',
  facilitatorPrivateKey: process.env.FACILITATOR_PRIVATE_KEY || '',
  facilitatorAddress: getFacilitatorAddress(),
  facilitatorFee: process.env.FACILITATOR_FEE || '10000', // 0.01 USDC (6 decimals)
} as const;

// SUI constants
export const CLOCK_OBJECT_ID = '0x0000000000000000000000000000000000000000000000000000000000000006';

// Coin type constants (testnet)
// CRITICAL: SUI is ONLY for gas, never for payments on testnet!
export const COIN_TYPES = {
  SUI: '0x2::sui::SUI',  // ⚠️ GAS ONLY - Do not use for payments on testnet
  USDC: '0xa1ec7fc00a6f40db9693ad1415d0c193ad3906494428cf252621037bd7117e29::usdc::USDC',  // ✅ DEFAULT for payments
} as const;

// Default coin type for payments (USDC on testnet)
export const DEFAULT_PAYMENT_COIN_TYPE = COIN_TYPES.USDC;
