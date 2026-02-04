import { SuiGrpcClient } from '@mysten/sui/grpc';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { config } from './config.js';

let client: SuiGrpcClient | null = null;
let keypair: Ed25519Keypair | null = null;

/**
 * Initialize SUI client (singleton)
 * Uses network configuration from config/networks.ts
 */
export function getSuiClient(): SuiGrpcClient {
  if (!client) {
    const network = config.suiNetwork as 'mainnet' | 'testnet' | 'devnet' | 'localnet';
    client = new SuiGrpcClient({
      network: network === 'localnet' ? 'testnet' : network,
      baseUrl: config.suiRpcUrl,
    });
  }
  return client;
}

/**
 * Initialize facilitator keypair from private key
 */
export function getFacilitatorKeypair(): Ed25519Keypair {
  if (!keypair) {
    if (!config.facilitatorPrivateKey) {
      throw new Error('FACILITATOR_PRIVATE_KEY not set in environment');
    }
    
    // Parse private key - supports both suiprivkey format and raw base64
    if (config.facilitatorPrivateKey.startsWith('suiprivkey')) {
      // Use fromSecretKey for suiprivkey format (Bech32 encoded)
      keypair = Ed25519Keypair.fromSecretKey(config.facilitatorPrivateKey);
    } else {
      // Legacy: raw base64 format
      keypair = Ed25519Keypair.fromSecretKey(
        Buffer.from(config.facilitatorPrivateKey, 'base64')
      );
    }
  }
  return keypair;
}

/**
 * Get facilitator address
 */
export function getFacilitatorAddress(): string {
  return getFacilitatorKeypair().getPublicKey().toSuiAddress();
}
