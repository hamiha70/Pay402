/**
 * Generate merchant keypair for JWT signing
 * Run: node setup-keys.js
 */

import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';

console.log('🔑 Generating Merchant Keypair for JWT Signing\n');

const keypair = Ed25519Keypair.generate();

// Get keys
const secretKey = keypair.getSecretKey();
const publicKey = keypair.getPublicKey();
const address = publicKey.toSuiAddress();

// Export as Bech32 (suiprivkey1...)
const privateKeyBech32 = keypair.getSecretKey();

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('MERCHANT KEYS GENERATED');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

console.log('Merchant SUI Address:');
console.log(address);
console.log('\nPrivate Key (Bech32 format - KEEP SECRET!):');
console.log(keypair.getSecretKey());

console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('Add to your .env file:');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

console.log(`MERCHANT_ADDRESS=${address}`);
console.log(`MERCHANT_PRIVATE_KEY=${keypair.getSecretKey()}`);

console.log('\n⚠️  IMPORTANT:');
console.log('- Never commit .env to git');
console.log('- Store private key securely');
console.log('- This address will receive payments');
