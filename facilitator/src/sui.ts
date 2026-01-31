import { SuiGrpcClient } from '@mysten/sui/grpc';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { config } from './config.js';

let client: SuiGrpcClient | null = null;
let keypair: Ed25519Keypair | null = null;

// Network URL mapping
const NETWORK_URLS = {
  mainnet: 'https://fullnode.mainnet.sui.io:443',
  testnet: 'https://fullnode.testnet.sui.io:443',
  devnet: 'https://fullnode.devnet.sui.io:443',
  localnet: 'http://127.0.0.1:9000',
} as const;

/**
 * Initialize SUI client (singleton)
 */
export function getSuiClient(): SuiGrpcClient {
  if (!client) {
    const network = config.suiNetwork as keyof typeof NETWORK_URLS;
    client = new SuiGrpcClient({
      network: network === 'localnet' ? 'testnet' : network, // localnet uses testnet network config
      baseUrl: NETWORK_URLS[network],
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
    
    // Parse private key (format: "suiprivkey..." base64)
    keypair = Ed25519Keypair.fromSecretKey(
      Buffer.from(config.facilitatorPrivateKey, 'base64')
    );
  }
  return keypair;
}

/**
 * Get facilitator address
 */
export function getFacilitatorAddress(): string {
  return getFacilitatorKeypair().getPublicKey().toSuiAddress();
}
