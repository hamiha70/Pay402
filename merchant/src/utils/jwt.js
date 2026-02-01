/**
 * JWT utilities for invoice signing
 * Using EdDSA (Ed25519) - same as SUI uses
 */

import { SignJWT, jwtVerify, importPKCS8, importSPKI } from 'jose';
import { decodeSuiPrivateKey } from '@mysten/sui/cryptography';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { config } from '../config.js';

/**
 * Generate signed invoice JWT
 * 
 * @param {object} invoice - Invoice data
 * @returns {string} Signed JWT
 */
export async function generateInvoiceJWT(invoice) {
  if (!config.merchantPrivateKey) {
    throw new Error('MERCHANT_PRIVATE_KEY not configured');
  }

  // Parse Bech32 format (suiprivkey1...) - returns 32-byte seed
  const { secretKey } = decodeSuiPrivateKey(config.merchantPrivateKey);

  // Create PEM format for Ed25519
  const pemKey = createEd25519PEM(secretKey);

  // Import key for jose
  const privateKey = await importPKCS8(pemKey, 'EdDSA');

  // Sign JWT with EdDSA
  const token = await new SignJWT({
    iss: config.merchantAddress,   // Issuer (merchant)
    sub: invoice.resource,          // Subject (resource)
    aud: 'pay402',                  // Audience
    iat: Math.floor(Date.now() / 1000), // Issued at
    exp: invoice.expiry,            // Expiry
    ...invoice,                     // Invoice data
  })
    .setProtectedHeader({ alg: 'EdDSA' })
    .sign(privateKey);

  return token;
}

/**
 * Verify invoice JWT signature
 * 
 * @param {string} token - JWT to verify
 * @returns {object} Decoded invoice
 */
export async function verifyInvoiceJWT(token) {
  if (!config.merchantPrivateKey) {
    throw new Error('MERCHANT_PRIVATE_KEY not configured');
  }

  // Parse Bech32 format
  const { secretKey } = decodeSuiPrivateKey(config.merchantPrivateKey);

  // Create keypair to get public key
  const keypair = Ed25519Keypair.fromSecretKey(secretKey);
  const publicKeyBytes = keypair.getPublicKey().toRawBytes();
  
  // Create PEM public key
  const pemPublicKey = createEd25519PublicPEM(publicKeyBytes);

  // Import public key
  const publicKey = await importSPKI(pemPublicKey, 'EdDSA');

  // Verify JWT
  const { payload } = await jwtVerify(token, publicKey, {
    audience: 'pay402',
  });

  return payload;
}

/**
 * Create Ed25519 private key in PEM format
 * 
 * @param {Uint8Array} secretKey - 64-byte Ed25519 keypair (seed + public) OR 32-byte seed
 * @returns {string} PEM formatted key
 */
function createEd25519PEM(secretKey) {
  // Ed25519 private key DER structure (PKCS#8):
  // Extract just the 32-byte seed (first 32 bytes if 64-byte input)
  const seed = secretKey.length === 64 ? secretKey.slice(0, 32) : secretKey;
  
  if (seed.length !== 32) {
    throw new Error(`Invalid seed length: ${seed.length}. Expected 32 bytes.`);
  }

  // Build DER structure
  const der = Buffer.concat([
    Buffer.from([0x30, 0x2e]),                      // SEQUENCE (46 bytes)
    Buffer.from([0x02, 0x01, 0x00]),                // INTEGER version = 0
    Buffer.from([0x30, 0x05]),                      // SEQUENCE algorithm
    Buffer.from([0x06, 0x03, 0x2b, 0x65, 0x70]),    // OID = Ed25519
    Buffer.from([0x04, 0x22]),                      // OCTET STRING (34 bytes)
    Buffer.from([0x04, 0x20]),                      // OCTET STRING (32 bytes)
    Buffer.from(seed),                              // 32-byte seed
  ]);

  const pem = [
    '-----BEGIN PRIVATE KEY-----',
    der.toString('base64').match(/.{1,64}/g).join('\n'),
    '-----END PRIVATE KEY-----',
  ].join('\n');

  return pem;
}

/**
 * Create Ed25519 public key in PEM format
 * 
 * @param {Uint8Array} publicKey - 32-byte Ed25519 public key
 * @returns {string} PEM formatted key
 */
function createEd25519PublicPEM(publicKey) {
  // Ed25519 public key DER structure (X.509 SubjectPublicKeyInfo):
  // 0x30 0x2a (SEQUENCE, 42 bytes)
  //   0x30 0x05 (SEQUENCE algorithm)
  //     0x06 0x03 0x2b 0x65 0x70 (OID = Ed25519)
  //   0x03 0x21 0x00 (BIT STRING, 33 bytes, 0 unused bits)
  //     <32 bytes of public key>

  const der = Buffer.concat([
    Buffer.from([0x30, 0x2a]),                      // SEQUENCE (42 bytes)
    Buffer.from([0x30, 0x05]),                      // SEQUENCE algorithm
    Buffer.from([0x06, 0x03, 0x2b, 0x65, 0x70]),    // OID = Ed25519
    Buffer.from([0x03, 0x21, 0x00]),                // BIT STRING (33 bytes, 0 unused)
    Buffer.from(publicKey),                         // 32-byte public key
  ]);

  const pem = [
    '-----BEGIN PUBLIC KEY-----',
    der.toString('base64').match(/.{1,64}/g).join('\n'),
    '-----END PUBLIC KEY-----',
  ].join('\n');

  return pem;
}
